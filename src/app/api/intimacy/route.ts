import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getAllIntimacy, getLevelInfo, getLevelProgress, INTIMACY_LEVELS } from '@/lib/intimacy';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** JST での今日の日付文字列 (YYYY-MM-DD) */
function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** JSTの今日の開始時刻 (UTC ISO文字列) */
function getTodayStartUTC(): string {
  const today = getTodayJST();
  // JST 00:00 = UTC 前日15:00
  return new Date(today + 'T00:00:00+09:00').toISOString();
}

/**
 * GET /api/intimacy - ユーザーの全キャラ親密度 + ストリーク + デイリーミッションを取得
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({
        intimacy: {
          saya: { level: 1, points: 0, progress: 0, levelInfo: INTIMACY_LEVELS[0], totalMessages: 0, pointsToNext: 100 },
          yume: { level: 1, points: 0, progress: 0, levelInfo: INTIMACY_LEVELS[0], totalMessages: 0, pointsToNext: 100 },
        },
        streak: { count: 0 },
        dailyMissions: getDefaultMissions(),
      });
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, login_streak, last_login_date')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ intimacy: {}, streak: { count: 0 }, dailyMissions: getDefaultMissions() });
    }

    // ── ストリーク更新 ──────────────────────────────
    const today = getTodayJST();
    const lastLogin = dbUser.last_login_date as string | null;
    let streak = (dbUser.login_streak as number) || 0;

    if (lastLogin !== today) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      if (lastLogin === yesterdayStr) {
        streak = streak + 1; // 連続ログイン
      } else {
        streak = 1; // リセット
      }

      // adminでストリーク更新（RLSバイパス）
      const adminDb = getSupabaseAdmin();
      await adminDb
        .from('users')
        .update({ login_streak: streak, last_login_date: today })
        .eq('id', dbUser.id);
    }

    // ── デイリーミッション達成状況 ──────────────────
    const todayStart = getTodayStartUTC();
    const { data: todayEvents } = await supabase
      .from('intimacy_events')
      .select('event_type')
      .eq('user_id', dbUser.id)
      .gte('created_at', todayStart);

    const eventTypes = new Set((todayEvents || []).map((e: { event_type: string }) => e.event_type));
    const dailyMissions = [
      {
        id: 'today_chat',
        label: '今日話しかける',
        icon: '💬',
        points: 10,
        completed: eventTypes.has('daily_first') || eventTypes.has('message_sent'),
      },
      {
        id: 'long_message',
        label: '長文メッセージを送る',
        icon: '✍️',
        points: 5,
        completed: eventTypes.has('long_message'),
      },
      {
        id: 'compliment',
        label: 'さやかゆめを褒める',
        icon: '💕',
        points: 5,
        completed: eventTypes.has('compliment'),
      },
    ];

    // ── 親密度取得 ──────────────────────────────────
    const rawIntimacy = await getAllIntimacy(supabase, dbUser.id);

    const intimacy: Record<string, {
      level: number;
      points: number;
      progress: number;
      levelInfo: typeof INTIMACY_LEVELS[0];
      totalMessages: number;
      lastInteractionAt: string | null;
      pointsToNext: number;
    }> = {};

    for (const [charId, data] of Object.entries(rawIntimacy)) {
      const levelInfo = getLevelInfo(data.intimacy_level);
      const nextLevel = INTIMACY_LEVELS.find(l => l.level === data.intimacy_level + 1);
      const pointsToNext = nextLevel ? nextLevel.minPoints - data.affection_points : 0;
      intimacy[charId] = {
        level: data.intimacy_level,
        points: data.affection_points,
        progress: getLevelProgress(data.affection_points, data.intimacy_level),
        levelInfo,
        totalMessages: data.total_messages,
        lastInteractionAt: data.last_interaction_at,
        pointsToNext: Math.max(0, pointsToNext),
      };
    }

    for (const charId of ['saya', 'yume']) {
      if (!intimacy[charId]) {
        intimacy[charId] = {
          level: 1, points: 0, progress: 0,
          levelInfo: INTIMACY_LEVELS[0],
          totalMessages: 0, lastInteractionAt: null,
          pointsToNext: 100,
        };
      }
    }

    return Response.json({ intimacy, streak: { count: streak }, dailyMissions });
  } catch (error) {
    console.error('Intimacy API error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function getDefaultMissions() {
  return [
    { id: 'today_chat',   label: '今日話しかける',       icon: '💬', points: 10, completed: false },
    { id: 'long_message', label: '長文メッセージを送る', icon: '✍️', points: 5,  completed: false },
    { id: 'compliment',   label: 'さやかゆめを褒める',   icon: '💕', points: 5,  completed: false },
  ];
}
