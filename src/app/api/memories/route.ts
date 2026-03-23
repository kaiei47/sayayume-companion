/**
 * ユーザーメモリ管理API
 * GET  /api/memories        - ユーザーの記憶一覧取得（設定画面用）
 * DELETE /api/memories?id=  - 個別削除
 * DELETE /api/memories?all=1 - 全削除
 */

import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: dbUser } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single();
  if (!dbUser) return Response.json({ error: 'User not found' }, { status: 404 });

  const { data: memories } = await supabase
    .from('user_memories')
    .select('id, character_id, category, key, value, emotional_weight, needs_followup, updated_at')
    .eq('user_id', dbUser.id)
    .order('emotional_weight', { ascending: false });

  return Response.json({ memories: memories || [] });
}

export async function DELETE(req: NextRequest) {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: dbUser } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single();
  if (!dbUser) return Response.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all');
  const id = searchParams.get('id');

  if (all === '1') {
    await supabase.from('user_memories').delete().eq('user_id', dbUser.id);
    return Response.json({ deleted: 'all' });
  }

  if (id) {
    await supabase.from('user_memories').delete()
      .eq('id', id).eq('user_id', dbUser.id);
    return Response.json({ deleted: id });
  }

  return Response.json({ error: 'Specify id or all=1' }, { status: 400 });
}
