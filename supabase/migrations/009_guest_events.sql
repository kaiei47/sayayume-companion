-- Migration 009: Guest events tracking
-- ゲストユーザーのチャット履歴を管理者分析用に保存する
-- IPは16桁ハッシュで匿名化

CREATE TABLE guest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,          -- guest-${timestamp}
  character_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  assistant_response TEXT,
  ip_hash TEXT,                      -- SHA-256 first 16 chars (privacy)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guest_events_created ON guest_events(created_at DESC);
CREATE INDEX idx_guest_events_session  ON guest_events(session_id, created_at ASC);

-- 管理者のみ閲覧可（RLSは無効にしてservice_roleで操作）
-- service_role経由のみアクセス可なのでRLS不要
