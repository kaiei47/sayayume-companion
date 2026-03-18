import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'yoshihide.maruyama@gmail.com').split(',').map(e => e.trim());

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '30'), 100);
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0');

  // 最新のゲストイベントを取得
  const { data: events, error } = await admin
    .from('guest_events')
    .select('id, session_id, character_id, user_message, assistant_response, ip_hash, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('guest_events fetch error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // session_id ごとにグループ化（時系列順）
  const sessionsMap = new Map<string, {
    session_id: string;
    character_id: string;
    ip_hash: string | null;
    messages: Array<{ user_message: string; assistant_response: string | null; created_at: string }>;
    first_at: string;
    last_at: string;
  }>();

  // eventsは降順なので逆順にしてセッション内を昇順にする
  for (const ev of [...(events ?? [])].reverse()) {
    if (!sessionsMap.has(ev.session_id)) {
      sessionsMap.set(ev.session_id, {
        session_id: ev.session_id,
        character_id: ev.character_id,
        ip_hash: ev.ip_hash,
        messages: [],
        first_at: ev.created_at,
        last_at: ev.created_at,
      });
    }
    const session = sessionsMap.get(ev.session_id)!;
    session.messages.push({
      user_message: ev.user_message,
      assistant_response: ev.assistant_response,
      created_at: ev.created_at,
    });
    session.last_at = ev.created_at > session.last_at ? ev.created_at : session.last_at;
  }

  // 最終アクティブ時刻でソート（新しい順）
  const sessions = Array.from(sessionsMap.values())
    .sort((a, b) => b.last_at.localeCompare(a.last_at));

  return NextResponse.json({ sessions, total: events?.length ?? 0 });
}
