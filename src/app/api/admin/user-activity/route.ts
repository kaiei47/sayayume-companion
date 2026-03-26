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

  const userId = req.nextUrl.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 直近の会話 (最大5件)
  const { data: conversations } = await adminSupabase
    .from('conversations')
    .select('id, character_id, title, message_count, last_message_at, mood, created_at')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false })
    .limit(5);

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  // 各会話の直近メッセージ (最大6件)
  const convIds = conversations.map(c => c.id);
  const { data: messages } = await adminSupabase
    .from('messages')
    .select('id, conversation_id, role, content, created_at')
    .in('conversation_id', convIds)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(60);

  // 会話ごとにメッセージをグループ化 (最新6件を古い順に)
  const msgByConv: Record<string, typeof messages> = {};
  for (const msg of messages ?? []) {
    if (!msgByConv[msg.conversation_id]) msgByConv[msg.conversation_id] = [];
    msgByConv[msg.conversation_id]!.push(msg);
  }

  const result = conversations.map(conv => ({
    ...conv,
    messages: (msgByConv[conv.id] ?? []).slice(0, 6).reverse(),
  }));

  return NextResponse.json({ conversations: result });
}
