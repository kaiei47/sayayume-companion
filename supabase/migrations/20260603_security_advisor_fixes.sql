-- Migration: Supabase Security Advisor 修正 (2026-06-03)
-- 対応するアドバイザー指摘:
--   [ERROR] rls_disabled_in_public         : guest_events / line_users / conversation_summaries
--   [WARN]  function_search_path_mutable   : handle_new_user() / init_character_intimacy()
--
-- 設計方針:
--   - guest_events / conversation_summaries はサーバー(service_role)経由のみ
--     → RLS有効化のみ(service_roleはRLSをバイパスするため壊れない)。ポリシー不要。
--   - line_users はブラウザ認証クライアントから自分の行をSELECTする(settings / chat page)
--     → RLS有効化 + 自分の行のSELECTポリシー。書き込みはAPI route(service_role)なので不要。
--   - 関数は本体がすべて public. 修飾済み → search_path='' で最も安全に警告解消。
-- 冪等(再実行可能)。

-- ===== 1. RLS有効化(ERROR解消) =====
ALTER TABLE public.guest_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_users              ENABLE ROW LEVEL SECURITY;

-- ===== 2. line_users: 認証ユーザーが自分の連携行のみ閲覧可 =====
DROP POLICY IF EXISTS "Users can view own line link" ON public.line_users;
CREATE POLICY "Users can view own line link" ON public.line_users
  FOR SELECT
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- ===== 3. 関数 search_path 固定(WARN解消) =====
-- 本体は public. 修飾済みのため空 search_path で動作・最も安全
ALTER FUNCTION public.handle_new_user()         SET search_path = '';
ALTER FUNCTION public.init_character_intimacy() SET search_path = '';
