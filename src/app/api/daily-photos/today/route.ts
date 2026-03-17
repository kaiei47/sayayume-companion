import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({ photos: photos ?? [] });
  } catch (err) {
    console.error('daily-photos/today error:', err);
    return NextResponse.json({ photos: [] });
  }
}
