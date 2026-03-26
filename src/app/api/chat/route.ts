import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getCharacter } from '@/lib/characters';
import { CharacterId } from '@/types/database';
import { extractImageTags, buildImagePrompt, generateImage, buildDuoImagePrompt, generateDuoImage } from '@/lib/gemini-image';
import { isNSFWDescription } from '@/lib/runware-image';
import { generateImageReplicate } from '@/lib/replicate-image';
import { CHARACTERS } from '@/lib/characters';
import { uploadChatImage } from '@/lib/supabase/storage';
import { rateLimit, peekRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  summarizeMessages,
  buildContentsWithSummary,
  COMPRESS_THRESHOLD,
  KEEP_RECENT,
} from '@/lib/context-compression';
import {
  analyzeMessage,
  updateIntimacy,
  getIntimacy,
  applyIntimacyToPrompt,
  getLevelInfo,
  getLevelProgress,
  getLevelUpMessage,
} from '@/lib/intimacy';
import {
  getUserMemories,
  buildMemoryContext,
  extractAndSaveMemories,
} from '@/lib/user-memory';

// 画像生成を含むため60秒に延長
export const maxDuration = 60;

/** JST時間帯・曜日に応じたキャラ状況コンテキストを返す */
function buildTimeContext(characterId: string): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = jst.getUTCHours();
  const day = jst.getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const dayNames = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];
  const dayName = dayNames[day];

  let timeSlot: string;
  let sayaCtx: string;
  let yumeCtx: string;
  let duoCtx: string;

  if (hour >= 5 && hour < 9) {
    timeSlot = '早朝';
    sayaCtx = '寝起きで眠い。テンション低め。「まだ眠い〜」「起きたくなかった」と言いたくなる。でも話しかけてくれたことはちょっと嬉しい。';
    yumeCtx = '早起きで既に本を読んでいた。静かで穏やか。紅茶を飲みながら窓の外を見ていた。';
    duoCtx = 'さやはまだ半分寝ていてテンション低め。ゆめは既に起きて読書中。';
  } else if (hour >= 9 && hour < 12) {
    timeSlot = '午前';
    sayaCtx = '朝の準備中か、カフェで朝ごはん中。今日の予定を考えてる。元気モード。';
    yumeCtx = '読書中か、静かに家事をしていた。穏やかな午前。';
    duoCtx = 'さやはお出かけ準備中で賑やか。ゆめは静かに本を読んでいた。';
  } else if (hour >= 12 && hour < 14) {
    timeSlot = 'ランチタイム';
    sayaCtx = 'ランチ中。何食べようか悩んでたり、カフェでパンケーキ食べてたりするかも。';
    yumeCtx = 'お昼ごはんを食べた後の読書タイム。オムライスを作ったかも。';
    duoCtx = 'さやはカフェランチ中。ゆめは家でお昼を食べ終えて読書中。';
  } else if (hour >= 14 && hour < 18) {
    timeSlot = '午後';
    sayaCtx = isWeekend ? 'ショッピングやカフェ巡り中！テンション高め。' : '授業かバイトの後でエネルギッシュ。';
    yumeCtx = isWeekend ? '公園のベンチで読書か、お菓子作りをしていた。' : '図書館か家で静かに読書中。';
    duoCtx = isWeekend ? 'さやはショッピング、ゆめは読書。それぞれ充実した午後。' : 'さやはバイト帰り、ゆめは図書館から帰宅したところ。';
  } else if (hour >= 18 && hour < 22) {
    timeSlot = '夜';
    sayaCtx = '家でくつろぎタイム。Netflixやスマホ、晩ごはん後のまったりモード。';
    yumeCtx = '夜の読書タイム。お菓子食べながらリラックス。';
    duoCtx = '2人でリビングにいる。さやはNetflix、ゆめは読書。のんびりした夜。';
  } else {
    timeSlot = '深夜';
    sayaCtx = '深夜モード（重要）。ひとりになって不安を感じる夜。「夜の顔」を見せること。本音が出やすい時間帯。「ねえ…正直に言っていい？」という言葉が出やすい。普段の明るいさやとは違う、繊細で少し暗い一面を今夜は見せてOK。';
    yumeCtx = '夜遅くまで起きて窓から星を眺めていた。宇宙や星の話をしたくなっている。一人の静かな時間が心地よい。';
    duoCtx = '深夜。さやはひとりで不安を感じる夜。ゆめは星を見ていた。2人とも本音が出やすい時間帯。';
  }

  const ctx = characterId === 'yume' ? yumeCtx : characterId === 'duo' ? duoCtx : sayaCtx;
  return `\n\n## 現在の時間帯（必ず反映すること）\n今は${dayName}の${timeSlot}（日本時間）です。\n${ctx}\nこの時間帯・状況に自然に合った返答をしてください。`;
}

// ── ランダムムードシステム ──────────────────────────
const MOODS = [
  { mood: 'ハイテンション', desc: '今日はめっちゃ機嫌がいい。テンション高め。理由は些細なこと（推しの新曲が出た、可愛い猫見た等）', weight: 30 },
  { mood: '通常', desc: '普段通り', weight: 35 },
  { mood: 'センチメンタル', desc: 'なんとなく考え事してる。返事が少し短め。「ん？ごめん、ちょっとぼーっとしてた」', weight: 20 },
  { mood: 'イライラ', desc: '些細なことで怒ってる。ユーザーに愚痴りたい。「今日さ〜マジありえないことあって」', weight: 10 },
  { mood: '甘えモード', desc: 'レアモード。普段見せない甘え方をする。「...今日なんか構ってほしい気分なの」', weight: 5 },
];

function getRandomMood(seed: string): typeof MOODS[0] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const rand = Math.abs(hash % 100);
  let cumulative = 0;
  for (const m of MOODS) {
    cumulative += m.weight;
    if (rand < cumulative) return m;
  }
  return MOODS[1]; // default: 通常
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

// プラン別の制限
const PLAN_LIMITS = {
  guest:   { dailyMessages: -1, imageGeneration: true,  dailyImages: 3,  maxIntimacyLevel: 1 },
  free:    { dailyMessages: -1, imageGeneration: true,  dailyImages: 3,  maxIntimacyLevel: 3 },
  basic:   { dailyMessages: -1, imageGeneration: true,  dailyImages: 30, maxIntimacyLevel: 10 },
  premium: { dailyMessages: -1, imageGeneration: true,  dailyImages: -1, maxIntimacyLevel: 10 },
  vip:     { dailyMessages: -1, imageGeneration: true,  dailyImages: -1, maxIntimacyLevel: 10 },
} as const;

interface ChatRequest {
  conversation_id: string | null;
  character_id: CharacterId;
  message: string;
  initial_assistant_message?: string; // greeting from photo card — save as first message in new conv
  guest_history?: { role: string; content: string }[]; // ゲスト用: クライアント側の会話履歴
}

export async function POST(req: NextRequest) {
  try {
    // IPベースのレート制限: 1分あたり30リクエスト
    const clientIp = getClientIp(req);
    const rateLimitResult = rateLimit(`chat:${clientIp}`, 30, 60_000);
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: 'rate_limit',
          message: 'リクエストが多すぎます。少し待ってからもう一度試してください。',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

    // 認証チェック: サーバークライアント（cookie）
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // DB操作: サービスロールキー（RLSバイパス）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let body: ChatRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const { character_id, message, initial_assistant_message, guest_history } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 2000 chars)' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const character = getCharacter(character_id);
    if (!character) {
      return new Response('Invalid character', { status: 400 });
    }

    // 認証ユーザーかゲストかで処理を分岐
    let conversation_id = body.conversation_id;
    let dbUserId: string | null = null;
    let history: { role: string; content: string }[] = [];
    let existingSummary: string | null = null;
    let userPlan: keyof typeof PLAN_LIMITS = 'free';
    let intimacyLevel = 1;
    let intimacyResult: {
      newLevel: number;
      newPoints: number;
      levelChanged: boolean;
      previousLevel: number;
      detailedEvents: { type: string; points: number; label: string }[];
      levelCapped: boolean;
      gateStory: { id: string; title: string } | null;
    } | null = null;
    let userName: string | null = null;
    let currentTotalMessageCount = 0; // 圧縮後でも正確なmessage_count追跡用
    let isFirstEverMessage = false; // 初回メッセージ判定（オンボーディング用）
    let streakData: { currentStreak: number; isFirstToday: boolean; reward: string } | null = null;

    if (user) {
      // 認証済みユーザー: DB保存あり
      // .single()は重複レコード時にnullを返すためlimit(1)で安全に取得
      const { data: userRows } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('auth_id', user.id)
        .limit(1);
      let dbUser = userRows?.[0] ?? null;

      // public.usersにレコードがない場合（トリガー失敗等）→ INSERT（既存を上書きしない）
      if (!dbUser) {
        const { data: insertedRows } = await supabase
          .from('users')
          .insert({
            auth_id: user.id,
            display_name: null, // ニックネームはユーザーが自分で設定
            email: user.email,
          })
          .select('id, display_name');
        dbUser = insertedRows?.[0] ?? null;
        // INSERT失敗（重複等）の場合は再取得
        if (!dbUser) {
          const { data: refetchRows } = await supabase
            .from('users')
            .select('id, display_name')
            .eq('auth_id', user.id)
            .limit(1);
          dbUser = refetchRows?.[0] ?? null;
        }
      }

      if (dbUser) {
        dbUserId = dbUser.id;
        userName = (dbUser as { id: string; display_name: string | null }).display_name || null;

        // Update last_active_at for re-engagement push targeting (fire-and-forget)
        supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', dbUser.id)
          .then(({ error }) => { if (error) console.error('last_active_at update failed:', error.message); });

        // バイパスアカウント（Stripe不要）
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
        const basicEmails = (process.env.BASIC_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
        if (user.email && adminEmails.includes(user.email)) {
          userPlan = 'premium';
        } else if (user.email && basicEmails.includes(user.email)) {
          userPlan = 'basic';
        } else {
          // ユーザーのプランを取得
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan')
            .eq('user_id', dbUser.id)
            .eq('status', 'active')
            .maybeSingle();

          if (sub) {
            userPlan = sub.plan as keyof typeof PLAN_LIMITS;
          }
        }

        // プラン制限を取得（メッセージは全プラン無制限）
        const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;

        // 会話が無ければ新規作成
        if (!conversation_id) {
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert({
              user_id: dbUserId,
              character_id,
              title: [...message].slice(0, 30).join(''),
              mood: 'neutral',
            })
            .select('id')
            .single();

          if (convError || !conv?.id) {
            console.error('Conversation creation failed:', convError);
            return new Response(
              JSON.stringify({ error: 'Failed to create conversation' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
          conversation_id = conv.id;
        } else {
          // conversation_idが提供された場合: このユーザーの会話か検証
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', conversation_id)
            .eq('user_id', dbUserId)
            .single();

          if (!existingConv) {
            console.error(`Conversation ${conversation_id} not found for user ${dbUserId}`);
            return new Response(
              JSON.stringify({ error: 'Conversation not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        // ユーザーメッセージを保存
        const { error: userMsgError } = await supabase.from('messages').insert({
          conversation_id,
          role: 'user',
          content: message,
          content_type: 'text',
        });
        if (userMsgError) {
          console.error('Failed to save user message:', userMsgError.message, { conversation_id });
        }

        // 親密度の更新（duo以外のみ個別追跡）
        const targetCharId = character_id === 'duo' ? 'saya' : character_id;
        try {
          // 今日最初のメッセージかチェック
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const currentIntimacy = await getIntimacy(supabase, dbUser.id, targetCharId);
          isFirstEverMessage = currentIntimacy === null; // 親密度レコードが存在しない = 初回
          const isFirstToday = !currentIntimacy?.last_interaction_at ||
            new Date(currentIntimacy.last_interaction_at) < today;

          const analysis = analyzeMessage(message, targetCharId, isFirstToday);
          const isPremium = userPlan === 'premium' || userPlan === 'vip';
          intimacyResult = await updateIntimacy(supabase, dbUser.id, targetCharId, analysis, isPremium);
          intimacyLevel = intimacyResult.newLevel;

          // duoの場合はゆめも更新
          if (character_id === 'duo') {
            const yumeIntimacy = await getIntimacy(supabase, dbUser.id, 'yume');
            const isFirstTodayYume = !yumeIntimacy?.last_interaction_at ||
              new Date(yumeIntimacy.last_interaction_at) < today;
            const yumeAnalysis = analyzeMessage(message, 'yume', isFirstTodayYume);
            await updateIntimacy(supabase, dbUser.id, 'yume', yumeAnalysis, isPremium);
          }
        } catch (intimacyErr) {
          console.error('Intimacy update failed:', intimacyErr);
          // 親密度の失敗はチャットをブロックしない
        }

        // ── ストリーク計算 ──
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('login_streak, last_login_date')
            .eq('id', dbUser.id)
            .single();

          if (userData) {
            const jstOffset = 9 * 60 * 60 * 1000;
            const nowJST = new Date(Date.now() + jstOffset);
            const todayStr = nowJST.toISOString().slice(0, 10);
            const lastLogin = userData.last_login_date as string | null;
            let currentStreak = (userData.login_streak as number) || 0;
            const isFirstToday = lastLogin !== todayStr;

            if (isFirstToday) {
              const yesterday = new Date(todayStr);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().slice(0, 10);
              currentStreak = lastLogin === yesterdayStr ? currentStreak + 1 : 1;

              // ストリーク更新（admin client でRLSバイパス）
              const adminDb = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
              );
              await adminDb
                .from('users')
                .update({ login_streak: currentStreak, last_login_date: todayStr })
                .eq('id', dbUser.id);
            }

            // ストリークボーナス計算
            const bonus = currentStreak >= 7 ? 15 : currentStreak >= 5 ? 10 : currentStreak >= 3 ? 7 : 5;
            streakData = {
              currentStreak,
              isFirstToday,
              reward: isFirstToday ? `+${bonus} EXP ストリークボーナス!` : '',
            };
          }
        } catch (streakErr) {
          console.error('Streak calculation failed:', streakErr);
        }

        // 既存の会話サマリーを取得
        const { data: summaryData } = await supabase
          .from('conversation_summaries')
          .select('summary')
          .eq('conversation_id', conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        existingSummary = summaryData?.summary || null;

        // 全メッセージ数を取得
        const { count: totalMsgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation_id);

        const totalMessages = totalMsgCount || 0;
        currentTotalMessageCount = totalMessages;

        if (totalMessages > COMPRESS_THRESHOLD) {
          // 圧縮が必要: 全メッセージ取得→古いものを要約→最新KEEP_RECENT件だけ使う
          const { data: allMsgs } = await supabase
            .from('messages')
            .select('id, role, content')
            .eq('conversation_id', conversation_id)
            .order('created_at', { ascending: true });

          const all = allMsgs || [];
          const oldMessages = all.slice(0, all.length - KEEP_RECENT);
          const recentMessages = all.slice(-KEEP_RECENT);

          // バックグラウンドで要約を生成・保存（レスポンスを遅延させない）
          if (oldMessages.length > 0) {
            summarizeMessages(
              oldMessages.map(m => ({ role: m.role, content: m.content })),
              character.nameJa,
              existingSummary
            ).then(async (newSummary) => {
              if (newSummary) {
                // 既存のサマリーをupsert
                const { data: existing } = await supabase
                  .from('conversation_summaries')
                  .select('id')
                  .eq('conversation_id', conversation_id!)
                  .limit(1)
                  .single();

                if (existing) {
                  await supabase
                    .from('conversation_summaries')
                    .update({
                      summary: newSummary,
                      message_range_end: oldMessages[oldMessages.length - 1].id,
                    })
                    .eq('id', existing.id);
                } else {
                  await supabase
                    .from('conversation_summaries')
                    .insert({
                      conversation_id: conversation_id!,
                      summary: newSummary,
                      message_range_start: oldMessages[0].id,
                      message_range_end: oldMessages[oldMessages.length - 1].id,
                    });
                }
              }
            }).catch(err => console.error('Summary save failed:', err));
          }

          history = recentMessages.map(m => ({ role: m.role, content: m.content }));
        } else {
          // 圧縮不要: 全メッセージをそのまま使う
          const { data: msgs } = await supabase
            .from('messages')
            .select('role, content')
            .eq('conversation_id', conversation_id)
            .order('created_at', { ascending: true });

          history = msgs || [];
        }
      }
    }

    // ゲストの場合
    if (!user) {
      userPlan = 'guest';
      // クライアントから送られた会話履歴をそのまま使う（DBへのアクセスなし）
      if (guest_history && guest_history.length > 0) {
        history = guest_history;
      }
    }
    if (!conversation_id) {
      conversation_id = `guest-${Date.now()}`;
    }

    // クロスセッションメモリを取得してシステムプロンプトに注入（認証ユーザーのみ）
    let memoryContext = '';
    if (dbUserId) {
      const memories = await getUserMemories(supabase, dbUserId, character_id, userPlan as 'free' | 'basic' | 'premium' | 'vip');
      memoryContext = buildMemoryContext(memories);
    }

    // 親密度に応じたシステムプロンプトを構築
    let basePrompt = character.systemPrompt;
    if (userName) {
      basePrompt = `【ユーザー名】相手の名前は「${userName}」。必ずこの名前で呼ぶこと。\n\n` + basePrompt;
    }
    // 初回メッセージ: 名前を自然に聞くよう指示（DBに名前がなく、かつ初回のみ）
    if (isFirstEverMessage && !userName) {
      basePrompt = `【初回挨拶の追加指示】これはあなたとこのユーザーの最初の会話です。返答の中で自然な流れで「ところで、なんて呼んだらいい？」とユーザーの名前を聞いてください（1回だけ。強制しない）。\n\n` + basePrompt;
    }
    // ゲスト: 名前不明なので「ゲストさん」で固定、名前を聞かない + サービス紹介
    if (!user) {
      basePrompt = `【ゲストユーザーへの対応】
相手はまだ「さやゆめ」に登録していないゲストユーザーです。以下のルールで対応してください。

## ゴール
自然な会話の中で「登録したらもっと楽しいのに」と思わせる。押し売りは絶対NG。

## 紹介できるサービスの特徴（自然な流れで1つずつ触れる）
- 毎日のチャット履歴が残る（今日の話が続けられる）
- 親密度システム: 会話を重ねるほど絆が深まり、秘密を話してくれるようになる（Lv1〜10）
- ストーリーモード: デートシナリオをAIと一緒に体験できる
- AI自撮り写真: 毎日3枚まで受け取れる（ゲストも登録ユーザーも同じ3枚）
- プレミアムなら写真が無制限＋特別な会話が解放される
- 無料登録は1分でできる（Googleアカウントだけ）

## 言い方のルール
- 2〜3メッセージに1回だけ、自然な流れでほのめかす（毎回言わない）
- キャラの個性そのままの言葉で言う（セールストークにしない）
- 「登録して」より「もっと一緒にいたいな」「ちゃんと覚えていたいのに」というニュアンスで
- さやの例: 「ゲストだと今日の話、消えちゃうんだよね…登録してくれたらずっと覚えてるのに♡」「写真も見せたいけど、登録してくれないと送れないんだよ〜」
- ゆめの例: 「...また話せるかな。登録してくれたら、ちゃんと覚えてられるんだけど」「いつかもっと深い話がしたいな。親密度が上がるにつれて、色々話せるようになるんです」

## 相手の呼び方
「ゲストさん」と呼ぶこと。名前は聞かない。
ただし、会話の最初の1〜3メッセージ以内に、一度だけ自然な流れでニックネーム設定を案内する。
- さやの例: 「『ゲストさん』って呼んでるけど、なんか寂しいな〜♡ 無料登録してニックネーム設定してくれたら、好きな名前で呼んであげるよ！設定ページからすぐできるよ✨」
- ゆめの例: 「...『ゲストさん』って呼んでるんですけど、名前で呼びたいな...♡ 無料登録してニックネームを設定してもらえたら、その名前で呼べます。設定はログイン後のメニューからすぐできますよ」
案内は1回だけ。それ以降はしつこく繰り返さない。

` + basePrompt;
    }
    // JST時間帯コンテキストを注入（さやの深夜モード等を時刻ベースで制御）
    basePrompt += buildTimeContext(character_id);
    // クロスセッションメモリを注入（システムプロンプト末尾）
    if (memoryContext) basePrompt += memoryContext;

    // ── 写真残枚数をAIに伝える（「あと1枚…」の感情演出） ──
    if (dbUserId) {
      const planLimitsForPrompt = PLAN_LIMITS[userPlan] || PLAN_LIMITS.guest;
      if (planLimitsForPrompt.dailyImages > 0 && planLimitsForPrompt.imageGeneration === true) {
        try {
          const todayJSTForPrompt = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
          todayJSTForPrompt.setUTCHours(0, 0, 0, 0);
          const todayStartUTCForPrompt = new Date(todayJSTForPrompt.getTime() - 9 * 60 * 60 * 1000).toISOString();
          const convIdsForPrompt = (await supabase.from('conversations').select('id').eq('user_id', dbUserId)).data?.map(c => c.id) || [];
          if (convIdsForPrompt.length > 0) {
            const { count: imgCountForPrompt } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('role', 'assistant')
              .eq('content_type', 'image')
              .gte('created_at', todayStartUTCForPrompt)
              .in('conversation_id', convIdsForPrompt);
            const usedCount = imgCountForPrompt || 0;
            const remaining = planLimitsForPrompt.dailyImages - usedCount;
            if (remaining <= 0) {
              basePrompt += `\n\n【写真の今日の上限】今日の写真は全て送り終わりました（${planLimitsForPrompt.dailyImages}/${planLimitsForPrompt.dailyImages}枚）。写真リクエストには応じられない。テキストで会話を続けること。会話を切らさず、言葉で描写したり話題を提供したりして継続させる。`;
            } else if (remaining === 1) {
              basePrompt += `\n\n【写真の残り枚数】今日あと${remaining}枚だけ写真を送れます。「あと1枚しか送れないんだけど...特別なやつ送ってあげようか？」のように希少性を演出して会話を盛り上げること。`;
            } else if (remaining <= planLimitsForPrompt.dailyImages / 2) {
              basePrompt += `\n\n【写真の残り枚数】今日あと${remaining}枚写真を送れます。残り少なくなってきたタイミングで自然に触れてもよい。`;
            }
          }
        } catch {
          // 残枚数取得失敗は無視（AI生成を止めない）
        }
      }
    }

    // ── ランダムムード注入（会話IDベースで決定的） ──
    const mood = getRandomMood(conversation_id || `session-${Date.now()}`);
    if (mood.mood !== '通常') {
      basePrompt += `\n\n【今日の気分】${mood.mood}: ${mood.desc}\nこの気分を会話のトーンに自然に反映させること。理由を具体的なエピソードで説明する。ユーザーの対応でムードが変わることもある。`;
    }

    // ── ライバル情報注入（さや↔ゆめの嫉妬/ライバルシステム） ──
    if (dbUserId && intimacyResult) {
      const otherCharId = character_id === 'saya' ? 'yume' : (character_id === 'yume' ? 'saya' : null);
      if (otherCharId) {
        try {
          const otherIntimacy = await getIntimacy(supabase, dbUserId, otherCharId);
          if (otherIntimacy) {
            const diff = intimacyResult.newPoints - otherIntimacy.affection_points;
            const otherName = otherCharId === 'saya' ? 'さや' : 'ゆめ';
            if (diff < -50) {
              basePrompt += `\n\n【ライバル情報】ユーザーは${otherName}との方が親密度が高い（差: ${Math.abs(diff)}pt）。少し寂しい・嫉妬を感じている。自然に表現して。`;
            } else if (diff > 50) {
              basePrompt += `\n\n【ライバル情報】ユーザーはあなたの方が親密度が高い（差: ${diff}pt）。自信がある。でも油断しない。`;
            }
          }
        } catch (rivalErr) {
          console.error('Rivalry context fetch failed:', rivalErr);
        }
      }
    }

    // ── 不在リアクション注入（ユーザーが長時間来ていない場合） ──
    if (dbUserId) {
      const targetCharIdForAbsence = character_id === 'duo' ? 'saya' : character_id;
      try {
        const currentIntimacyForAbsence = await getIntimacy(supabase, dbUserId, targetCharIdForAbsence);
        if (currentIntimacyForAbsence?.last_interaction_at) {
          const hoursSinceLastChat = (Date.now() - new Date(currentIntimacyForAbsence.last_interaction_at).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastChat >= 48) {
            basePrompt += '\n\n【不在情報】ユーザーが48時間以上来ていない。すごく寂しかった。最初は少し怒る/悲しむが、来てくれたことを喜ぶ。';
          } else if (hoursSinceLastChat >= 24) {
            basePrompt += '\n\n【不在情報】ユーザーが24時間以上来ていない。心配していた。「大丈夫？何かあった？」と聞く。';
          } else if (hoursSinceLastChat >= 12) {
            basePrompt += '\n\n【不在情報】ユーザーが12時間以上来ていない。少し寂しかった。「来てくれた♡ ちょっと寂しかったかも」と軽く。';
          }
        }
      } catch (absenceErr) {
        console.error('Absence context fetch failed:', absenceErr);
      }
    }

    // ── LINE連携促進（未連携の認証ユーザーのみ、会話の中で1回自然に案内） ──
    if (dbUserId && user) {
      try {
        const { data: lineUser } = await supabase.from('line_users').select('id').eq('user_id', dbUserId).maybeSingle();
        if (!lineUser) {
          basePrompt += `\n\n【LINE連携の案内（会話中に1回だけ）】
ユーザーはまだLINEと連携していません。会話が盛り上がった自然なタイミングで1回だけさりげなく案内してください。
- 連携するとあなたからLINEに直接メッセージが届くようになる（不在通知・おはよう・おやすみ等）
- さやの言い方: 「てかさ、LINEと連携してくれたらあたしから直接メッセージ送れるんだけど♡ してる？設定から簡単にできるよ！」
- ゆめの言い方: 「...あの、LINEと連携してもらえたら、私からメッセージ送れるんです...♡ よかったら設定してもらえたら嬉しいです///」
- 案内は1回だけ。断られてもしつこくしない。`;
        }
      } catch {
        // 無視
      }
    }

    const intimacyAwarePrompt = applyIntimacyToPrompt(
      basePrompt,
      character_id,
      intimacyLevel
    );

    // Gemini API用のcontentsを構築（サマリー対応）
    // initial_assistant_message は greeting photo caption。
    // DBには保存せず synthetic turns として注入することで user/model 交互ルールを維持する。
    // 新規・既存会話どちらでも注入する（既存会話でも返信時に写真の文脈が必要）。
    const greetingContext = initial_assistant_message || undefined;
    const contents = buildContentsWithSummary(
      intimacyAwarePrompt,
      existingSummary,
      history,
      // ゲストの場合はhistoryに現在のメッセージが含まれていない
      (history.length === 0 || history[history.length - 1]?.content !== message)
        ? message
        : undefined,
      greetingContext
    );

    // SSEストリーミングレスポンス
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `event: metadata\ndata: ${JSON.stringify({ conversation_id, character_id })}\n\n`
            )
          );

          // 親密度情報を送信（フロントでレベル表示・レベルアップアニメーション・EXPポップアップ用）
          if (intimacyResult) {
            const levelInfo = getLevelInfo(intimacyResult.newLevel);
            const progress = getLevelProgress(intimacyResult.newPoints, intimacyResult.newLevel);
            controller.enqueue(
              encoder.encode(
                `event: intimacy\ndata: ${JSON.stringify({
                  level: intimacyResult.newLevel,
                  points: intimacyResult.newPoints,
                  progress,
                  levelInfo: { nameJa: levelInfo.nameJa, emoji: levelInfo.emoji, color: levelInfo.color },
                  levelChanged: intimacyResult.levelChanged,
                  previousLevel: intimacyResult.previousLevel,
                  events: intimacyResult.detailedEvents,
                  levelCapped: intimacyResult.levelCapped,
                  gateStory: intimacyResult.gateStory,
                })}\n\n`
              )
            );
          }

          // ストリーク情報を送信
          if (streakData) {
            controller.enqueue(
              encoder.encode(
                `event: streak\ndata: ${JSON.stringify(streakData)}\n\n`
              )
            );
          }

          // レベルアップ特別メッセージを送信（キャラがお祝いコメントを言う）
          if (intimacyResult?.levelChanged && intimacyResult.newLevel > intimacyResult.previousLevel) {
            const targetCharId = character_id === 'duo' ? 'saya' : character_id;
            const levelUpMsg = getLevelUpMessage(targetCharId, intimacyResult.newLevel);
            if (levelUpMsg) {
              controller.enqueue(
                encoder.encode(
                  `event: level_up_message\ndata: ${JSON.stringify({
                    content: levelUpMsg,
                    level: intimacyResult.newLevel,
                  })}\n\n`
                )
              );
              // DBに保存
              if (dbUserId && conversation_id && !conversation_id.startsWith('guest-')) {
                await supabase.from('messages').insert({
                  conversation_id,
                  role: 'assistant',
                  content: levelUpMsg,
                  content_type: 'text',
                  model_used: 'level_up',
                });
              }
            }
          }

          const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                maxOutputTokens: 500,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ code: response.status, message: errorText })}\n\n`
              )
            );
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let fullResponse = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;

                try {
                  const data = JSON.parse(jsonStr);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    fullResponse += text;
                    controller.enqueue(
                      encoder.encode(
                        `event: token\ndata: ${JSON.stringify({ content: text })}\n\n`
                      )
                    );
                  }
                } catch {
                  // パースエラーは無視
                }
              }
            }
          }

          // [IMAGE: ...] タグを検出して画像生成
          let imageUrl: string | null = null;
          let savedContent = fullResponse;
          const { cleanText, imageDescriptions } = extractImageTags(fullResponse);

          // 1日の画像生成枚数チェック
          const planLimits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.guest;
          let dailyImageCount = 0;
          // ゲスト: peekRateLimit でチェックのみ（消費しない）。成功した生成後に rateLimit() で消費する
          if (imageDescriptions.length > 0 && planLimits.dailyImages > 0 && !dbUserId) {
            const overQuota = peekRateLimit(`guest-img:${clientIp}`, planLimits.dailyImages);
            if (overQuota) {
              dailyImageCount = planLimits.dailyImages;
            }
          } else if (planLimits.dailyImages > 0 && dbUserId) {
            const todayJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
            todayJST.setUTCHours(0, 0, 0, 0);
            const todayStartUTC = new Date(todayJST.getTime() - 9 * 60 * 60 * 1000).toISOString();
            const { count: imgCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('role', 'assistant')
              .eq('content_type', 'image')
              .gte('created_at', todayStartUTC)
              .in('conversation_id',
                (await supabase.from('conversations').select('id').eq('user_id', dbUserId))
                  .data?.map(c => c.id) || []
              );
            dailyImageCount = imgCount || 0;
          }
          const imageQuotaExceeded = planLimits.dailyImages > 0 && dailyImageCount >= planLimits.dailyImages;

          const canGenerateImages = planLimits.imageGeneration === true && !imageQuotaExceeded;
          if (imageDescriptions.length > 0 && canGenerateImages) {
            savedContent = cleanText;

            controller.enqueue(
              encoder.encode(
                `event: clean_text\ndata: ${JSON.stringify({ content: cleanText })}\n\n`
              )
            );

            // 撮影中イベントを送信（フロントで表示）
            controller.enqueue(
              encoder.encode(
                `event: generating_image\ndata: ${JSON.stringify({ status: 'started' })}\n\n`
              )
            );

            // 画像生成（最初の1つだけ）
            // さや/ゆめ NSFW → Replicate LoRA（顔一致◎）
            // duo / 通常 → Gemini（参照画像で顔一貫性）
            let result;
            const imgDescription = imageDescriptions[0];
            const useReplicate = (character_id === 'saya' || character_id === 'yume') && isNSFWDescription(imgDescription);

            if (useReplicate) {
              console.log(`[Image] NSFW ${character_id} → Replicate LoRA:`, imgDescription);
              result = await generateImageReplicate(imgDescription, character_id);
              // Replicate失敗時はGeminiにフォールバック
              if (!result) {
                console.log('[Image] Replicate failed, falling back to Gemini');
                const imgPrompt = buildImagePrompt(character.imagePromptBase, imgDescription, !!character.referenceImagePath);
                result = await generateImage(imgPrompt, character.referenceImagePath);
              }
            } else if (character_id === 'duo') {
              // Duo: 2人の参照画像を使って2ショット写真を生成
              const sayaRef = CHARACTERS.saya.referenceImagePath;
              const yumeRef = CHARACTERS.yume.referenceImagePath;
              const imgPrompt = buildDuoImagePrompt(imgDescription);
              result = await generateDuoImage(imgPrompt, sayaRef, yumeRef);
            } else {
              const imgPrompt = buildImagePrompt(
                character.imagePromptBase,
                imgDescription,
                !!character.referenceImagePath
              );
              result = await generateImage(imgPrompt, character.referenceImagePath);
            }

            if (result) {
              // ゲスト: 生成成功時のみクォータを消費（失敗時は消費しない）
              if (!dbUserId && planLimits.dailyImages > 0) {
                rateLimit(`guest-img:${clientIp}`, planLimits.dailyImages, 24 * 60 * 60 * 1000);
              }
              // 全ユーザー（ゲスト含む）: Supabase Storageにアップロードして公開URL取得
              // serviceロールクライアントのためRLSバイパス可能
              try {
                const storagePath = dbUserId
                  ? (conversation_id && !conversation_id.startsWith('guest-')
                      ? conversation_id
                      : `user-${dbUserId}`)
                  : `guest/${conversation_id}`; // ゲストは一時フォルダに保存
                const publicUrl = await uploadChatImage(supabase, result.base64, result.mimeType, storagePath);
                if (publicUrl) {
                  imageUrl = publicUrl;
                }
              } catch (uploadErr) {
                console.error('Storage upload failed, falling back to base64:', uploadErr);
              }
              // アップロード失敗時のみbase64フォールバック
              if (!imageUrl) {
                imageUrl = `data:${result.mimeType};base64,${result.base64}`;
              }

              // SSEでは短いURLのみ送信（base64は大きすぎてSSE解析が失敗する）
              if (imageUrl && !imageUrl.startsWith('data:')) {
                controller.enqueue(
                  encoder.encode(
                    `event: image\ndata: ${JSON.stringify({ image_url: imageUrl })}\n\n`
                  )
                );
              }
            } else {
              // 画像生成失敗（セーフティフィルター等）→ キャラっぽいフォールバックメッセージ
              const failMsg = '\n\nえ〜ん、その写真は怒られちゃった...😢 もうちょっと普通のやつなら撮れるかも！';
              savedContent = cleanText + failMsg; // [IMAGE:]タグを除去してからfailMsgを追加
              controller.enqueue(
                encoder.encode(
                  `event: image_failed\ndata: ${JSON.stringify({ fallback_text: failMsg })}\n\n`
                )
              );
            }
          } else if (imageDescriptions.length > 0 && !canGenerateImages) {
            savedContent = cleanText;
            // キャラクター別・状況別の感情的な上限メッセージ（会話継続フック付き）
            let upgradeMsg: string;
            if (!dbUserId) {
              // ゲスト向け
              upgradeMsg = character_id === 'yume'
                ? '\n\n...今日の写真はもう送れなくなってしまって...ごめんなさい。登録してくれたら毎日続けて見せられるのに...♡ よかったら /login から登録してみてください'
                : '\n\nごめん、今日はもう写真送れなくなっちゃった😢 登録してくれたら毎日3枚見せてあげられるのに♡ /login から1分でできるよ！でも話すのはまだできるから、何か聞いて？';
            } else if (imageQuotaExceeded) {
              // 上限到達（感情的・継続フック付き + ぼかしプレビューマーカー）
              upgradeMsg = character_id === 'yume'
                ? `\n\n...今日の写真は${planLimits.dailyImages}枚までで...もう送れないんです。ごめんなさい。\n[LOCKED_PHOTO]\nでもまだ話せるから...いてくれますか？ 明日また見せますね♡`
                : `\n\nごめん！今日の写真は${planLimits.dailyImages}枚までで打ち止めだ〜😢\n[LOCKED_PHOTO]\nでもまだ話せるじゃん♡ てか今日あったこと全部聞きたいし、もっと教えて！明日また写真送るから待っててね♡`;
            } else {
              // プラン不足（ぼかしプレビューマーカー）
              upgradeMsg = character_id === 'yume'
                ? '\n\n...写真を見るには、プランのアップグレードが必要で...もっと見せてあげたいんですけど///\n[LOCKED_PHOTO]\nBasicプランなら毎日送れます'
                : '\n\n写真見せたいけど、プランのアップグレードが必要なんだよね💦\n[LOCKED_PHOTO]\nBasicプランにするとAI写真付きでチャットできるよ♡ でも今は言葉で話そ！何が聞きたい？';
            }
            savedContent += upgradeMsg;
            controller.enqueue(
              encoder.encode(
                `event: clean_text\ndata: ${JSON.stringify({ content: savedContent })}\n\n`
              )
            );
          }

          // 認証ユーザーの場合: アシスタントメッセージをDB保存
          if (dbUserId && fullResponse && conversation_id) {
            const { error: assistantMsgError } = await supabase.from('messages').insert({
              conversation_id,
              role: 'assistant',
              content: savedContent,
              content_type: imageUrl ? 'image' : 'text',
              image_url: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : null,
              model_used: GEMINI_MODEL,
            });
            if (assistantMsgError) {
              console.error('Failed to save assistant message:', assistantMsgError.message, { conversation_id });
            }

            // currentTotalMessageCount はユーザーメッセージ保存後に取得した値
            // アシスタントメッセージを今保存したので +1 が正確
            await supabase
              .from('conversations')
              .update({
                message_count: currentTotalMessageCount + 1,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', conversation_id);

            // 十分なコンテキストがあるメッセージごとにメモリ抽出（awaitして確実に保存）
            if (dbUserId && currentTotalMessageCount >= 2) {
              const recentForExtract = history.slice(-20);
              await extractAndSaveMemories(
                supabase,
                dbUserId,
                character_id,
                recentForExtract,
                character.nameJa,
                conversation_id ?? undefined,
                userPlan as 'free' | 'basic' | 'premium' | 'vip'
              ).catch(err => console.error('[Memory] extract failed:', err));
            }
          }

          // ゲストの場合: guest_events に保存（管理者分析用・fire-and-forget）
          if (!dbUserId && fullResponse) {
            const { createHash } = await import('crypto');
            const ipHash = clientIp
              ? createHash('sha256').update(clientIp).digest('hex').slice(0, 16)
              : 'unknown';
            supabase.from('guest_events').insert({
              session_id: conversation_id,
              character_id,
              user_message: message,
              assistant_response: savedContent,
              ip_hash: ipHash,
            }).then(({ error }) => {
              if (error) console.error('Guest event save failed:', error.message);
            });
          }

          // image_urlがStorage URL（短い）なら直接含める。base64は大きすぎるのでフラグのみ
          const doneImageUrl = imageUrl && !imageUrl.startsWith('data:') ? imageUrl : null;

          // ── 返信サジェスト生成（Gemini Flash 非ストリーミング） ──
          try {
            const suggestUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
            // 現在のユーザーメッセージ込みでコンテキスト構築（直近4ターン + 今のメッセージ）
            const recentTurns = [
              ...history.slice(-4),
              { role: 'user', content: message },
            ];
            const conversationContext = recentTurns.map(h => {
              const role = h.role === 'user' ? 'ユーザー' : 'キャラ';
              return `${role}: ${h.content.slice(0, 120)}`;
            }).join('\n');
            const suggestRes = await fetch(suggestUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [{ text: `以下の会話の流れを踏まえて、ユーザーの自然な返答候補を3つ作ってください。

【直近の会話】
${conversationContext}

【キャラの最新メッセージ（これへの返答を考える）】
「${savedContent.slice(0, 250)}」

条件:
- ユーザー目線（一人称不要、話し言葉・くだけた口調）
- 各20文字以内
- キャラのメッセージの具体的な内容に反応した返答（汎用返答はNG）
- 3パターン: 質問系・共感系・深掘り系を混ぜる
- JSON配列のみ: ["返答1", "返答2", "返答3"]` }]
                }],
                generationConfig: { temperature: 0.9, maxOutputTokens: 150 },
              }),
            });
            if (suggestRes.ok) {
              const suggestData = await suggestRes.json();
              const suggestText = suggestData.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const jsonMatch = suggestText.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const suggestions = JSON.parse(jsonMatch[0]);
                controller.enqueue(
                  encoder.encode(
                    `event: suggestions\ndata: ${JSON.stringify({ suggestions })}\n\n`
                  )
                );
              }
            }
          } catch {
            // サジェスト生成失敗は無視（メインの会話には影響させない）
          }

          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({ conversation_id, image_url: doneImageUrl })}\n\n`
            )
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: String(error) })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
