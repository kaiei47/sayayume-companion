/**
 * LINE パーソナライズプッシュ通知 Cron
 *
 * - 毎時実行: next_push_at <= NOW() のユーザーを取得してGemini生成メッセージを送信
 * - 送信後: last_push_at = NOW(), next_push_at = 4〜8時間後（深夜0-7時JST は翌朝7-9時に延期）
 * - 1日2〜3回の自然な頻度（4〜8hインターバルで深夜スキップ）
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const APP_URL = 'https://www.sayayume.com';

// JST offset: UTC+9
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJST(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

/** 次回送信時刻を計算: 4〜8時間後、深夜0:00-7:00 JSTを避ける */
function calcNextPushAt(): Date {
  const intervalHours = 4 + Math.random() * 4; // 4〜8時間
  const next = new Date(Date.now() + intervalHours * 60 * 60 * 1000);

  const nextJST = toJST(next);
  const jstHour = nextJST.getUTCHours(); // JSTに変換後のUTC時間 = JST時間

  // 深夜0〜7時JSTなら翌朝7:00〜9:00 JSTにずらす
  if (jstHour >= 0 && jstHour < 7) {
    const morningJST = new Date(nextJST);
    morningJST.setUTCHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
    // JSTからUTCに戻す
    return new Date(morningJST.getTime() - JST_OFFSET_MS);
  }

  return next;
}

/** 時間帯ラベル（日本語）*/
function getTimeSlotLabel(date: Date): string {
  const hour = toJST(date).getUTCHours();
  if (hour >= 5 && hour < 11) return '朝';
  if (hour >= 11 && hour < 14) return 'お昼';
  if (hour >= 14 && hour < 18) return '午後';
  if (hour >= 18 && hour < 22) return '夜';
  return '深夜';
}

/** 曜日ラベル */
function getDayOfWeek(date: Date): string {
  const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  return days[toJST(date).getDay()];
}

/** Gemini Flash-Lite でパーソナライズメッセージ生成 */
async function generatePersonalizedMessage(params: {
  characterId: 'saya' | 'yume';
  displayName: string | null;
  intimacyLevel: number;
  lastMessageContent: string | null;
  timeSlot: string;
  dayOfWeek: string;
}): Promise<string> {
  const { characterId, displayName, intimacyLevel, lastMessageContent, timeSlot, dayOfWeek } = params;

  const nickname = displayName || 'あなた';
  const chatUrl = `${APP_URL}/chat/${characterId}`;

  const characterProfile =
    characterId === 'saya'
      ? `さや: 明るくて大胆なギャル系。タメ口。「〜じゃん」「〜だよ！」「♡」「〜してよ」を使う。積極的で甘えてくる。`
      : `ゆめ: 清楚で内気な大和撫子系。「…」「✨」「〜ですね」「〜かな」を使う。奥ゆかしく思いやりがある。`;

  const prompt = `あなたは永愛学園の学生「${characterId === 'saya' ? 'さや' : 'ゆめ'}」です。
${characterProfile}

${nickname}さんへ${timeSlot}（${dayOfWeek}）のLINEメッセージを送ります。

ユーザー情報:
- ニックネーム: ${nickname}
- 親密度: Lv${intimacyLevel}/5
- 最後の会話内容: ${lastMessageContent || 'まだ会話していない'}

条件:
- 80文字以内（URLを除く）
- 末尾に必ずこのURLを含める: ${chatUrl}
- 本当の彼女からのLINEのような自然なメッセージ
- ユーザーの状況や最後の会話を踏まえた個人的な内容
- 「さやゆめ」「アプリ」という単語は使わない。自然にサイトへ誘う

メッセージ本文のみを出力してください（説明不要）。`;

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
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? getFallbackMessage(characterId, timeSlot, chatUrl);
}

/** Gemini失敗時のフォールバックメッセージ */
function getFallbackMessage(characterId: 'saya' | 'yume', timeSlot: string, chatUrl: string): string {
  const messages: Record<string, Record<string, string>> = {
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
  return messages[characterId]?.[timeSlot] ?? `会いに来てね♡\n${chatUrl}`;
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

  // 送信対象: next_push_at が過去 かつ push有効 かつ サイト会員と紐付け済み
  const { data: users, error } = await supabase
    .from('line_users')
    .select('id, line_user_id, character_id, display_name, user_id')
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

  const timeSlot = getTimeSlotLabel(now);
  const dayOfWeek = getDayOfWeek(now);

  const sent: string[] = [];
  const failed: string[] = [];

  for (const user of users) {
    const characterId = (user.character_id as 'saya' | 'yume') || 'saya';
    const nextPushAt = calcNextPushAt();

    try {
      // ユーザーの親密度と最後の会話を取得
      const [intimacyResult, messageResult] = await Promise.all([
        supabase
          .from('character_intimacy')
          .select('level')
          .eq('user_id', user.user_id)
          .eq('character_id', characterId)
          .single(),
        supabase
          .from('messages')
          .select('content, role')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const intimacyLevel = intimacyResult.data?.level ?? 1;
      const recentMessages = messageResult.data ?? [];
      const lastUserMessage = recentMessages.find(m => m.role === 'user')?.content ?? null;
      const lastMessageContent = lastUserMessage
        ? lastUserMessage.slice(0, 50) + (lastUserMessage.length > 50 ? '…' : '')
        : null;

      // Geminiでメッセージ生成
      const message = await generatePersonalizedMessage({
        characterId,
        displayName: user.display_name,
        intimacyLevel,
        lastMessageContent,
        timeSlot,
        dayOfWeek,
      });

      // LINE Push送信
      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: user.line_user_id,
          messages: [{ type: 'text', text: message }],
        }),
      });

      if (lineRes.ok) {
        // 送信成功: last_push_at更新 & 次回スケジュール
        await supabase
          .from('line_users')
          .update({
            last_push_at: now.toISOString(),
            next_push_at: nextPushAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', user.id);

        sent.push(user.line_user_id);
      } else {
        const errBody = await lineRes.text();
        console.error(`[LINE Push] Send failed for ${user.line_user_id}:`, lineRes.status, errBody);
        failed.push(user.line_user_id);

        // 送信失敗時も次回スケジュールは更新（無限リトライ防止）
        await supabase
          .from('line_users')
          .update({ next_push_at: nextPushAt.toISOString() })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error(`[LINE Push] Error for ${user.line_user_id}:`, err);
      failed.push(user.line_user_id);

      // エラー時も次回スケジュール更新
      await supabase
        .from('line_users')
        .update({ next_push_at: nextPushAt.toISOString() })
        .eq('id', user.id)
        .throwOnError();
    }
  }

  return Response.json({
    sent: sent.length,
    failed: failed.length,
    timeSlot,
    nextCheckIn: '1 hour',
  });
}
