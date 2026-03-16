import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(req: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message_id, is_favorite } = await req.json();
    if (!message_id || typeof is_favorite !== 'boolean') {
      return Response.json({ error: 'Invalid params' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ユーザーのDBidを取得
    const { data: dbUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // メッセージが本人の会話のものか確認してからupdateする
    const { data: msg } = await admin
      .from('messages')
      .select('id, conversation_id')
      .eq('id', message_id)
      .single();

    if (!msg) {
      return Response.json({ error: 'Message not found' }, { status: 404 });
    }

    const { data: conv } = await admin
      .from('conversations')
      .select('user_id')
      .eq('id', msg.conversation_id)
      .single();

    if (!conv || conv.user_id !== dbUser.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await admin
      .from('messages')
      .update({ is_favorite })
      .eq('id', message_id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, is_favorite });
  } catch (error) {
    console.error('favorite toggle error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
