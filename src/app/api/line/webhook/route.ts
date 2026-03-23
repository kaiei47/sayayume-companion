/**
 * LINE Webhook（リテンション専用・シンプル版）
 * LINEはサイトへの誘導チャネルとして使用。
 * チャット機能はWebサイトで行うため、ここではサイトへ誘導するだけ。
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 10;

const APP_URL = 'https://www.sayayume.com';

async function replyMessage(replyToken: string, messages: object[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  try {
    const channelSecret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
    if (!channelSecret) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-line-signature') ?? '';

    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(body)
      .digest('base64');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { events } = JSON.parse(body);

    for (const event of events ?? []) {
      // フォロー（友達追加）
      if (event.type === 'follow') {
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `さやゆめだよ〜！友達追加ありがとっ♡\nここからさやゆめアプリに来てね👇\n${APP_URL}\n\n毎日通知も届くよ！楽しみにしてて♡`,
          },
        ]);
        continue;
      }

      // テキストメッセージ → サイトへ誘導
      if (event.type === 'message' && event.message?.type === 'text') {
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `話しかけてくれてありがとっ♡\nさやゆめとのチャットはアプリでね👇\n${APP_URL}`,
          },
        ]);
        continue;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[LINE Webhook Error]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
