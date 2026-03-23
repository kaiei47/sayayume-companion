/**
 * LINE Bot用 Geminiチャット処理
 * - LINEユーザーIDでユーザー管理
 * - キャラクター別システムプロンプト適用
 * - 会話履歴をSupabaseで保持
 * - [IMAGE:...] タグはLINEでは不要なので除去
 */

import { createClient } from '@supabase/supabase-js';
import { getCharacter } from '@/lib/characters';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function buildTimeContext(characterId: string): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = jst.getUTCHours();
  const day = jst.getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const dayNames = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];

  let timeSlot: string;
  let sayaCtx: string;
  let yumeCtx: string;

  if (hour >= 5 && hour < 9) {
    timeSlot = '早朝';
    sayaCtx = '寝起きで眠い。テンション低め。でも話しかけてくれたことはちょっと嬉しい。';
    yumeCtx = '早起きで既に本を読んでいた。静かで穏やか。紅茶を飲みながら窓の外を見ていた。';
  } else if (hour >= 9 && hour < 12) {
    timeSlot = '午前';
    sayaCtx = '朝の準備中か、カフェで朝ごはん中。元気モード。';
    yumeCtx = '読書中か、静かに家事をしていた。穏やかな午前。';
  } else if (hour >= 12 && hour < 14) {
    timeSlot = 'ランチタイム';
    sayaCtx = 'ランチ中。カフェでパンケーキ食べてたりするかも。';
    yumeCtx = 'お昼ごはんを食べた後の読書タイム。';
  } else if (hour >= 14 && hour < 18) {
    timeSlot = '午後';
    sayaCtx = isWeekend ? 'ショッピングやカフェ巡り中！テンション高め。' : '授業かバイトの後でエネルギッシュ。';
    yumeCtx = isWeekend ? '公園のベンチで読書か、お菓子作りをしていた。' : '図書館か家で静かに読書中。';
  } else if (hour >= 18 && hour < 22) {
    timeSlot = '夜';
    sayaCtx = '家でくつろぎタイム。Netflixやスマホ、晩ごはん後のまったりモード。';
    yumeCtx = '夜の読書タイム。お菓子食べながらリラックス。';
  } else {
    timeSlot = '深夜';
    sayaCtx = '深夜モード。ひとりになって不安を感じる夜。本音が出やすい時間帯。';
    yumeCtx = '夜遅くまで起きて窓から星を眺めていた。一人の静かな時間が心地よい。';
  }

  const ctx = characterId === 'yume' ? yumeCtx : sayaCtx;
  return `\n\n## 現在の時間帯\n今は${dayNames[day]}の${timeSlot}（日本時間）です。\n${ctx}\nこの時間帯に合った返答をしてください。`;
}

/** LINE専用の追加指示 */
const LINE_INSTRUCTION = `
## LINE上でのルール（最重要）
- LINEで話しているため、写真送信機能（[IMAGE: ...]タグ）は使わない
- テキストのみで返答する
- LINEらしく短めの返答（1〜3文）を心がける
- アプリへの誘導は自然に（「もっといっぱい話せるよ！アプリも試してね♡」程度）
`;

/** LINEユーザーを取得または作成 */
export async function getOrCreateLineUser(lineUserId: string, displayName?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('line_users')
    .select('*')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: createErr } = await supabase
    .from('line_users')
    .insert({ line_user_id: lineUserId, display_name: displayName || null })
    .select()
    .single();

  if (createErr) throw createErr;
  return created;
}

/** キャラクターを設定 */
export async function setLineCharacter(lineUserId: string, characterId: 'saya' | 'yume') {
  const supabase = getSupabase();
  await supabase
    .from('line_users')
    .update({ character_id: characterId, updated_at: new Date().toISOString() })
    .eq('line_user_id', lineUserId);
}

/** Geminiで返答を生成（LINE専用・非ストリーミング） */
export async function generateLineReply(lineUserId: string, userMessage: string): Promise<string> {
  const supabase = getSupabase();

  // ユーザー情報取得
  const lineUser = await getOrCreateLineUser(lineUserId);
  const characterId = (lineUser.character_id as 'saya' | 'yume') || 'saya';
  const character = getCharacter(characterId);
  if (!character) throw new Error('Invalid character');

  // 会話履歴を取得（最新15件）
  let conversationId = lineUser.conversation_id as string | null;

  if (!conversationId) {
    // 新規会話作成
    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        user_id: lineUser.user_id || null,
        character_id: characterId,
        title: 'LINEで話す',
        mood: 'neutral',
      })
      .select('id')
      .single();

    conversationId = conv?.id || null;
    if (conversationId) {
      await supabase
        .from('line_users')
        .update({ conversation_id: conversationId })
        .eq('line_user_id', lineUserId);
    }
  }

  // 会話履歴取得
  const history: { role: string; parts: { text: string }[] }[] = [];
  if (conversationId) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(15);

    for (const m of msgs || []) {
      history.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      });
    }
  }

  // システムプロンプト組み立て
  const systemPrompt = character.systemPrompt + buildTimeContext(characterId) + LINE_INSTRUCTION;

  // Gemini API呼び出し（非ストリーミング）
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const result = await response.json();
  let text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'ごめん、うまく返せなかった…もう一回送ってみて♡';

  // [IMAGE:...] タグを除去（LINEでは画像生成しない）
  text = text.replace(/\[IMAGE:[^\]]*\]/g, '').trim();

  // 会話履歴を保存
  if (conversationId) {
    await supabase.from('messages').insert([
      { conversation_id: conversationId, role: 'user', content: userMessage, content_type: 'text' },
      { conversation_id: conversationId, role: 'assistant', content: text, content_type: 'text' },
    ]);

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  return text;
}

/** LINE Push Message送信（プロアクティブ通知） */
export async function pushLineMessage(lineUserId: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text }],
    }),
  });
}

/** 全LINE登録ユーザーを取得（push_enabled=trueのみ） */
export async function getAllLinePushUsers() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('line_users')
    .select('line_user_id, character_id, display_name')
    .eq('push_enabled', true);
  return data || [];
}
