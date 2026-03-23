-- ストーリーモード: セッション管理テーブル
CREATE TABLE IF NOT EXISTS story_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  completed_missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_story_sessions_user_id ON story_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_sessions_story_id ON story_sessions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_sessions_status ON story_sessions(status);

-- RLS有効化
ALTER TABLE story_sessions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のセッションのみ参照可能
CREATE POLICY "Users can view own story sessions"
  ON story_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- INSERT/UPDATE/DELETEはサービスロールのみ
CREATE POLICY "Service role can manage story sessions"
  ON story_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- サービスロールにフルアクセス
ALTER TABLE story_sessions FORCE ROW LEVEL SECURITY;
