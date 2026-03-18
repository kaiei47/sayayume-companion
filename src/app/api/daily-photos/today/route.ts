import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// 認証不要のpublicエンドポイント — ゲストも含む全ユーザーが閲覧可能
export const revalidate = 60; // 1分キャッシュ

export async function GET(_req: NextRequest) {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // JST today
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(Date.now() + jstOffset);
    const today = jstDate.toISOString().split('T')[0];

    const { data: photos, error } = await supabase
      .from('daily_photos')
      .select('id, slot, character_id, image_url, caption, created_at')
      .eq('photo_date', today)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('daily_photos fetch error:', error);
      return NextResponse.json({ photos: [] });
    }

    return NextResponse.json({ photos: photos ?? [] }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('daily-photos/today error:', err);
    return NextResponse.json({ photos: [] });
  }
}
