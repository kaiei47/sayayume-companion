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

    // キャラのアシスタントメッセージのうち image_url があるものを取得
    let query = supabase
      .from('messages')
      .select('id, image_url, created_at, conversation_id, conversations!inner(character_id, user_id)')
      .eq('conversations.user_id', dbUser.id)
      .eq('role', 'assistant')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (characterId) {
      query = query.eq('conversations.character_id', characterId);
    }

    const { data: messages } = await query;

    const images = (messages || []).map((m) => ({
      id: m.id,
      url: m.image_url,
      created_at: m.created_at,
      character_id: (m.conversations as unknown as { character_id: string; user_id: string }).character_id,
    }));

    return Response.json({ images });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
