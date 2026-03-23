-- LINE連携ユーザーテーブル
CREATE TABLE IF NOT EXISTS line_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,
  character_id TEXT NOT NULL DEFAULT 'saya',
  display_name TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_users_line_user_id ON line_users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_users_user_id ON line_users(user_id);
