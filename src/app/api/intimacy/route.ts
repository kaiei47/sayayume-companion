import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllIntimacy, getLevelInfo, getLevelProgress, INTIMACY_LEVELS } from '@/lib/intimacy';

/**
 * GET /api/intimacy - ユーザーの全キャラ親密度を取得
 * フロントエンドでキャラ一覧のソート・レベル表示に使用
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // ゲスト: デフォルト値を返す
      return Response.json({
        intimacy: {
          saya: { level: 1, points: 0, progress: 0, levelInfo: INTIMACY_LEVELS[0], totalMessages: 0 },
          yume: { level: 1, points: 0, progress: 0, levelInfo: INTIMACY_LEVELS[0], totalMessages: 0 },
        },
      });
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return Response.json({ intimacy: {} });
    }

    const rawIntimacy = await getAllIntimacy(supabase, dbUser.id);

    // フロントエンド用にフォーマット
    const intimacy: Record<string, {
      level: number;
      points: number;
      progress: number;
      levelInfo: typeof INTIMACY_LEVELS[0];
      totalMessages: number;
      lastInteractionAt: string | null;
    }> = {};

    for (const [charId, data] of Object.entries(rawIntimacy)) {
      const levelInfo = getLevelInfo(data.intimacy_level);
      intimacy[charId] = {
        level: data.intimacy_level,
        points: data.affection_points,
        progress: getLevelProgress(data.affection_points, data.intimacy_level),
        levelInfo,
        totalMessages: data.total_messages,
        lastInteractionAt: data.last_interaction_at,
      };
    }

    // さや・ゆめがない場合はデフォルト値で埋める
    for (const charId of ['saya', 'yume']) {
      if (!intimacy[charId]) {
        intimacy[charId] = {
          level: 1,
          points: 0,
          progress: 0,
          levelInfo: INTIMACY_LEVELS[0],
          totalMessages: 0,
          lastInteractionAt: null,
        };
      }
    }

    return Response.json({ intimacy });
  } catch (error) {
    console.error('Intimacy API error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
