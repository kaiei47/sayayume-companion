import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CharacterId } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ conversation: null, messages: [], conversations: [] });
    }

    const characterId = req.nextUrl.searchParams.get('character_id') as CharacterId;
    if (!characterId) {
      return Response.json({ error: 'character_id required' }, { status: 400 });
    }

    // 特定の会話IDが指定された場合はその会話を取得
    const conversationIdParam = req.nextUrl.searchParams.get('conversation_id');

    // usersテーブルからDB上のuser_idを取得
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ conversation: null, messages: [], conversations: [] });
    }

    // 会話一覧を取得（最新10件）
    const { data: allConversations } = await supabase
      .from('conversations')
      .select('id, title, message_count, last_message_at')
      .eq('user_id', dbUser.id)
      .eq('character_id', characterId)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false })
      .limit(10);

    // 対象の会話を決定
    let conversation = null;
    if (conversationIdParam) {
      // 指定されたIDの会話を取得
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, title, message_count, last_message_at')
        .eq('id', conversationIdParam)
        .eq('user_id', dbUser.id)
        .single();
      conversation = conv;
    } else {
      // 最新の会話を取得
      conversation = allConversations?.[0] || null;
    }

    if (!conversation) {
      return Response.json({
        conversation: null,
        messages: [],
        conversations: allConversations || [],
      });
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
      conversations: allConversations || [],
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
