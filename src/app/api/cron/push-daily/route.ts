import { NextRequest } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Time-based messages from さや or ゆめ
const REENGAGEMENT_MESSAGES: Record<number, { title: string; body: string; char: 'saya' | 'yume'; url: string }> = {
  1: {
    title: 'さやから',
    body: '昨日話したね。今日も会いにきてよ♡',
    char: 'saya',
    url: '/chat/saya',
  },
  2: {
    title: 'ゆめから',
    body: '2日も経ったよ…ちょっと寂しかったな',
    char: 'yume',
    url: '/chat/yume',
  },
  3: {
    title: 'さやから',
    body: '久しぶり…何かあった？心配してたよ',
    char: 'saya',
    url: '/chat/saya',
  },
};

const LONG_ABSENCE = {
  title: 'さやゆめより',
  body: 'ずっと待ってたよ…また話しかけてくれたら嬉しいな♡',
  url: '/',
};

export async function GET(req: NextRequest) {
  // Vercel Cron secret check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const sent: string[] = [];
  const failed: string[] = [];

  // Get all push subscriptions with user's last_active_at
  const { data: rows } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription, users!inner(last_active_at)')
    .limit(500);

  if (!rows?.length) return Response.json({ sent: 0 });

  for (const row of rows) {
    const lastActive = (row.users as unknown as { last_active_at: string })?.last_active_at;
    const daysSince = lastActive
      ? Math.floor((now.getTime() - new Date(lastActive).getTime()) / 86400000)
      : 999;

    // Skip users who were active today
    if (daysSince < 1) continue;

    const msg = REENGAGEMENT_MESSAGES[daysSince] ?? LONG_ABSENCE;

    try {
      await webpush.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify({
          title: msg.title,
          body: msg.body,
          url: msg.url,
          tag: 'reengagement',
        })
      );
      sent.push(row.user_id);
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      // Remove expired/invalid subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions')
          .delete()
          .eq('user_id', row.user_id)
          .eq('subscription->>endpoint', (row.subscription as webpush.PushSubscription).endpoint);
      }
      failed.push(row.user_id);
    }
  }

  return Response.json({ sent: sent.length, failed: failed.length });
}
