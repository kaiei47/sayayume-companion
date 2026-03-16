import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: ユーザー自身のサポートメッセージ一覧を取得
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = adminClient();

    const { data: dbUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (!dbUser) return NextResponse.json({ messages: [] });

    const { data: messages } = await admin
      .from('support_messages')
      .select('id, sender, message, read_at, created_at')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: true });

    // 未読の管理者メッセージを既読にする
    const unreadAdminIds = (messages ?? [])
      .filter(m => m.sender === 'admin' && !m.read_at)
      .map(m => m.id);

    if (unreadAdminIds.length > 0) {
      await admin
        .from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadAdminIds);
    }

    return NextResponse.json({ messages: messages ?? [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: ユーザーがメッセージを送信
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'メッセージは2000文字以内で入力してください' }, { status: 400 });
    }

    const admin = adminClient();

    const { data: dbUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (!dbUser) return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });

    const { data, error } = await admin
      .from('support_messages')
      .insert({ user_id: dbUser.id, sender: 'user', message: message.trim() })
      .select()
      .single();

    if (error) {
      console.error('Support message insert error:', error);
      return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
