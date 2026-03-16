import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) return null;
  return user;
}

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: 全ユーザーのスレッド一覧（管理者用）
export async function GET() {
  try {
    const admin_user = await requireAdmin();
    if (!admin_user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = adminClient();

    const { data: messages } = await admin
      .from('support_messages')
      .select('id, user_id, sender, message, read_at, created_at')
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      return NextResponse.json({ threads: [] });
    }

    // ユーザー情報を別途取得
    const userIds = [...new Set(messages.map(m => m.user_id))];
    const { data: users } = await admin
      .from('users')
      .select('id, display_name, email')
      .in('id', userIds);

    const userMap = new Map((users ?? []).map(u => [u.id, u]));

    // ユーザーIDごとにスレッドをまとめる
    const threadsMap = new Map<string, {
      user_id: string;
      display_name: string | null;
      email: string | null;
      messages: typeof messages;
      unread_count: number;
      latest_at: string;
    }>();

    for (const msg of messages) {
      const uid = msg.user_id;
      if (!threadsMap.has(uid)) {
        const u = userMap.get(uid);
        threadsMap.set(uid, {
          user_id: uid,
          display_name: u?.display_name ?? null,
          email: u?.email ?? null,
          messages: [],
          unread_count: 0,
          latest_at: msg.created_at,
        });
      }
      const thread = threadsMap.get(uid)!;
      thread.messages.push(msg);
      if (msg.sender === 'user' && !msg.read_at) thread.unread_count++;
      if (msg.created_at > thread.latest_at) thread.latest_at = msg.created_at;
    }

    const threads = Array.from(threadsMap.values())
      .sort((a, b) => b.latest_at.localeCompare(a.latest_at));

    return NextResponse.json({ threads });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: 管理者がユーザーに返信
export async function POST(req: NextRequest) {
  try {
    const admin_user = await requireAdmin();
    if (!admin_user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { user_id, message } = await req.json();
    if (!user_id || !message?.trim()) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const admin = adminClient();

    // ユーザーメッセージを既読にする
    await admin
      .from('support_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('sender', 'user')
      .is('read_at', null);

    const { data, error } = await admin
      .from('support_messages')
      .insert({ user_id, sender: 'admin', message: message.trim() })
      .select()
      .single();

    if (error) {
      console.error('Admin reply insert error:', error);
      return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
