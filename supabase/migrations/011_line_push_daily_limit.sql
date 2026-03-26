-- LINE通知 1日2通制限用カラム追加
ALTER TABLE line_users
  ADD COLUMN IF NOT EXISTS push_count_today INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS push_date_jst DATE;
