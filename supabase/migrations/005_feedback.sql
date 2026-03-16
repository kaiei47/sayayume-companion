-- ユーザーフィードバックテーブル
-- /api/feedback から書き込まれる。管理画面またはSupabaseダッシュボードで確認。

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  message text not null check (char_length(message) <= 1000),
  category text not null default 'general',
  created_at timestamptz not null default now()
);

-- 管理者のみ参照可（RLSでユーザーは自分のフィードバックのみ）
alter table feedback enable row level security;

-- サービスロールは全件アクセス可
create policy "service_role_all" on feedback
  for all using (auth.role() = 'service_role');

-- ユーザーは自分のフィードバックのみ参照
create policy "users_read_own" on feedback
  for select using (
    user_id in (
      select id from users where auth_id = auth.uid()
    )
  );
