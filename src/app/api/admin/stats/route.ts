import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'yoshihide.maruyama@gmail.com').split(',').map(e => e.trim());

export async function GET() {
  // Auth check: verify requesting user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Admin client with service_role key (bypasses RLS)
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Total users
    const { count: totalUsers } = await adminSupabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Active subscriptions by plan
    const { data: subscriptions } = await adminSupabase
      .from('subscriptions')
      .select('plan, status')
      .eq('status', 'active');

    const planCounts: Record<string, number> = {};
    let activeSubscriptions = 0;
    if (subscriptions) {
      for (const sub of subscriptions) {
        const plan = sub.plan ?? 'unknown';
        planCounts[plan] = (planCounts[plan] ?? 0) + 1;
        activeSubscriptions++;
      }
    }

    // Total conversations
    const { count: totalConversations } = await adminSupabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    // Total messages
    const { count: totalMessages } = await adminSupabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    // Messages today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: messagesToday } = await adminSupabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    // MRR estimate based on active subscriptions
    const planPrices: Record<string, number> = {
      basic: 1980,
      premium: 2980,
      free: 0,
    };
    let mrrEstimate = 0;
    for (const [plan, count] of Object.entries(planCounts)) {
      mrrEstimate += (planPrices[plan] ?? 0) * count;
    }

    // Recent active users (sorted by last interaction)
    const { data: recentInteractions } = await adminSupabase
      .from('character_intimacy')
      .select('user_id, last_interaction_at')
      .order('last_interaction_at', { ascending: false })
      .limit(20);

    // Deduplicate by user_id (keep latest)
    const seenUserIds = new Set<string>();
    const latestByUser: Record<string, string> = {};
    for (const row of recentInteractions ?? []) {
      if (!seenUserIds.has(row.user_id)) {
        seenUserIds.add(row.user_id);
        latestByUser[row.user_id] = row.last_interaction_at;
      }
    }
    const topUserIds = Object.keys(latestByUser).slice(0, 5);

    let recentUsers: { display_name: string | null; email: string | null; is_premium: boolean; created_at: string }[] = [];
    if (topUserIds.length > 0) {
      const { data: usersData } = await adminSupabase
        .from('users')
        .select('id, display_name, email, is_premium')
        .in('id', topUserIds);

      recentUsers = (usersData ?? [])
        .sort((a, b) => {
          const ta = latestByUser[a.id] ?? '';
          const tb = latestByUser[b.id] ?? '';
          return tb.localeCompare(ta);
        })
        .map(u => ({
          display_name: u.display_name,
          email: u.email,
          is_premium: u.is_premium,
          created_at: latestByUser[u.id] ?? '',
        }));
    }

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      activeSubscriptions,
      planCounts,
      totalConversations: totalConversations ?? 0,
      totalMessages: totalMessages ?? 0,
      messagesToday: messagesToday ?? 0,
      mrrEstimate,
      recentUsers: recentUsers ?? [],
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
