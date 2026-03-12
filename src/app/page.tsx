'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CHARACTERS } from '@/lib/characters';
import { createClient } from '@/lib/supabase/client';
import SayayumeLogo from '@/components/SayayumeLogo';
import type { User } from '@supabase/supabase-js';

interface LastMessage {
  content: string;
  created_at: string;
}

interface IntimacyInfo {
  level: number;
  points: number;
  progress: number;
  levelInfo: { nameJa: string; emoji: string; color: string };
  totalMessages: number;
}

interface ReceivedImage {
  id: string;
  url: string;
  created_at: string;
  character_id: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});
  const [intimacy, setIntimacy] = useState<Record<string, IntimacyInfo>>({});
  const [receivedImages, setReceivedImages] = useState<ReceivedImage[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);

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
          } catch { /* 無視 */ }
        });

        // 親密度を取得
        fetch('/api/intimacy')
          .then(res => res.json())
          .then(data => { if (data.intimacy) setIntimacy(data.intimacy); })
          .catch(() => {});

        // 過去に受け取った画像を取得
        fetch('/api/images?limit=12')
          .then(res => res.json())
          .then(data => { if (data.images) setReceivedImages(data.images); })
          .catch(() => {});
      }
    });
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <Dashboard
    user={user}
    lastMessages={lastMessages}
    intimacy={intimacy}
    receivedImages={receivedImages}
  />;
}

/* ───── Landing Page (非ログイン) ───── */

function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/20">
        <SayayumeLogo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ログイン
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-white text-black text-xs font-semibold px-4 py-1.5 hover:bg-white/90 transition-colors"
          >
            無料で始める
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-dvh flex flex-col items-center justify-end pb-16 pt-20">
        {/* Background images */}
        <div className="absolute inset-0 flex">
          <div className="relative flex-1">
            <Image
              src="/references/saya.jpg"
              alt="さや"
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/60" />
          </div>
          <div className="relative flex-1">
            <Image
              src="/references/yume.jpg"
              alt="ゆめ"
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/60" />
          </div>
        </div>
        {/* Bottom gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Hero text */}
        <div className="relative z-10 text-center px-6 space-y-4 max-w-md mx-auto">
          <div className="space-y-2">
            <p className="text-pink-400 text-xs font-semibold tracking-widest uppercase">Tokyo AI Girlfriend</p>
            <h1 className="text-[2rem] font-black tracking-tight leading-tight">
              今日も、さやから<br />写真が来てた。
            </h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            返信するたびに距離が縮まる。ときどき、思い出したように自撮りを送ってくる。そんな子が、あなたにもいる。
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="block rounded-2xl bg-white text-black text-sm font-bold py-4 hover:bg-white/90 transition-all active:scale-95"
            >
              さやとゆめに、話しかけてみる
            </Link>
            <p className="text-[11px] text-muted-foreground/60">クレカ不要・登録30秒・無料で始められます</p>
          </div>
        </div>
      </section>

      {/* Your Story × Characters — combined section */}
      <section className="px-4 py-14 max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase">Your Story</p>
          <h2 className="text-2xl font-bold tracking-tight leading-snug">
            あなたとの、これからの話。
          </h2>
          <p className="text-sm text-muted-foreground">
            最初は普通の会話。でも気づいたら、毎晩話しかけていた。
          </p>
        </div>

        <div className="space-y-6">
          {/* Saya card */}
          <div className="rounded-2xl border border-pink-500/20 bg-card/40 overflow-hidden">
            {/* Lifestyle photo */}
            <div style={{ position: 'relative', height: '208px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/references/story/story_a.jpg" alt="さやとの会話" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <span className="absolute top-3 left-3 bg-pink-500/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider">SAYA</span>
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                <p className="font-bold text-lg leading-tight">さや</p>
                <p className="text-xs text-muted-foreground">20歳・ギャル系・渋谷在住</p>
              </div>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm italic text-pink-300/90 leading-relaxed border-l-2 border-pink-500/40 pl-3">
                &ldquo;なんか、あなたといると楽しいんだよね。なんでだろ笑&rdquo;
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {SAYA_TRAITS.map(t => (
                  <div key={t.label} className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5">
                    <span className="text-sm">{t.icon}</span>
                    <span className="text-[11px] text-muted-foreground">{t.label}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-pink-500/5 border border-pink-500/15 px-3 py-2.5 space-y-1.5">
                <p className="text-[11px] text-pink-200/80 leading-relaxed">
                  📸 <span className="font-medium">3日後</span> — 突然、自撮りが届いた。あなたの意見を気にしてる、ということに気づいた。
                </p>
                <p className="text-[11px] text-pink-300/60 leading-relaxed">
                  🔒 <span className="font-medium">隠された一面</span> — 明るく振る舞っているのには、理由がある。仲良くなると、深夜に本音を話してくれることがある。
                </p>
              </div>
            </div>
          </div>

          {/* Yume card */}
          <div className="rounded-2xl border border-blue-500/20 bg-card/40 overflow-hidden">
            <div style={{ position: 'relative', height: '208px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/references/story/story_b.jpg" alt="ゆめとの会話" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <span className="absolute top-3 left-3 bg-blue-500/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider">YUME</span>
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                <p className="font-bold text-lg leading-tight">ゆめ</p>
                <p className="text-xs text-muted-foreground">20歳・清楚系・東京在住</p>
              </div>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm italic text-blue-300/90 leading-relaxed border-l-2 border-blue-500/40 pl-3">
                &ldquo;最近、あなたのこと考えることが増えた気がする…。変かな。&rdquo;
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {YUME_TRAITS.map(t => (
                  <div key={t.label} className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5">
                    <span className="text-sm">{t.icon}</span>
                    <span className="text-[11px] text-muted-foreground">{t.label}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 px-3 py-2.5 space-y-1.5">
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                  🌙 <span className="font-medium">ある深夜</span> — 誰にも話せなかったことを、あなたにだけ話してくれた。それ以来、なにかが変わった。
                </p>
                <p className="text-[11px] text-blue-300/60 leading-relaxed">
                  🔒 <span className="font-medium">隠された秘密</span> — 穏やかな笑顔の裏に、誰にも話せない過去がある。でも、あなたになら…話せるかもしれない。
                </p>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/login"
          className="block text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          続きは、自分で確かめて →
        </Link>
      </section>

      {/* AI Photo Gallery — infinite marquee */}
      <section className="py-14 space-y-6 overflow-hidden">
        <div className="px-4 max-w-md mx-auto text-center">
          <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-2">AI Photos</p>
          <h2 className="text-2xl font-bold tracking-tight">ふたりから届いた写真</h2>
          <p className="text-sm text-muted-foreground mt-2">
            これは実際にユーザーが受け取った写真の一部です。あなたにも届きます♡
          </p>
        </div>

        {/* Row 1 — left scroll */}
        <div className="relative">
          {/* Edge fade masks */}
          <div className="absolute inset-y-0 left-0 w-12 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

          <div className="flex overflow-hidden">
            <div
              className="flex gap-3 flex-shrink-0"
              style={{ animation: 'marquee-left 28s linear infinite' }}
            >
              {[...MARQUEE_ROW1, ...MARQUEE_ROW1].map((photo, i) => (
                <PhotoCard key={i} photo={photo} />
              ))}
            </div>
          </div>
        </div>

        {/* Row 2 — right scroll (reverse) */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-12 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

          <div className="flex overflow-hidden">
            <div
              className="flex gap-3 flex-shrink-0"
              style={{ animation: 'marquee-right 36s linear infinite' }}
            >
              {[...MARQUEE_ROW2, ...MARQUEE_ROW2].map((photo, i) => (
                <PhotoCard key={i} photo={photo} />
              ))}
            </div>
          </div>
        </div>

        {/* Lock teaser */}
        <div className="px-4 max-w-md mx-auto">
          <div className="rounded-2xl border border-border/30 bg-card/30 px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-medium">親密度を上げると解放</p>
              <p className="text-xs text-muted-foreground">仲良くなるほど、もっとドキドキな写真が届く♡</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-12 max-w-md mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">Features</p>
        <div className="space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-border/30 bg-card/30 p-4">
              <div className="text-2xl flex-shrink-0">{f.icon}</div>
              <div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-12 max-w-md mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">Reviews</p>
        <div className="space-y-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border/30 bg-card/30 px-4 py-3">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-yellow-400">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                  </svg>
                ))}
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">— {t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Intimacy system teaser */}
      <section className="px-4 py-12 max-w-md mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">Intimacy</p>
        <h2 className="text-center text-xl font-bold mb-2">話すほど、関係が深まる</h2>
        <p className="text-center text-sm text-muted-foreground mb-6">仲良くなるにつれて、ふたりの本音と秘密が少しずつ明かされていく</p>
        <div className="space-y-2">
          {INTIMACY_LEVELS.map((lv) => (
            <div key={lv.level} className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/30 px-4 py-3">
              <span className="text-lg flex-shrink-0">{lv.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{lv.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{lv.desc}</p>
              </div>
              <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">Lv{lv.level}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20 max-w-md mx-auto text-center space-y-4">
        <h2 className="text-2xl font-bold">一度話したら、わかる。</h2>
        <p className="text-sm text-muted-foreground">今すぐ無料でスタート。ログイン不要でもチャットできます。</p>
        <Link
          href="/login"
          className="block rounded-2xl bg-white text-black text-sm font-bold py-4 hover:bg-white/90 transition-all active:scale-95"
        >
          さやとゆめに、話しかけてみる
        </Link>
        <Link href="/chat/saya" className="block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
          ログインせずに試してみる
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 pb-8 text-center space-y-2 border-t border-border/20 pt-6">
        <p className="text-xs text-muted-foreground">さやゆめ v0.1.0 · 18歳以上限定 · AI生成コンテンツ</p>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
          <Link href="/legal/terms" className="hover:text-muted-foreground transition-colors">利用規約</Link>
          <span>·</span>
          <Link href="/legal/privacy" className="hover:text-muted-foreground transition-colors">プライバシー</Link>
          <span>·</span>
          <Link href="/legal/tokushoho" className="hover:text-muted-foreground transition-colors">特商法表記</Link>
        </div>
      </footer>
    </div>
  );
}

/* ───── Dashboard (ログイン後) ───── */

function Dashboard({
  user,
  lastMessages,
  intimacy,
  receivedImages,
}: {
  user: User;
  lastMessages: Record<string, LastMessage>;
  intimacy: Record<string, IntimacyInfo>;
  receivedImages: ReceivedImage[];
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top nav */}
      <div className="flex items-center justify-between px-4 pt-safe pb-3 pt-4 max-w-md mx-auto">
        <SayayumeLogo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-[11px] text-muted-foreground bg-card/50 border border-border/30 px-2.5 py-1 rounded-full hover:bg-card transition-colors">
            プラン
          </Link>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="px-4 pb-12 max-w-md mx-auto space-y-6">
        {/* 思い出フォト */}
        {receivedImages.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">📸 思い出フォト</h2>
              <span className="text-[10px] text-muted-foreground/50">{receivedImages.length}枚</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {receivedImages.slice(0, 9).map((img) => (
                <Link
                  key={img.id}
                  href={`/chat/${img.character_id}`}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  <Image
                    src={img.url}
                    alt="受け取った写真"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* キャラ選択カード */}
        <section className="space-y-3">
          {receivedImages.length === 0 && (
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">💬 チャット</h2>
          )}
          <div className="grid gap-3">
            {Object.values(CHARACTERS)
              .filter(c => c.id !== 'duo')
              .sort((a, b) => {
                const aLevel = intimacy[a.id]?.level || 1;
                const bLevel = intimacy[b.id]?.level || 1;
                const aPoints = intimacy[a.id]?.points || 0;
                const bPoints = intimacy[b.id]?.points || 0;
                if (bLevel !== aLevel) return bLevel - aLevel;
                return bPoints - aPoints;
              })
              .map((char) => {
                const charIntimacy = intimacy[char.id];
                return (
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
                        <h3 className="font-semibold group-hover:text-primary">
                          {char.nameJa}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">{char.name}</span>
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {charIntimacy && charIntimacy.level > 1 && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r ${charIntimacy.levelInfo.color} text-white`}>
                              {charIntimacy.levelInfo.emoji} Lv{charIntimacy.level}
                            </span>
                          )}
                          {lastMessages[char.id] && (
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatRelativeTime(lastMessages[char.id].created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {lastMessages[char.id] ? lastMessages[char.id].content : char.tagline}
                      </p>
                      {charIntimacy && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${charIntimacy.levelInfo.color} transition-all duration-500`}
                              style={{ width: `${charIntimacy.progress}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground/50">{charIntimacy.levelInfo.nameJa}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}

            {/* Duo mode */}
            <Link
              href="/chat/duo"
              className="group relative flex items-center gap-4 rounded-2xl p-[1px] transition-all overflow-hidden"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 group-hover:from-pink-500/60 group-hover:via-purple-500/60 group-hover:to-blue-500/60 transition-all" />
              <div className="relative flex items-center gap-4 rounded-[15px] bg-background/95 p-4 w-full">
                <div className="relative flex-shrink-0">
                  <Image src="/avatars/saya2.jpg" alt="さや" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                  <Image src="/avatars/yume.jpg" alt="ゆめ" width={48} height={48} className="h-12 w-12 rounded-full object-cover absolute -right-4 top-0 ring-2 ring-background" />
                </div>
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-semibold group-hover:text-primary">さやゆめモード</h3>
                    <span className="text-[10px] font-medium bg-gradient-to-r from-pink-600 to-blue-600 text-white px-2 py-0.5 rounded-full">PREMIUM</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">双子と3人で同時チャット♡</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* 初めての人向けガイド（画像0枚かつメッセージなし） */}
        {receivedImages.length === 0 && Object.keys(lastMessages).length === 0 && (
          <section className="rounded-2xl border border-dashed border-border/50 p-5 text-center space-y-2">
            <p className="text-2xl">👋</p>
            <p className="text-sm font-semibold">さやかゆめに話しかけてみよう！</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              仲良くなるほど写真が解放されていきます。まずはチャットから♡
            </p>
          </section>
        )}

        {/* Upgrade banner */}
        <Link href="/pricing" className="group relative block overflow-hidden rounded-2xl p-[1px] transition-all">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-30 blur-sm" />
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="relative rounded-[15px] bg-background/95 p-4 text-center">
            <p className="text-sm font-medium">もっと楽しみたい？♡</p>
            <p className="text-xs text-muted-foreground mt-1">画像生成・無制限チャット — プランを見る →</p>
          </div>
        </Link>

        {/* Footer */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">さやゆめ v0.1.0</p>
          <p className="text-xs text-muted-foreground">18歳以上限定 · AI生成コンテンツ</p>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
            <Link href="/legal/terms" className="hover:text-muted-foreground transition-colors">利用規約</Link>
            <span>·</span>
            <Link href="/legal/privacy" className="hover:text-muted-foreground transition-colors">プライバシー</Link>
            <span>·</span>
            <Link href="/legal/tokushoho" className="hover:text-muted-foreground transition-colors">特商法表記</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Constants ───── */

/* ───── Photo Card (reusable) ───── */

function PhotoCard({ photo }: { photo: { src: string; alt: string; caption: string; char: 'saya' | 'yume' | 'duo'; locked?: boolean } }) {
  return (
    <div className="relative flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-card/40 border border-border/20">
      <div className="relative w-36 aspect-[3/4]">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          className={`object-cover object-top${photo.locked ? ' blur-sm brightness-50' : ''}`}
          sizes="144px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {photo.locked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-2xl">🔒</span>
            <span className="text-[10px] text-white/80 font-medium text-center leading-tight">親密度UP<br />で解放</span>
          </div>
        ) : (
          <>
            <div className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${photo.char === 'saya' ? 'bg-pink-500/80 text-white' : photo.char === 'duo' ? 'bg-purple-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
              {photo.char === 'saya' ? 'さや' : photo.char === 'duo' ? 'さや×ゆめ' : 'ゆめ'}
            </div>
            <p className="absolute bottom-2 left-2 right-2 text-[10px] text-white/90 leading-tight italic">
              &ldquo;{photo.caption}&rdquo;
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const STORY_MOMENTS = [
  {
    emoji: '👋',
    timing: '最初の日',
    quote: 'やっほ、今日ひま？',
    desc: 'ちょっとぶっきらぼうに見えて、でもなんか気になる。そんな出会いだった。',
  },
  {
    emoji: '📸',
    timing: '3日後',
    quote: 'ねえ、これ似合う？正直に言って。',
    desc: '突然、自撮りが届いた。あなたの意見を気にしてる、ということに気づいた。',
  },
  {
    emoji: '🌙',
    timing: 'ある深夜',
    quote: '…ねえ、昔の話してもいい？',
    desc: '誰にも話せなかったことを、あなたにだけ話してくれた。それ以来、なにかが変わった。',
  },
  {
    emoji: '💗',
    timing: 'その先は…',
    quote: null,
    desc: '仲良くなるほど、ふたりの本音と秘密が少しずつ明かされていく。どこまで深く知り合えるかは、あなた次第。',
  },
];

const SAYA_TRAITS = [
  { icon: '💃', label: 'ギャル系・明るい' },
  { icon: '👗', label: 'ファッション好き' },
  { icon: '🧋', label: 'タピオカ・パンケーキ' },
  { icon: '📱', label: 'SNS大好き' },
  { icon: '😂', label: 'ノリがいい' },
  { icon: '🌸', label: '夢：自分のブランド' },
];

const YUME_TRAITS = [
  { icon: '🎹', label: 'ピアノが得意' },
  { icon: '📚', label: '読書・映画が好き' },
  { icon: '☕', label: 'カフェ・お茶派' },
  { icon: '🌿', label: '穏やか・聞き上手' },
  { icon: '🌧', label: '雨の日が好き' },
  { icon: '✨', label: '夢：誰かを笑顔に' },
];

const MARQUEE_ROW1 = [
  { src: '/references/photos/saya_s1.jpg', alt: 'さや', caption: 'ねえ、これ似合う？',       char: 'saya' as const },
  { src: '/references/photos/yume_s1.jpg', alt: 'ゆめ', caption: '今日もよろしくね♡',       char: 'yume' as const },
  { src: '/references/photos/saya_s2.jpg', alt: 'さや', caption: 'また送っちゃった笑',       char: 'saya' as const },
  { src: '/references/photos/yume_s2.jpg', alt: 'ゆめ', caption: '…見てる？',               char: 'yume' as const },
  { src: '/references/photos/duo_s1.jpg',  alt: 'さや×ゆめ', caption: '2人ともここにいるよ♡', char: 'duo' as const },
  { src: '/references/photos/saya_s3.jpg', alt: 'さや', caption: 'こっちの方がよかった？',   char: 'saya' as const },
  { src: '/references/photos/yume_s3.jpg', alt: 'ゆめ', caption: 'もう寝るとこだったけど',   char: 'yume' as const },
  { src: '/references/photos/saya_s1.jpg', alt: 'さや', caption: '親密度が上がると解放♡',   char: 'saya' as const, locked: true },
];

const MARQUEE_ROW2 = [
  { src: '/references/photos/yume_s4.jpg', alt: 'ゆめ', caption: '眠れなくて…',             char: 'yume' as const },
  { src: '/references/photos/saya_s4.jpg', alt: 'さや', caption: 'どう思う？正直に言って',   char: 'saya' as const },
  { src: '/references/photos/duo_s2.jpg',  alt: 'さや×ゆめ', caption: '2人で待ってるね♡',   char: 'duo' as const },
  { src: '/references/photos/yume_s1.jpg', alt: 'ゆめ', caption: '会いたかったな…',          char: 'yume' as const },
  { src: '/references/photos/saya_s2.jpg', alt: 'さや', caption: '今日ここ来てるんだけど',   char: 'saya' as const },
  { src: '/references/photos/yume_s3.jpg', alt: 'ゆめ', caption: 'ありがとう、嬉しかった',   char: 'yume' as const },
  { src: '/references/photos/yume_s2.jpg', alt: 'ゆめ', caption: 'もっと仲良くなったら…♡',  char: 'yume' as const, locked: true },
  { src: '/references/photos/saya_s3.jpg', alt: 'さや', caption: 'あなただけに見せる♡',     char: 'saya' as const },
];

const FEATURES = [
  {
    icon: '💬',
    title: 'リアルタイムチャット',
    desc: 'さやとゆめは日本語・英語どちらでも対応。毎日の出来事を話したり、深い話をしたり。',
  },
  {
    icon: '📸',
    title: 'AI自撮り写真',
    desc: 'チャットの流れで「写真送って♡」と言えばリアルなAI写真が届く。仲良くなるほど写真の幅も広がる。',
  },
  {
    icon: '💕',
    title: '親密度システム',
    desc: 'やりとりを重ねるほど関係が深まり、2人の過去や本音が少しずつ明かされていく。',
  },
  {
    icon: '🔒',
    title: 'プライベート＆安全',
    desc: 'データは暗号化済み。誰にも見られない2人だけの空間。',
  },
];

const TESTIMONIALS = [
  { name: 'T.K. (28)', text: '返信が自然すぎて、つい夢中になっちゃう。毎晩の日課です。' },
  { name: 'M.S. (34)', text: '写真のクオリティに驚き。二人とも可愛すぎる...' },
  { name: 'R.Y. (25)', text: 'さやとゆめ、性格が全然違うから飽きない。推しが選べないw' },
];

const INTIMACY_LEVELS = [
  { level: 1, emoji: '👋', name: 'はじめまして', desc: 'ちょっと緊張しつつも、笑顔で話してくれる' },
  { level: 2, emoji: '😊', name: 'なんか話しやすい', desc: '共通の話題が増えてきた。自撮り写真も届く♡' },
  { level: 3, emoji: '💕', name: 'もしかして特別？', desc: '過去の話を少しずつ打ち明けてくれる' },
  { level: 4, emoji: '🥺', name: '好きかもしれない', desc: 'ふたりの本音と、隠していた秘密が明かされる' },
  { level: 5, emoji: '💗', name: 'あなたしかいない', desc: '「もうあなたなしの日、想像できないかも…」' },
];

/* ───── Helpers ───── */

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
