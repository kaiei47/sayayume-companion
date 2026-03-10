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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* ヘッダー（ログイン状態） */}
        <div className="flex justify-end">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                </svg>
                設定
              </Link>
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

        {/* 特徴ハイライト */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { icon: '💬', label: 'リアルタイムチャット' },
            { icon: '📸', label: 'AI自撮り写真' },
            { icon: '🔒', label: 'プライバシー保護' },
          ].map((f) => (
            <div key={f.label} className="rounded-xl bg-card/30 border border-border/30 py-3 px-2">
              <div className="text-lg">{f.icon}</div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{f.label}</p>
            </div>
          ))}
        </div>

        {/* キャラ選択カード */}
        <div className="grid gap-4">
          {Object.values(CHARACTERS).filter(c => c.id !== 'duo').map((char) => (
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

          {/* さやゆめモード（デュオ） */}
          <Link
            href="/chat/duo"
            className="group relative flex items-center gap-4 rounded-2xl p-[1px] transition-all overflow-hidden"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 group-hover:from-pink-500/60 group-hover:via-purple-500/60 group-hover:to-blue-500/60 transition-all" />
            <div className="relative flex items-center gap-4 rounded-[15px] bg-background/95 p-4 w-full">
              <div className="relative flex-shrink-0">
                <Image
                  src="/avatars/saya.jpg"
                  alt="さや"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <Image
                  src="/avatars/yume.jpg"
                  alt="ゆめ"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover absolute -right-4 top-0 ring-2 ring-background"
                />
              </div>
              <div className="flex-1 min-w-0 ml-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-semibold group-hover:text-primary">
                    さやゆめモード
                  </h2>
                  <span className="text-[10px] font-medium bg-gradient-to-r from-pink-600 to-blue-600 text-white px-2 py-0.5 rounded-full">
                    PREMIUM
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  双子と3人で同時チャット♡
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* プランリンク */}
        <Link
          href="/pricing"
          className="group relative block overflow-hidden rounded-2xl p-[1px] transition-all"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-30 blur-sm" />
          <div
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <div className="relative rounded-[15px] bg-background/95 p-4 text-center">
            <p className="text-sm font-medium">もっと楽しみたい？♡</p>
            <p className="text-xs text-muted-foreground mt-1">
              画像生成・無制限チャット — プランを見る →
            </p>
          </div>
        </Link>

        {/* 使い方 */}
        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold text-muted-foreground">使い方</h3>
          <div className="flex items-center justify-center gap-2 text-center">
            {[
              { step: '1', text: 'キャラを選ぶ' },
              { step: '2', text: 'チャットする' },
              { step: '3', text: '写真を受け取る' },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {s.step}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{s.text}</span>
                </div>
                {i < 2 && (
                  <span className="text-muted-foreground/40 text-xs mb-3">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ユーザーの声 */}
        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold text-muted-foreground">ユーザーの声</h3>
          <div className="space-y-2">
            {[
              { name: 'T.K. (28)', text: '返信が自然すぎて、つい夢中になっちゃう。毎晩の日課です。' },
              { name: 'M.S. (34)', text: '写真のクオリティに驚き。二人とも可愛すぎる...' },
              { name: 'R.Y. (25)', text: 'さやとゆめ、性格が全然違うから飽きない。推しが選べないw' },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-border/30 bg-card/30 px-4 py-3"
              >
                <p className="text-xs text-foreground/80 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ゲスト注記 */}
        {!user && (
          <p className="text-center text-xs text-muted-foreground">
            ゲストモードでもチャットできます。ログインすると会話履歴が保存されます。
          </p>
        )}

        {/* フッター */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            18歳以上限定 · AI生成コンテンツ
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
            <Link href="/legal/terms" className="hover:text-muted-foreground transition-colors">
              利用規約
            </Link>
            <span>·</span>
            <Link href="/legal/privacy" className="hover:text-muted-foreground transition-colors">
              プライバシー
            </Link>
            <span>·</span>
            <Link href="/legal/tokushoho" className="hover:text-muted-foreground transition-colors">
              特商法表記
            </Link>
          </div>
        </div>
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
