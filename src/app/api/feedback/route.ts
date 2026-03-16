import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

// POST: フィードバックを保存
// テーブル作成SQL:
//   create table feedback (
//     id uuid primary key default gen_random_uuid(),
//     user_id uuid references users(id),
//     message text not null,
//     category text default 'general',
//     created_at timestamptz default now()
//   );
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { message, category = 'general' } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'メッセージは1000文字以内で入力してください' }, { status: 400 });
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let userId: string | null = null;
    if (user) {
      const { data: dbUser } = await admin
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      userId = dbUser?.id ?? null;
    }

    const { error } = await admin
      .from('feedback')
      .insert({ user_id: userId, message: message.trim(), category });

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json({ error: `保存に失敗しました: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 });
  }
}
