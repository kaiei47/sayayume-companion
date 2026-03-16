import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getCharacter } from '@/lib/characters';
import { CharacterId } from '@/types/database';
import { extractImageTags, buildImagePrompt, generateImage, buildDuoImagePrompt, generateDuoImage } from '@/lib/gemini-image';
import { CHARACTERS } from '@/lib/characters';
import { uploadChatImage } from '@/lib/supabase/storage';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

// プラン別の制限
const PLAN_LIMITS = {
  guest:   { dailyMessages: -1, imageGeneration: true,  dailyImages: 1,  maxIntimacyLevel: 1 },
  free:    { dailyMessages: -1, imageGeneration: true,  dailyImages: 3,  maxIntimacyLevel: 3 },
  basic:   { dailyMessages: -1, imageGeneration: true,  dailyImages: 30, maxIntimacyLevel: 5 },
  premium: { dailyMessages: -1, imageGeneration: true,  dailyImages: -1, maxIntimacyLevel: 5 },
  vip:     { dailyMessages: -1, imageGeneration: true,  dailyImages: -1, maxIntimacyLevel: 5 },
} as const;

interface ChatRequest {
  conversation_id: string | null;
  character_id: CharacterId;
  message: string;
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
    const { character_id, message } = body;

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
    let intimacyResult: { newLevel: number; newPoints: number; levelChanged: boolean; previousLevel: number } | null = null;
    let userName: string | null = null;
    let currentTotalMessageCount = 0; // 圧縮後でも正確なmessage_count追跡用
    let isFirstEverMessage = false; // 初回メッセージ判定（オンボーディング用）

    if (user) {
      // 認証済みユーザー: DB保存あり
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('auth_id', user.id)
        .single();

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
          const { data: conv } = await supabase
            .from('conversations')
            .insert({
              user_id: dbUserId,
              character_id,
              title: [...message].slice(0, 30).join(''),
              mood: 'neutral',
            })
            .select('id')
            .single();

          conversation_id = conv?.id || `guest-${Date.now()}`;
        }

        // ユーザーメッセージを保存
        await supabase.from('messages').insert({
          conversation_id,
          role: 'user',
          content: message,
          content_type: 'text',
        });

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
          intimacyResult = await updateIntimacy(supabase, dbUser.id, targetCharId, analysis);
          intimacyLevel = intimacyResult.newLevel;

          // duoの場合はゆめも更新
          if (character_id === 'duo') {
            const yumeIntimacy = await getIntimacy(supabase, dbUser.id, 'yume');
            const isFirstTodayYume = !yumeIntimacy?.last_interaction_at ||
              new Date(yumeIntimacy.last_interaction_at) < today;
            const yumeAnalysis = analyzeMessage(message, 'yume', isFirstTodayYume);
            await updateIntimacy(supabase, dbUser.id, 'yume', yumeAnalysis);
          }
        } catch (intimacyErr) {
          console.error('Intimacy update failed:', intimacyErr);
          // 親密度の失敗はチャットをブロックしない
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
    }
    if (!conversation_id) {
      conversation_id = `guest-${Date.now()}`;
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
    // JST時間帯コンテキストを注入（さやの深夜モード等を時刻ベースで制御）
    basePrompt += buildTimeContext(character_id);
    const intimacyAwarePrompt = applyIntimacyToPrompt(
      basePrompt,
      character_id,
      intimacyLevel
    );

    // Gemini API用のcontentsを構築（サマリー対応）
    const contents = buildContentsWithSummary(
      intimacyAwarePrompt,
      existingSummary,
      history,
      // ゲストの場合はhistoryに現在のメッセージが含まれていない
      (history.length === 0 || history[history.length - 1]?.content !== message)
        ? message
        : undefined
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

          // 親密度情報を送信（フロントでレベル表示・レベルアップアニメーション用）
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
                })}\n\n`
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
          if (planLimits.dailyImages > 0 && !dbUserId) {
            // ゲスト: IPベースのrate-limitで1枚/日制限
            const guestImgCheck = rateLimit(`guest-img:${clientIp}`, planLimits.dailyImages, 24 * 60 * 60 * 1000);
            if (!guestImgCheck.success) {
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

            // 画像生成（最初の1つだけ）— 参照画像付きで顔の一貫性を保つ
            let result;
            if (character_id === 'duo') {
              // Duo: 2人の参照画像を使って2ショット写真を生成
              const sayaRef = CHARACTERS.saya.referenceImagePath;
              const yumeRef = CHARACTERS.yume.referenceImagePath;
              const imgPrompt = buildDuoImagePrompt(imageDescriptions[0]);
              result = await generateDuoImage(imgPrompt, sayaRef, yumeRef);
            } else {
              const imgPrompt = buildImagePrompt(
                character.imagePromptBase,
                imageDescriptions[0],
                !!character.referenceImagePath
              );
              result = await generateImage(imgPrompt, character.referenceImagePath);
            }

            if (result) {
              // 認証ユーザー: Supabase Storageに保存して永続URL取得
              if (dbUserId) {
                try {
                  const storagePath = conversation_id && !conversation_id.startsWith('guest-')
                    ? conversation_id
                    : `user-${dbUserId}`;
                  const publicUrl = await uploadChatImage(supabase, result.base64, result.mimeType, storagePath);
                  if (publicUrl) {
                    imageUrl = publicUrl;
                  }
                } catch (uploadErr) {
                  console.error('Storage upload failed, falling back to base64:', uploadErr);
                }
              }
              // ゲストまたはアップロード失敗: base64 data URLにフォールバック
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
              savedContent += failMsg;
              controller.enqueue(
                encoder.encode(
                  `event: image_failed\ndata: ${JSON.stringify({ fallback_text: failMsg })}\n\n`
                )
              );
            }
          } else if (imageDescriptions.length > 0 && !canGenerateImages) {
            savedContent = cleanText;
            const upgradeMsg = !dbUserId
              ? '\n\n無料登録すると毎日3枚まで写真が見れるよ♡ アカウント作って続きを楽しもう！'
              : imageQuotaExceeded
              ? `\n\n今日の写真は${planLimits.dailyImages}枚まで...明日またね♡ もっと見たいならプランアップグレードで増えるよ！`
              : '\n\n写真を見るにはプランのアップグレードが必要だよ♡ Basicプランなら画像付きでチャットできるよ！';
            savedContent += upgradeMsg;
            controller.enqueue(
              encoder.encode(
                `event: clean_text\ndata: ${JSON.stringify({ content: savedContent })}\n\n`
              )
            );
          }

          // 認証ユーザーの場合: アシスタントメッセージをDB保存
          if (dbUserId && fullResponse && conversation_id && !conversation_id.startsWith('guest-')) {
            await supabase.from('messages').insert({
              conversation_id,
              role: 'assistant',
              content: savedContent,
              content_type: imageUrl ? 'image' : 'text',
              image_url: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : null,
              model_used: GEMINI_MODEL,
            });

            await supabase
              .from('conversations')
              .update({
                // currentTotalMessageCount: DBから取得した正確な総数（圧縮後でも壊れない）
                // +2: 今回の user + assistant メッセージ分
                message_count: currentTotalMessageCount + 2,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', conversation_id);
          }

          // image_urlがStorage URL（短い）なら直接含める。base64は大きすぎるのでフラグのみ
          const doneImageUrl = imageUrl && !imageUrl.startsWith('data:') ? imageUrl : null;
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
