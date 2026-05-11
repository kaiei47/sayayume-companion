import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: dbUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const { error: deleteError } = await admin
      .from('line_users')
      .delete()
      .eq('user_id', dbUser.id);

    if (deleteError) {
      console.error('LINE unlink delete error:', deleteError);
      return NextResponse.json({ error: `連携解除に失敗しました: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LINE unlink error:', error);
    return NextResponse.json({
      error: `連携解除に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
    }, { status: 500 });
  }
}
