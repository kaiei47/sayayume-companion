import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // 認証確認だけサーバークライアントで行う
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return Response.json({ images: [] });
    }

    const characterId = req.nextUrl.searchParams.get('character_id');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '12');

    // データクエリはサービスロールキーで RLS をバイパス（auth.getUser()で認証済みのため安全）
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: dbUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ images: [] });
    }

    // Step 1: ユーザーの全会話を取得（duo含む）
    let convQuery = admin
      .from('conversations')
      .select('id, character_id')
      .eq('user_id', dbUser.id);

    if (characterId) {
      convQuery = convQuery.eq('character_id', characterId);
    }

    const { data: conversations } = await convQuery;
    if (!conversations || conversations.length === 0) {
      return Response.json({ images: [] });
    }

    const convMap = new Map(conversations.map(c => [c.id, c.character_id]));
    const convIds = conversations.map(c => c.id);

    // Step 2: 画像付きメッセージを取得
    const { data: messages } = await admin
      .from('messages')
      .select('id, image_url, created_at, conversation_id, is_favorite')
      .in('conversation_id', convIds)
      .eq('role', 'assistant')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    const images = (messages || []).map(m => ({
      id: m.id,
      url: m.image_url as string,
      created_at: m.created_at,
      character_id: convMap.get(m.conversation_id) ?? '',
      is_favorite: m.is_favorite ?? false,
    })).filter(img => img.character_id && img.url);

    return Response.json({ images });
  } catch (error) {
    console.error('images API error:', error);
    return Response.json({ error: 'Failed to load images' }, { status: 500 });
  }
}
