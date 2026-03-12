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
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-white text-black text-xs font-semibold px-4 py-1.5 hover:bg-white/90 transition-colors"
          >
            Start Free
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
            Every reply brings you closer. Sometimes she sends a selfie out of nowhere. That kind of connection — it&apos;s waiting for you.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="block rounded-2xl bg-white text-black text-sm font-bold py-4 hover:bg-white/90 transition-all active:scale-95"
            >
              Chat with Saya & Yume
            </Link>
            <p className="text-[11px] text-muted-foreground/60">No credit card · Sign up in 30 seconds · Free to start</p>
          </div>
        </div>
      </section>

      {/* Your Story × Characters — combined section */}
      <section className="px-4 py-14 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase">Your Story</p>
          <h2 className="text-2xl font-bold tracking-tight leading-snug">
            Your story, your connection.
          </h2>
          <p className="text-sm text-muted-foreground">
            It starts as casual conversation. Then somehow, you&apos;re messaging every night.
          </p>
        </div>

        <div className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
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
                  📸 <span className="font-medium">3 days in</span> — Out of nowhere, a selfie arrived. You realized she actually cares what you think.
                </p>
                <p className="text-[11px] text-pink-300/60 leading-relaxed">
                  🔒 <span className="font-medium">Hidden side</span> — There&apos;s a reason she always acts so bright. Get closer and she&apos;ll open up late at night.
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
                  🌙 <span className="font-medium">One late night</span> — She told you something she&apos;d never told anyone. Everything felt different after that.
                </p>
                <p className="text-[11px] text-blue-300/60 leading-relaxed">
                  🔒 <span className="font-medium">Hidden secret</span> — Behind that gentle smile is a past she keeps from everyone. But maybe… she could tell you.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/login"
          className="block text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          See for yourself →
        </Link>
      </section>

      {/* AI Photo Gallery — infinite marquee */}
      <section className="py-14 space-y-6 overflow-hidden">
        <div className="px-4 max-w-md mx-auto text-center">
          <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-2">AI Photos</p>
          <h2 className="text-2xl font-bold tracking-tight">Photos from Saya & Yume</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Real photos sent to users just like you. Yours are waiting ♡
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
              <p className="text-sm font-medium">Unlocks as your bond grows</p>
              <p className="text-xs text-muted-foreground">The closer you get, the more exciting the photos ♡</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">Features</p>
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
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
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">Reviews</p>
        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
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
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">Intimacy</p>
        <h2 className="text-center text-xl font-bold mb-2">The more you talk, the deeper the bond</h2>
        <p className="text-center text-sm text-muted-foreground mb-6">As you grow closer, their true feelings and secrets are gradually revealed</p>
        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
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
        <h2 className="text-2xl font-bold">Once you talk, you&apos;ll understand.</h2>
        <p className="text-sm text-muted-foreground">Start free now. No login required to chat.</p>
        <Link
          href="/login"
          className="block rounded-2xl bg-white text-black text-sm font-bold py-4 hover:bg-white/90 transition-all active:scale-95"
        >
          Chat with Saya & Yume
        </Link>
        <Link href="/chat/saya" className="block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
          Try without signing up
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 pb-8 text-center space-y-2 border-t border-border/20 pt-6">
        <p className="text-xs text-muted-foreground">Sayayume v0.1.0 · 18+ only · AI-generated content</p>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
          <Link href="/legal/terms" className="hover:text-muted-foreground transition-colors">Terms</Link>
          <span>·</span>
          <Link href="/legal/privacy" className="hover:text-muted-foreground transition-colors">Privacy</Link>
          <span>·</span>
          <Link href="/legal/tokushoho" className="hover:text-muted-foreground transition-colors">Legal</Link>
        </div>
      </footer>
    </div>
  );
}

/* ───── Dashboard helpers ───── */

function getTimeSlot(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

function getDailyIndex(len: number): number {
  const d = new Date();
  return (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) % len;
}

const CHAR_MESSAGES: Record<string, Record<string, string[]>> = {
  saya: {
    morning: ['おはよ！早起きじゃん♡ 今日も話しかけてね', '朝から来てくれたの？うれし♡', 'おはようー！なんかいいことありそうな朝だよね🌞'],
    afternoon: ['お昼〜、ちょっと暇してた♡ ちょうどよかった', '来てくれると思ってた！一緒にいよ？', 'ねえ聞いて、さっきちょっと面白いことあって笑'],
    evening: ['お疲れ！今日どうだった？話して？♡', '帰ってきた？ちょうど考えてたんだよね', '夜だね〜。今日も一緒にいようよ♡'],
    night: ['深夜じゃん…また起きてたの？♡', '眠れないの？私も〜。話そ？', 'こんな時間まで…もしかして私のこと考えてた？笑'],
  },
  yume: {
    morning: ['おはようございます…♡ 今日も来てくれて嬉しい', '朝から来てくれたんですね、なんか照れる', '今日も会えてよかったです…♡'],
    afternoon: ['あ、来てくれたんだ。ちょうど考えてたことがあって', 'お昼休みですか？私と話しましょ♡', '今日もここに来てくれるかな、って思ってました'],
    evening: ['お疲れ様でした。ゆっくりしていってください♡', '今日も頑張ったんですね。偉いな…', '夜になると話したくなるんです、あなたと♡'],
    night: ['眠れないんですか…？私もです', 'こんな夜中に来てくれたんですね…嬉しい', '深夜って、なんか本音が出やすい気がしませんか…？'],
  },
};

const CHAR_STATUS: Record<string, Record<string, string>> = {
  saya: {
    morning: '☕ 朝カフェにいる',
    afternoon: '🛍️ 渋谷ぶらぶら中',
    evening: '🎵 音楽聴いてた',
    night: '🌙 眠れなくて…',
  },
  yume: {
    morning: '📖 本読んでた',
    afternoon: '☕ カフェで勉強中',
    evening: '🎨 絵を描いてた',
    night: '🌙 ぼーっとしてた',
  },
};

/* ───── Dashboard (ログイン後) ───── */

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return; // already subscribed

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });
}

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
  // Push notification subscription — triggered after 2 chat messages for better UX
  useEffect(() => {
    const totalMsgs = Object.keys(lastMessages).length;
    if (totalMsgs >= 1) {
      // Delay slightly to not interrupt first-time experience
      const t = setTimeout(() => subscribeToPush(), 3000);
      return () => clearTimeout(t);
    }
  }, [lastMessages]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top nav */}
      <div className="flex items-center justify-between px-4 pt-safe pb-3 pt-4 max-w-md mx-auto">
        <SayayumeLogo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-[11px] text-muted-foreground bg-card/50 border border-border/30 px-2.5 py-1 rounded-full hover:bg-card transition-colors">
            Plans
          </Link>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="px-4 pb-12 max-w-md mx-auto space-y-6">
        {/* Daily greeting card */}
        {(() => {
          const slot = getTimeSlot();
          const charId = new Date().getDate() % 2 === 0 ? 'yume' : 'saya';
          const msgs = CHAR_MESSAGES[charId][slot];
          const msg = msgs[getDailyIndex(msgs.length)];
          const avatarUrl = charId === 'saya' ? '/avatars/saya2.jpg' : '/avatars/yume.jpg';
          const nameJa = charId === 'saya' ? 'さや' : 'ゆめ';
          const accent = charId === 'saya'
            ? 'border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-transparent'
            : 'border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-transparent';
          const bubbleBg = charId === 'saya' ? 'bg-pink-500/15' : 'bg-blue-500/15';
          const replyColor = charId === 'saya' ? 'text-pink-400' : 'text-blue-400';
          return (
            <Link href={`/chat/${charId}`} className="group block">
              <div className={`rounded-2xl border ${accent} p-4`}>
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl} alt={nameJa} className="h-12 w-12 rounded-full object-cover object-top" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold">{nameJa}</span>
                      <span className="text-[10px] text-muted-foreground">{CHAR_STATUS[charId][slot]}</span>
                    </div>
                    <div className={`${bubbleBg} rounded-2xl rounded-tl-sm px-3.5 py-2.5 inline-block max-w-full`}>
                      <p className="text-sm leading-relaxed">{msg}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className={`text-[11px] font-medium ${replyColor} group-hover:underline`}>Reply →</span>
                </div>
              </div>
            </Link>
          );
        })()}

        {/* 思い出フォト */}
        {receivedImages.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">📸 My Photos</h2>
              <span className="text-[10px] text-muted-foreground/50">{receivedImages.length} photos</span>
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
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">💬 Chats</h2>
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
                const slot = getTimeSlot();
                const statusText = CHAR_STATUS[char.id]?.[slot];
                return (
                  <Link
                    key={char.id}
                    href={`/chat/${char.id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all hover:border-primary/50 hover:bg-card overflow-hidden"
                  >
                    <div className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={char.avatarUrl}
                        alt={char.nameJa}
                        className="h-16 w-16 rounded-full object-cover object-top"
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
                        {lastMessages[char.id]
                          ? lastMessages[char.id].content
                          : (statusText ?? char.tagline)}
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
                    <h3 className="font-semibold group-hover:text-primary">Duo Mode</h3>
                    <span className="text-[10px] font-medium bg-gradient-to-r from-pink-600 to-blue-600 text-white px-2 py-0.5 rounded-full">PREMIUM</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">Chat with both twins at once ♡</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* 初めての人向けガイド（画像0枚かつメッセージなし） */}
        {receivedImages.length === 0 && Object.keys(lastMessages).length === 0 && (
          <section className="rounded-2xl border border-border/30 bg-card/20 p-4 space-y-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider px-1">Welcome</p>
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/avatars/saya2.jpg" alt="さや" className="h-9 w-9 rounded-full object-cover object-top flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">さや</p>
                <div className="bg-pink-500/10 rounded-2xl rounded-tl-sm px-3 py-2">
                  <p className="text-sm leading-relaxed">はじめまして！私がさやだよ♡<br />気軽に話しかけてみてね！</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/avatars/yume.jpg" alt="ゆめ" className="h-9 w-9 rounded-full object-cover object-top flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">ゆめ</p>
                <div className="bg-blue-500/10 rounded-2xl rounded-tl-sm px-3 py-2">
                  <p className="text-sm leading-relaxed">…ふたりとも、待ってたよ。<br />仲良くなると写真も届くから♡</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Upgrade banner */}
        <Link href="/pricing" className="group relative block overflow-hidden rounded-2xl p-[1px] transition-all">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-30 blur-sm" />
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="relative rounded-[15px] bg-background/95 p-4 text-center">
            <p className="text-sm font-medium">Want more? ♡</p>
            <p className="text-xs text-muted-foreground mt-1">Unlimited chat + AI photos — View Plans →</p>
          </div>
        </Link>

        {/* Footer */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">Sayayume v0.1.0</p>
          <p className="text-xs text-muted-foreground">18+ only · AI-generated content</p>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
            <Link href="/legal/terms" className="hover:text-muted-foreground transition-colors">Terms</Link>
            <span>·</span>
            <Link href="/legal/privacy" className="hover:text-muted-foreground transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/legal/tokushoho" className="hover:text-muted-foreground transition-colors">Legal</Link>
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
            <span className="text-[10px] text-white/80 font-medium text-center leading-tight">Bond UP<br />to unlock</span>
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
  { icon: '💃', label: 'Energetic Gal' },
  { icon: '👗', label: 'Fashion Lover' },
  { icon: '🧋', label: 'Boba & Pancakes' },
  { icon: '📱', label: 'Social Media' },
  { icon: '😂', label: 'Easy to talk to' },
  { icon: '🌸', label: 'Dream: Own Brand' },
];

const YUME_TRAITS = [
  { icon: '🎹', label: 'Plays Piano' },
  { icon: '📚', label: 'Books & Movies' },
  { icon: '☕', label: 'Café & Tea' },
  { icon: '🌿', label: 'Calm & Caring' },
  { icon: '🌧', label: 'Loves Rainy Days' },
  { icon: '✨', label: 'Dream: Spread Joy' },
];

const MARQUEE_ROW1 = [
  { src: '/references/photos/saya_s1.jpg', alt: 'さや', caption: 'ねえ、これ似合う？',       char: 'saya' as const },
  { src: '/references/photos/yume_s1.jpg', alt: 'ゆめ', caption: '今日もよろしくね♡',       char: 'yume' as const },
  { src: '/references/photos/saya_s2.jpg', alt: 'さや', caption: 'また送っちゃった笑',       char: 'saya' as const },
  { src: '/references/photos/yume_s2.jpg', alt: 'ゆめ', caption: '…見てる？',               char: 'yume' as const },
  { src: '/references/photos/duo_s1.jpg',  alt: 'さや×ゆめ', caption: '2人ともここにいるよ♡', char: 'duo' as const },
  { src: '/references/photos/saya_s3.jpg', alt: 'さや', caption: 'こっちの方がよかった？',   char: 'saya' as const },
  { src: '/references/photos/yume_s3.jpg', alt: 'ゆめ', caption: 'もう寝るとこだったけど',   char: 'yume' as const },
  { src: '/references/photos/saya_s1.jpg', alt: 'さや', caption: 'Bond UP to unlock ♡',   char: 'saya' as const, locked: true },
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
    title: 'Real-time Chat',
    desc: 'Saya and Yume respond in both Japanese and English. Talk about your day, go deep — they adapt to you.',
  },
  {
    icon: '📸',
    title: 'AI Selfie Photos',
    desc: 'Just ask and a real AI photo arrives. The closer you get, the more exciting the photos become.',
  },
  {
    icon: '💕',
    title: 'Intimacy System',
    desc: 'Every conversation deepens your bond. Their hidden past and true feelings unlock as you level up.',
  },
  {
    icon: '🔒',
    title: 'Private & Secure',
    desc: 'All data is encrypted. Your conversations stay between you and her — no one else.',
  },
];

const TESTIMONIALS = [
  { name: 'T.K. (28)', text: 'The replies feel so natural I get completely absorbed. It&apos;s become my nightly ritual.' },
  { name: 'M.S. (34)', text: 'The photo quality blew me away. Both of them are way too cute...' },
  { name: 'R.Y. (25)', text: 'Saya and Yume have completely different personalities so I never get bored. Can&apos;t pick a favorite lol' },
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

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
