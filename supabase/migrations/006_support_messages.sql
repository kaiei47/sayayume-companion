-- 双方向サポートメッセージ（ユーザー ↔ 管理者）
-- ユーザーがマイページから送信、管理者が /admin から返信

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  message text not null check (char_length(message) <= 2000),
  read_at timestamptz,  -- adminメッセージ: userが読んだ時刻 / userメッセージ: adminが読んだ時刻
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_user_id
  on support_messages(user_id, created_at desc);

alter table support_messages enable row level security;

-- サービスロールは全件アクセス可
create policy "service_role_all" on support_messages
  for all using (auth.role() = 'service_role');

-- ユーザーは自分のメッセージのみ参照可
create policy "users_read_own" on support_messages
  for select using (
    user_id in (
      select id from users where auth_id = auth.uid()
    )
  );
