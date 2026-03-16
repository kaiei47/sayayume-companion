import { createClient } from '@supabase/supabase-js';

// 認証不要のpublicエンドポイント — LP用ショーケース画像
export const revalidate = 300; // 5分キャッシュ

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: messages } = await supabase
      .from('messages')
      .select('id, image_url, created_at, conversation_id, conversations!inner(character_id)')
      .eq('role', 'assistant')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    const images = (messages || [])
      .map((m) => {
        const conv = m.conversations as { character_id?: string } | null;
        return {
          id: m.id,
          url: m.image_url as string,
          character_id: conv?.character_id ?? '',
          created_at: m.created_at,
        };
      })
      .filter(img => img.character_id && img.url);

    return Response.json({ images }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return Response.json({ images: [] });
  }
}
