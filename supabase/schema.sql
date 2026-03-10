-- さやゆめ AI Companion - Database Schema
-- Supabase PostgreSQL

-- ===== ユーザー管理 =====

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'ゲスト',
  email TEXT UNIQUE,
  avatar_url TEXT,
  locale TEXT DEFAULT 'ja',
  is_premium BOOLEAN DEFAULT FALSE,
  is_nsfw_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_character TEXT DEFAULT 'saya',
  chat_style TEXT DEFAULT 'casual',
  tts_enabled BOOLEAN DEFAULT FALSE,
  tts_auto_play BOOLEAN DEFAULT FALSE,
  image_quality TEXT DEFAULT '2k',
  nsfw_level INT DEFAULT 0,
  notification_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== キャラクター =====

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  personality JSONB NOT NULL DEFAULT '{}',
  system_prompt TEXT NOT NULL DEFAULT '',
  voice_id TEXT,
  base_image_url TEXT,
  image_prompt_template TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE character_moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id TEXT REFERENCES characters(id),
  mood TEXT NOT NULL,
  system_prompt_modifier TEXT NOT NULL,
  image_prompt_modifier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 会話 =====

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT REFERENCES characters(id),
  title TEXT,
  message_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  mood TEXT DEFAULT 'neutral',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  image_url TEXT,
  audio_url TEXT,
  token_count_input INT DEFAULT 0,
  token_count_output INT DEFAULT 0,
  model_used TEXT,
  is_nsfw BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  message_range_start UUID REFERENCES messages(id),
  message_range_end UUID REFERENCES messages(id),
  token_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 生成画像 =====

CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT REFERENCES characters(id),
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INT,
  height INT,
  model TEXT DEFAULT 'gemini-3-pro',
  cost_usd DECIMAL(6,4),
  is_nsfw BOOLEAN DEFAULT FALSE,
  is_ppv BOOLEAN DEFAULT FALSE,
  ppv_price DECIMAL(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 課金 =====

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'basic', 'premium', 'vip')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  payment_provider TEXT,
  external_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  total_purchased INT DEFAULT 0,
  total_consumed INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'purchase', 'subscription_grant', 'chat', 'image_gen', 'tts', 'ppv_unlock', 'refund'
  )),
  description TEXT,
  reference_id UUID,
  balance_after INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('token_pack', 'ppv_image', 'ppv_set', 'custom_request')),
  item_id UUID,
  amount_usd DECIMAL(8,2) NOT NULL,
  payment_provider TEXT,
  external_payment_id TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== インデックス =====

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_token_transactions_user ON token_transactions(user_id, created_at DESC);
CREATE INDEX idx_generated_images_user ON generated_images(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);

-- ===== RLS (Row Level Security) =====

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage own conversations" ON conversations
  FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage own messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Users can view own images" ON generated_images
  FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own token balance" ON token_balances
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own transactions" ON token_transactions
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- キャラクターは誰でも閲覧可能
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view characters" ON characters FOR SELECT USING (true);
ALTER TABLE character_moods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view moods" ON character_moods FOR SELECT USING (true);

-- ===== 初期データ =====

INSERT INTO characters (id, name, name_ja, personality, system_prompt) VALUES
('saya', 'Saya', 'さや', '{"type": "genki", "tone": "casual"}', ''),
('yume', 'Yume', 'ゆめ', '{"type": "gentle", "tone": "polite"}', '');

-- ===== トリガー: 新規ユーザー作成時に関連テーブルも初期化 =====

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'ゲスト'), NEW.email);

  INSERT INTO public.user_preferences (user_id)
  VALUES ((SELECT id FROM public.users WHERE auth_id = NEW.id));

  INSERT INTO public.token_balances (user_id, balance)
  VALUES ((SELECT id FROM public.users WHERE auth_id = NEW.id), 100);

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES ((SELECT id FROM public.users WHERE auth_id = NEW.id), 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
