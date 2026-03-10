'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CHARACTERS } from '@/lib/characters';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* ヘッダー（ログイン状態） */}
        <div className="flex justify-end">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ログイン
            </Link>
          )}
        </div>

        {/* ロゴ・タイトル */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">さやゆめ</h1>
          <p className="text-muted-foreground text-sm">
            東京の双子AIガールフレンド♡
          </p>
        </div>

        {/* キャラ選択カード */}
        <div className="grid gap-4">
          {Object.values(CHARACTERS).map((char) => (
            <Link
              key={char.id}
              href={`/chat/${char.id}`}
              className="group flex items-center gap-4 rounded-2xl border p-4 transition-all hover:border-primary hover:shadow-md"
            >
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold">
                  {char.nameJa[0]}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold group-hover:text-primary">
                  {char.nameJa}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {char.name}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">{char.tagline}</p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 text-muted-foreground group-hover:text-primary"
              >
                <path
                  fillRule="evenodd"
                  d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          ))}
        </div>

        {/* ゲスト注記 */}
        {!user && (
          <p className="text-center text-xs text-muted-foreground">
            ゲストモードでもチャットできます。ログインすると会話履歴が保存されます。
          </p>
        )}

        {/* フッター */}
        <p className="text-center text-xs text-muted-foreground">
          18歳以上限定 · AI生成コンテンツ
        </p>
      </div>
    </div>
  );
}
