import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getStory, STORIES } from '@/lib/stories';
import { getAllIntimacy, getLevelInfo } from '@/lib/intimacy';
import { PLANS } from '@/lib/plans';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/story/sessions - ストーリー一覧 + セッション情報を取得
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ error: 'user_not_found' }, { status: 404 });
    }

    // ユーザーのプランを取得
    const adminDb = getSupabaseAdmin();
    const { data: sub } = await adminDb
      .from('subscriptions')
      .select('plan')
      .eq('user_id', dbUser.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const plan = (sub?.plan || 'free') as keyof typeof PLANS;
    const maxDifficulty = PLANS[plan]?.limits?.maxStoryDifficulty || 1;

    // 全キャラの親密度を取得
    const intimacy = await getAllIntimacy(supabase, dbUser.id);
    const sayaLevel = intimacy.saya?.intimacy_level || 1;
    const yumeLevel = intimacy.yume?.intimacy_level || 1;
    const minLevel = Math.min(sayaLevel, yumeLevel);

    // 既存のストーリーセッションを取得
    const { data: sessions } = await adminDb
      .from('story_sessions')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('updated_at', { ascending: false });

    // ストーリー一覧を組み立て
    const stories = STORIES.map(story => {
      const charLevel = story.character === 'yume' ? yumeLevel :
                         story.character === 'duo' ? minLevel : sayaLevel;
      const isLocked = story.requiredIntimacy > charLevel || story.difficulty > maxDifficulty;
      const lockReason = story.difficulty > maxDifficulty ? 'plan' :
                         story.requiredIntimacy > charLevel ? 'intimacy' : null;

      const session = sessions?.find(s => s.story_id === story.id && s.status !== 'abandoned');
      const completedMissions = session?.completed_missions || [];
      const isCompleted = session?.status === 'completed';

      return {
        ...story,
        isLocked,
        lockReason,
        currentIntimacyLevel: charLevel,
        session: session ? {
          id: session.id,
          status: session.status,
          completedMissions,
          totalMissions: story.missions.length,
          startedAt: session.created_at,
        } : null,
        isCompleted,
      };
    });

    return Response.json({ stories, plan, intimacy: { saya: sayaLevel, yume: yumeLevel } });
  } catch (error) {
    console.error('Story sessions API error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/story/sessions - 新しいストーリーセッションを開始
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { story_id } = await req.json();
    const story = getStory(story_id);
    if (!story) {
      return Response.json({ error: 'story_not_found' }, { status: 404 });
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ error: 'user_not_found' }, { status: 404 });
    }

    const adminDb = getSupabaseAdmin();

    // 既存の進行中セッションがあれば abandoned にする
    await adminDb
      .from('story_sessions')
      .update({ status: 'abandoned', updated_at: new Date().toISOString() })
      .eq('user_id', dbUser.id)
      .eq('story_id', story_id)
      .eq('status', 'in_progress');

    // 新しいセッションを作成
    const { data: session, error } = await adminDb
      .from('story_sessions')
      .insert({
        user_id: dbUser.id,
        story_id,
        character_id: story.character,
        status: 'in_progress',
        completed_missions: [],
        conversation_history: [],
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ session });
  } catch (error) {
    console.error('Story session create error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
