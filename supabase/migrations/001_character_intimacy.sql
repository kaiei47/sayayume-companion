-- ===== 親密度システム (ときメモ風) =====

CREATE TABLE character_intimacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id),
  intimacy_level INT NOT NULL DEFAULT 1 CHECK (intimacy_level BETWEEN 1 AND 5),
  affection_points INT NOT NULL DEFAULT 0,
  total_messages INT NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, character_id)
);

-- ポイント変動履歴（ゲーム性の透明化 + デバッグ用）
CREATE TABLE intimacy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id),
  event_type TEXT NOT NULL,
  points_delta INT NOT NULL,
  points_after INT NOT NULL,
  level_after INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intimacy_user_char ON character_intimacy(user_id, character_id);
CREATE INDEX idx_intimacy_user_level ON character_intimacy(user_id, intimacy_level DESC);
CREATE INDEX idx_intimacy_events_user ON intimacy_events(user_id, created_at DESC);

-- RLS
ALTER TABLE character_intimacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE intimacy_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intimacy" ON character_intimacy
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own intimacy events" ON intimacy_events
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- サーバーサイド（service role）からの操作を許可
CREATE POLICY "Service can manage intimacy" ON character_intimacy
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage intimacy events" ON intimacy_events
  FOR ALL USING (true) WITH CHECK (true);

-- 新規ユーザー作成時にさや・ゆめの親密度レコードを初期化
CREATE OR REPLACE FUNCTION init_character_intimacy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.character_intimacy (user_id, character_id)
  VALUES (NEW.id, 'saya'), (NEW.id, 'yume');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_init_intimacy
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION init_character_intimacy();
