-- LINE通知スケジューリング用カラム追加
ALTER TABLE line_users
  ADD COLUMN IF NOT EXISTS next_push_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_push_at TIMESTAMPTZ;

-- 既存ユーザーの初回通知を1〜4時間後にランダム設定
UPDATE line_users
SET next_push_at = NOW() + (random() * interval '3 hours') + interval '1 hour'
WHERE push_enabled = true
  AND user_id IS NOT NULL
  AND next_push_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_line_users_next_push_at ON line_users(next_push_at);
