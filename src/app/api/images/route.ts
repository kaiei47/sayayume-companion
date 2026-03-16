import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ images: [] });
    }

    const characterId = req.nextUrl.searchParams.get('character_id');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '12');

    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ images: [] });
    }

    // Step 1: ユーザーの会話IDを全取得（duo含む全キャラ）
    let convQuery = supabase
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

    // Step 2: その会話IDの中から image_url があるメッセージを取得
    const { data: messages } = await supabase
      .from('messages')
      .select('id, image_url, created_at, conversation_id')
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
    })).filter(img => img.character_id && img.url);

    return Response.json({ images });
  } catch (error) {
    console.error('images API error:', error);
    return Response.json({ error: 'Failed to load images' }, { status: 500 });
  }
}
