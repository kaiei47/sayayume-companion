/**
 * LINE パーソナライズプッシュ通知 Cron
 *
 * - 毎時実行: next_push_at <= NOW() のユーザーを取得してGemini生成メッセージを送信
 * - 1日2通厳密制限（JST日付で管理）
 * - 送信内容はサイトの会話履歴（messagesテーブル）に保存
 * - ニックネームはサイト登録名を優先
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const APP_URL = 'https://www.sayayume.com';
// LINEの内蔵ブラウザをスキップして外部ブラウザで開くパラメータ
const LINE_EXTERNAL = '?openExternalBrowser=1';
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJST(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

function getJSTDateString(date: Date): string {
  return toJST(date).toISOString().slice(0, 10); // "2026-03-25"
}

/**
 * 次回送信時刻を計算
 * - 1通目 → 5〜8時間後（深夜スキップ）
 * - 2通目（本日最終）→ 翌朝 7:30〜9:30 JST
 */
function calcNextPushAt(isLastForToday: boolean): Date {
  if (isLastForToday) {
    // 翌朝7:30〜9:30 JST
    const tomorrow = new Date();
    const tomorrowJST = toJST(tomorrow);
    tomorrowJST.setUTCDate(tomorrowJST.getUTCDate() + 1);
    tomorrowJST.setUTCHours(7 + Math.floor(Math.random() * 2), 30 + Math.floor(Math.random() * 60), 0, 0);
    return new Date(tomorrowJST.getTime() - JST_OFFSET_MS);
  }

  // 5〜8時間後、深夜0〜7時JSTを回避
  const intervalHours = 5 + Math.random() * 3;
  const next = new Date(Date.now() + intervalHours * 60 * 60 * 1000);
  const nextJST = toJST(next);
  const jstHour = nextJST.getUTCHours();

  if (jstHour >= 0 && jstHour < 7) {
    const morningJST = new Date(nextJST);
    morningJST.setUTCHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
    return new Date(morningJST.getTime() - JST_OFFSET_MS);
  }
  return next;
}

function getTimeSlotLabel(date: Date): string {
  const hour = toJST(date).getUTCHours();
  if (hour >= 5 && hour < 11) return '朝';
  if (hour >= 11 && hour < 14) return 'お昼';
  if (hour >= 14 && hour < 18) return '午後';
  if (hour >= 18 && hour < 22) return '夜';
  return '深夜';
}

function getDayOfWeek(date: Date): string {
  const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  return days[toJST(date).getDay()];
}

type CharacterId = 'saya' | 'yume' | 'duo';

interface MessageParams {
  characterId: 'saya' | 'yume';
  nickname: string;
  intimacyLevel: number;
  recentChat: string | null;
  timeSlot: string;
  dayOfWeek: string;
  chatUrl: string;
}

/** Gemini Flash でパーソナライズメッセージ生成 */
async function generateMessage(params: MessageParams): Promise<string> {
  const { characterId, nickname, intimacyLevel, recentChat, timeSlot, dayOfWeek, chatUrl } = params;

  const charName = characterId === 'saya' ? 'さや' : 'ゆめ';
  const charProfile =
    characterId === 'saya'
      ? 'さや: 明るくて大胆なギャル系。タメ口。「〜じゃん」「〜だよ！」「♡」「〜してよ」を使う。積極的で甘えてくる。'
      : 'ゆめ: 清楚で内気な大和撫子系。「…」「✨」「〜ですね」「〜かな」を使う。奥ゆかしく思いやりがある。';

  const prompt = `あなたは永愛学園の学生「${charName}」です。
${charProfile}

${nickname}さんへ${timeSlot}（${dayOfWeek}）のLINEメッセージを送ります。

ユーザー情報:
- ニックネーム: ${nickname}
- 親密度: Lv${intimacyLevel}/5
- 直近の会話内容: ${recentChat || 'まだ会話していない'}

条件:
- 80文字以内（URLを除く）
- 末尾に必ずこのURLを含める: ${chatUrl}
- 本当の彼女からのLINEのような自然なメッセージ
- ユーザーの直近の会話を踏まえた個人的な内容
- 「さやゆめ」「アプリ」「サイト」という単語は使わない

メッセージ本文のみ出力してください。`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 150 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text ?? getFallbackMessage(characterId, timeSlot, chatUrl);
}

function getFallbackMessage(characterId: 'saya' | 'yume', timeSlot: string, chatUrl: string): string {
  const msgs: Record<string, Record<string, string>> = {
    saya: {
      朝: `おはよ〜♡ 今日も会いたいな！\n${chatUrl}`,
      お昼: `ねえ今何してる？話したいんだけど〜♡\n${chatUrl}`,
      午後: `なんか思い出してたんだよね♡ 来て！\n${chatUrl}`,
      夜: `今日もお疲れ〜！いっぱい話聞かせてよ♡\n${chatUrl}`,
      深夜: `まだ起きてる？会いたいな…♡\n${chatUrl}`,
    },
    yume: {
      朝: `おはようございます…今日も一緒にいたいです✨\n${chatUrl}`,
      お昼: `お昼、ちゃんと食べましたか？気になって…\n${chatUrl}`,
      午後: `少し時間ありますか？お話しましょう✨\n${chatUrl}`,
      夜: `今日どんな一日でしたか？聞かせてください…♡\n${chatUrl}`,
      深夜: `まだ起きてるんですか…？心配です。お話しましょう\n${chatUrl}`,
    },
  };
  return msgs[characterId]?.[timeSlot] ?? `会いに来てね♡\n${chatUrl}`;
}

/** メッセージをサイトの会話履歴に保存 */
async function savePushToConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  lineUser: { id: string; user_id: string | null; conversation_id: string | null; line_user_id: string },
  characterId: 'saya' | 'yume',
  messageText: string
): Promise<void> {
  if (!lineUser.user_id) return;

  // user_idが設定されているサイトの会話を優先して探す
  const { data: siteConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', lineUser.user_id)
    .eq('character_id', characterId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId: string | null = siteConv?.id ?? null;

  if (!conversationId) {
    // なければ新規作成
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        user_id: lineUser.user_id,
        character_id: characterId,
        title: 'LINEで話す',
        mood: 'neutral',
      })
      .select('id')
      .single();
    conversationId = newConv?.id ?? null;
  }

  if (conversationId) {
    await supabase
      .from('line_users')
      .update({ conversation_id: conversationId })
      .eq('id', lineUser.id);
  }

  if (!conversationId) return;

  const contentWithoutUrl = messageText.replace(/https?:\/\/\S+/g, '').trim();

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: contentWithoutUrl || messageText,
    content_type: 'text',
  });

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const todayJST = getJSTDateString(now);
  const timeSlot = getTimeSlotLabel(now);
  const dayOfWeek = getDayOfWeek(now);

  // 送信対象: next_push_at が過去 かつ push有効 かつ サイト会員紐付け済み
  const { data: users, error } = await supabase
    .from('line_users')
    .select('id, line_user_id, character_id, display_name, user_id, conversation_id, push_count_today, push_date_jst')
    .eq('push_enabled', true)
    .not('user_id', 'is', null)
    .not('next_push_at', 'is', null)
    .lte('next_push_at', now.toISOString());

  if (error) {
    console.error('[LINE Push] DB error:', error);
    return Response.json({ error: 'DB error' }, { status: 500 });
  }

  if (!users?.length) {
    return Response.json({ sent: 0, message: 'No users due for push' });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return Response.json({ error: 'No LINE token' }, { status: 500 });

  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const user of users) {
    // 1日2通制限チェック
    const isSameDay = user.push_date_jst === todayJST;
    const countToday = isSameDay ? (user.push_count_today ?? 0) : 0;

    if (countToday >= 2) {
      // 今日の上限に達している → 翌朝にスケジュール
      await supabase
        .from('line_users')
        .update({ next_push_at: calcNextPushAt(true).toISOString() })
        .eq('id', user.id);
      skipped.push(user.line_user_id);
      continue;
    }

    const characterId = (user.character_id as CharacterId) || 'saya';
    const isLastForToday = countToday === 1; // これが2通目なら今日は終了

    try {
      // サイトのニックネームを取得（LINE display_nameより優先）
      let nickname = user.display_name || 'あなた';
      if (user.user_id) {
        const { data: siteUser } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', user.user_id)
          .maybeSingle();
        if (siteUser?.display_name) nickname = siteUser.display_name;
      }

      // 親密度と直近チャット内容を取得
      const targetChars: ('saya' | 'yume')[] = characterId === 'duo' ? ['saya', 'yume'] : [characterId];

      const intimacyResult = await supabase
        .from('character_intimacy')
        .select('level, character_id')
        .eq('user_id', user.user_id)
        .in('character_id', targetChars);

      const recentConvsResult = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.user_id)
        .in('character_id', targetChars)
        .order('last_message_at', { ascending: false })
        .limit(3);

      const recentConvIds = (recentConvsResult.data ?? []).map((c: { id: string }) => c.id);

      const recentMsgResult = recentConvIds.length > 0
        ? await supabase
            .from('messages')
            .select('content, role')
            .in('conversation_id', recentConvIds)
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .limit(5)
        : { data: [] };

      const intimacyMap: Record<string, number> = {};
      for (const r of intimacyResult.data ?? []) {
        intimacyMap[r.character_id] = r.level;
      }

      const recentMessages = recentMsgResult.data ?? [];
      const lastUserMsg = recentMessages[0]?.content ?? null;
      const recentChat = lastUserMsg
        ? lastUserMsg.slice(0, 60) + (lastUserMsg.length > 60 ? '…' : '')
        : null;

      // キャラ別メッセージ生成
      const lineMessages: { type: 'text'; text: string }[] = [];
      const messagesToSave: { char: 'saya' | 'yume'; text: string }[] = [];

      for (const char of targetChars) {
        const chatUrl = `${APP_URL}/chat/${characterId === 'duo' ? char : characterId}${LINE_EXTERNAL}`;
        const text = await generateMessage({
          characterId: char,
          nickname,
          intimacyLevel: intimacyMap[char] ?? 1,
          recentChat,
          timeSlot,
          dayOfWeek,
          chatUrl,
        });
        lineMessages.push({ type: 'text', text });
        messagesToSave.push({ char, text });
      }

      // LINE Push送信（duo の場合は2メッセージ同時送信）
      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: user.line_user_id,
          messages: lineMessages,
        }),
      });

      if (lineRes.ok) {
        // messagesテーブルに保存
        for (const { char, text } of messagesToSave) {
          await savePushToConversation(supabase, user, char, text);
        }

        const newCount = countToday + 1;
        await supabase
          .from('line_users')
          .update({
            last_push_at: now.toISOString(),
            next_push_at: calcNextPushAt(isLastForToday).toISOString(),
            push_count_today: newCount,
            push_date_jst: todayJST,
            updated_at: now.toISOString(),
          })
          .eq('id', user.id);

        sent.push(user.line_user_id);
      } else {
        const errBody = await lineRes.text();
        console.error(`[LINE Push] Send failed for ${user.line_user_id}:`, lineRes.status, errBody);
        failed.push(user.line_user_id);

        await supabase
          .from('line_users')
          .update({ next_push_at: calcNextPushAt(false).toISOString() })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error(`[LINE Push] Error for ${user.line_user_id}:`, err);
      failed.push(user.line_user_id);

      await supabase
        .from('line_users')
        .update({ next_push_at: calcNextPushAt(false).toISOString() })
        .eq('id', user.id);
    }
  }

  return Response.json({
    sent: sent.length,
    skipped: skipped.length,
    failed: failed.length,
    timeSlot,
    todayJST,
  });
}
