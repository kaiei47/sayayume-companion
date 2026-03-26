import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { CharacterId } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    // 認証確認だけサーバークライアントで行う
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return Response.json({ conversation: null, messages: [], conversations: [] });
    }

    const characterId = req.nextUrl.searchParams.get('character_id') as CharacterId;
    if (!characterId) {
      return Response.json({ error: 'character_id required' }, { status: 400 });
    }

    const conversationIdParam = req.nextUrl.searchParams.get('conversation_id');

    // データクエリはサービスロールキーで RLS をバイパス（auth.getUser()で認証済みのため安全）
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let { data: dbUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    // public.usersにレコードがない場合 → 自動upsert
    if (!dbUser) {
      const { data: created } = await admin
        .from('users')
        .upsert({
          auth_id: user.id,
          display_name: null,
          email: user.email,
        }, { onConflict: 'auth_id' })
        .select('id')
        .single();
      dbUser = created;
    }

    if (!dbUser) {
      return Response.json({ conversation: null, messages: [], conversations: [] });
    }

    // 会話一覧を取得（最新10件）
    const { data: allConversations } = await admin
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
      const { data: conv } = await admin
        .from('conversations')
        .select('id, title, message_count, last_message_at')
        .eq('id', conversationIdParam)
        .eq('user_id', dbUser.id)
        .maybeSingle();
      conversation = conv;
    } else {
      conversation = allConversations?.[0] || null;
    }

    if (!conversation) {
      return Response.json({
        conversation: null,
        messages: [],
        conversations: allConversations || [],
      });
    }

    // メッセージ履歴を取得（最新100件、降順取得→昇順に反転）
    const { data: messagesDesc, error: messagesError } = await admin
      .from('messages')
      .select('id, role, content, content_type, image_url, is_favorite, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(100);
    const messages = messagesDesc ? [...messagesDesc].reverse() : [];

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError.message);
    }

    return Response.json({
      conversation,
      messages: messages,
      conversations: allConversations || [],
    });
  } catch (error) {
    console.error('conversations API error:', error);
    return Response.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}
