import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CharacterId } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ conversation: null, messages: [] });
    }

    const characterId = req.nextUrl.searchParams.get('character_id') as CharacterId;
    if (!characterId) {
      return Response.json({ error: 'character_id required' }, { status: 400 });
    }

    // usersテーブルからDB上のuser_idを取得
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ conversation: null, messages: [] });
    }

    // そのキャラの直近の会話を取得
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, title, message_count, last_message_at')
      .eq('user_id', dbUser.id)
      .eq('character_id', characterId)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      return Response.json({ conversation: null, messages: [] });
    }

    // メッセージ履歴を取得（最新50件）
    const { data: messages } = await supabase
      .from('messages')
      .select('id, role, content, content_type, image_url, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(50);

    return Response.json({
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
