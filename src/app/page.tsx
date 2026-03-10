'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CHARACTERS } from '@/lib/characters';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface LastMessage {
  content: string;
  created_at: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // 各キャラの最新メッセージを取得
        Object.keys(CHARACTERS).forEach(async (charId) => {
          try {
            const res = await fetch(`/api/conversations?character_id=${charId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.messages?.length > 0) {
                const last = data.messages[data.messages.length - 1];
                setLastMessages((prev) => ({
                  ...prev,
                  [charId]: { content: last.content, created_at: last.created_at },
                }));
              }
            }
          } catch {
            // 無視
          }
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
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
              className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all hover:border-primary/50 hover:bg-card overflow-hidden"
            >
              <div className="relative flex-shrink-0">
                <Image
                  src={char.avatarUrl}
                  alt={char.nameJa}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-semibold group-hover:text-primary">
                    {char.nameJa}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {char.name}
                    </span>
                  </h2>
                  {lastMessages[char.id] && (
                    <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                      {formatRelativeTime(lastMessages[char.id].created_at)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {lastMessages[char.id]
                    ? lastMessages[char.id].content
                    : char.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* プランリンク */}
        <Link
          href="/pricing"
          className="block rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 text-center transition-all hover:border-blue-500/50 hover:bg-blue-500/10"
        >
          <p className="text-sm font-medium">もっと楽しみたい？♡</p>
          <p className="text-xs text-muted-foreground mt-1">
            画像生成・無制限チャット — プランを見る →
          </p>
        </Link>

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

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
