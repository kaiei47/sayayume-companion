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

  // 抽出: 指定した会話からメモリを抽出して保存（チャット完了後にフロントから呼ぶ）
  const body = await req.json().catch(() => ({}));
  const { character_id, conversation_id } = body as { character_id?: string; conversation_id?: string };
  if (!character_id) return Response.json({ ok: false, error: 'character_id required' }, { status: 400 });

  // 会話のメッセージを取得
  let convId = conversation_id;
  if (!convId) {
    const { data: conv } = await supabase
      .from('conversations').select('id')
      .eq('user_id', dbUser.id).eq('character_id', character_id)
      .order('last_message_at', { ascending: false }).limit(1).single();
    convId = conv?.id;
  }
  if (!convId) return Response.json({ ok: false, error: 'No conversation found' });

  const { data: msgs } = await supabase
    .from('messages').select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false }).limit(20);

  const messages = (msgs || []).reverse();
  if (messages.length < 2) return Response.json({ ok: false, saved: 0 });

  const { extractMemoriesFromMessages, saveMemoriesToDB } = await import('@/lib/user-memory');
  const CHAR_NAMES: Record<string, string> = { saya: 'さや', yume: 'ゆめ', duo: 'さや・ゆめ' };
  const charName = CHAR_NAMES[character_id] || 'キャラ';
  const extracted = await extractMemoriesFromMessages(messages, charName);

  if (extracted.length > 0) {
    await saveMemoriesToDB(supabase, dbUser.id, character_id, extracted, convId);
  }
  return Response.json({ ok: true, saved: extracted.length });

  // デバッグ用テスト保存は searchParams で分岐
  // (test=1 は上で処理済み)
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
