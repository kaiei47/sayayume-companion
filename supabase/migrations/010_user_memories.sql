-- クロスセッションユーザーメモリテーブル
-- さや/ゆめがユーザーの情報を会話をまたいで記憶するための永続ストア

CREATE TABLE user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL DEFAULT 'global', -- 'saya' | 'yume' | 'global'（両キャラ共通）
  category TEXT NOT NULL CHECK (category IN ('profile', 'preference', 'episode', 'relationship')),
  key TEXT NOT NULL,                           -- 'job', 'hobby', 'recent_worry_1234567890' 等
  value TEXT NOT NULL CHECK (char_length(value) <= 200),
  emotional_weight SMALLINT DEFAULT 3 CHECK (emotional_weight BETWEEN 1 AND 10), -- 高いほど優先引用
  follow_up_date TIMESTAMPTZ,                  -- 悩み系: 次回確認期限
  last_referenced_at TIMESTAMPTZ,              -- 直近引用日時（連続引用防止）
  needs_followup BOOLEAN NOT NULL DEFAULT false,
  confidence SMALLINT DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 同一ユーザー・キャラ・キーは1レコードに上書き（episodeはkeyにタイムスタンプを付与して追記）
  UNIQUE(user_id, character_id, key)
);

CREATE INDEX idx_user_memories_lookup
  ON user_memories(user_id, character_id, category);

CREATE INDEX idx_user_memories_weight
  ON user_memories(user_id, emotional_weight DESC);

CREATE INDEX idx_user_memories_followup
  ON user_memories(follow_up_date)
  WHERE follow_up_date IS NOT NULL AND needs_followup = true;

ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のメモリを閲覧・削除できる（設定画面から）
CREATE POLICY "Users can view own memories" ON user_memories
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can delete own memories" ON user_memories
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- INSERT/UPDATE はサービスロール（APIサーバー）のみ
-- chat/route.ts は SUPABASE_SERVICE_ROLE_KEY を使うため問題なし

COMMENT ON TABLE user_memories IS
  'クロスセッションユーザーメモリ。会話から自動抽出されたユーザー情報を永続保存する。';
COMMENT ON COLUMN user_memories.character_id IS
  'saya | yume | global（全キャラ共通情報）';
COMMENT ON COLUMN user_memories.emotional_weight IS
  '感情的重要度 1=低 10=高。高いほど優先的にプロンプトへ注入される';
COMMENT ON COLUMN user_memories.needs_followup IS
  'trueの場合、次回の会話で確認する（悩み・未解決イベント）';
