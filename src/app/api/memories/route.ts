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

/**
 * POST /api/memories?test=1 - テスト保存（デバッグ用）
 * POST /api/memories?extract=1 - 直近の会話からメモリ抽出を手動実行
 */
export async function POST(req: NextRequest) {
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

  // テスト保存: DBへの書き込みが機能するか確認
  if (searchParams.get('test') === '1') {
    const { error } = await supabase.from('user_memories').upsert({
      user_id: dbUser.id,
      character_id: 'global',
      category: 'profile',
      key: 'debug_test',
      value: 'デバッグテスト用メモリ',
      emotional_weight: 3,
      needs_followup: false,
      confidence: 3,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,character_id,key' });

    if (error) return Response.json({ ok: false, error: error.message });
    return Response.json({ ok: true, message: 'テスト保存成功' });
  }

  // 手動抽出: 直近の会話からメモリを抽出して保存
  if (searchParams.get('extract') === '1') {
    const { character_id } = await req.json().catch(() => ({ character_id: 'saya' }));

    // 直近の会話を取得
    const { data: conv } = await supabase
      .from('conversations').select('id')
      .eq('user_id', dbUser.id).eq('character_id', character_id)
      .order('last_message_at', { ascending: false }).limit(1).single();

    if (!conv) return Response.json({ ok: false, error: 'No conversation found' });

    const { data: msgs } = await supabase
      .from('messages').select('role, content')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false }).limit(20);

    const messages = (msgs || []).reverse();
    if (messages.length < 2) return Response.json({ ok: false, error: 'Not enough messages', count: messages.length });

    const { extractMemoriesFromMessages, saveMemoriesToDB } = await import('@/lib/user-memory');
    const charName = character_id === 'yume' ? 'ゆめ' : 'さや';
    const extracted = await extractMemoriesFromMessages(messages, charName);

    if (extracted.length === 0) return Response.json({ ok: false, error: 'Gemini returned empty', messages: messages.length });

    await saveMemoriesToDB(supabase, dbUser.id, character_id, extracted, conv.id);
    return Response.json({ ok: true, extracted: extracted.length, items: extracted });
  }

  return Response.json({ error: 'Specify ?test=1 or ?extract=1' }, { status: 400 });
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
