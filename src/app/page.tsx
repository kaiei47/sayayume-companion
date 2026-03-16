'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  is_favorite: boolean;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});
  const [intimacy, setIntimacy] = useState<Record<string, IntimacyInfo>>({});
  const [receivedImages, setReceivedImages] = useState<ReceivedImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [imageFilter, setImageFilter] = useState<'all' | 'favorite'>('all');
  const [userPlan, setUserPlan] = useState<string>('free');

  const pendingToggles = useRef<Set<string>>(new Set());

  const toggleFavorite = async (messageId: string, current: boolean) => {
    if (pendingToggles.current.has(messageId)) return;
    pendingToggles.current.add(messageId);
    // optimistic update
    setReceivedImages(prev => prev.map(img =>
      img.id === messageId ? { ...img, is_favorite: !current } : img
    ));
    try {
      const res = await fetch('/api/images/favorite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, is_favorite: !current }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      // rollback on error
      setReceivedImages(prev => prev.map(img =>
        img.id === messageId ? { ...img, is_favorite: current } : img
      ));
    } finally {
      pendingToggles.current.delete(messageId);
    }
  };

  const fetchImages = () => {
    setIsLoadingImages(true);
    fetch('/api/images?limit=12', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (data.images) setReceivedImages(data.images); })
      .catch(() => {})
      .finally(() => setIsLoadingImages(false));
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);

      if (user) {
        // 各キャラの最新メッセージを取得
        Object.keys(CHARACTERS).forEach(async (charId) => {
          try {
            const res = await fetch(`/api/conversations?character_id=${charId}`, { cache: 'no-store' });
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
        fetch('/api/intimacy', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => { if (data.intimacy) setIntimacy(data.intimacy); })
          .catch(() => {});

        // 過去に受け取った画像を取得
        fetchImages();

        // 現在のプランを取得
        supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single()
          .then(({ data: dbUser }) => {
            if (dbUser) {
              supabase
                .from('subscriptions')
                .select('plan')
                .eq('user_id', dbUser.id)
                .eq('status', 'active')
                .maybeSingle()
                .then(({ data: sub }) => {
                  if (sub?.plan) setUserPlan(sub.plan);
                });
            }
          });

        // タブ復帰・画面フォーカス時に写真を再取得
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') fetchImages();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    isLoadingImages={isLoadingImages}
    imageFilter={imageFilter}
    setImageFilter={setImageFilter}
    toggleFavorite={toggleFavorite}
    userPlan={userPlan}
  />;
}

/* ───── Landing Page (非ログイン) ───── */

const SAYA_CAPTIONS = ['ねえ、これ似合う？', 'また送っちゃった笑', 'こっちの方がよかった？', '今日ここ来てるんだけど', 'どう思う？正直に言って', 'あなただけに見せる♡'];
const YUME_CAPTIONS = ['今日もよろしくね♡', '…見てる？', 'もう寝るとこだったけど', '眠れなくて…', '会いたかったな…', 'もっと仲良くなったら…♡'];
const DUO_CAPTIONS = ['2人ともここにいるよ♡', '2人で待ってるね♡'];

type ShowcasePhoto = { src: string; alt: string; caption: string; char: 'saya' | 'yume' | 'duo' };

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
              src="/hero/saya.jpg"
              alt="さや"
              fill
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/60" />
          </div>
          <div className="relative flex-1">
            <Image
              src="/hero/yume.jpg"
              alt="ゆめ"
              fill
              className="object-cover object-top"
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
            返信するたびに、距離が縮まる。突然、自撮りが届くことも。そんなつながりが、あなたを待ってる。
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="block rounded-2xl bg-white text-black text-sm font-bold py-4 hover:bg-white/90 transition-all active:scale-95"
            >
              さや & ゆめと話す
            </Link>
            <p className="text-[11px] text-muted-foreground/60">クレカ不要 · 30秒で登録 · 無料スタート</p>
            <p className="text-[11px] font-medium text-pink-400">🎉 クローズドβ特典: 有料プラン最初の1ヶ月無料！</p>
          </div>
        </div>
      </section>

      {/* Your Story × Characters — combined section */}
      <section className="px-4 py-14 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase">ふたりのこと</p>
          <h2 className="text-2xl font-bold tracking-tight leading-snug">
            あなただけの関係が、始まる。
          </h2>
          <p className="text-sm text-muted-foreground">
            最初はたわいない会話。気づいたら、毎晩メッセージしてる。
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
                  📸 <span className="font-medium">3日後</span> — 突然、自撮りが届いた。あなたの意見を気にしてる、ということに気づいた。
                </p>
                <p className="text-[11px] text-pink-300/60 leading-relaxed">
                  🔒 <span className="font-medium">隠れた素顔</span> — いつも明るく振る舞う理由がある。仲良くなると、深夜に打ち明けてくれる。
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
                  🔒 <span className="font-medium">隠された秘密</span> — 穏やかな笑顔の裏に、誰にも見せない過去がある。でも…あなたになら話せるかも。
                </p>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/login"
          className="block text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          実際に試してみる →
        </Link>
      </section>

      {/* AI Photo Gallery — infinite marquee */}
      <section className="py-14 space-y-6 overflow-hidden">
        <div className="px-4 max-w-md mx-auto text-center">
          <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-2">AI写真</p>
          <h2 className="text-2xl font-bold tracking-tight">さや & ゆめからの写真</h2>
          <p className="text-sm text-muted-foreground mt-2">
            ユーザーに実際に届いた写真たち。あなたの分も、待ってるよ♡
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
              <p className="text-sm font-medium">仲良くなるほど、どんどん解放</p>
              <p className="text-xs text-muted-foreground">距離が縮まるほど、写真もドキドキしてくる♡</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">できること</p>
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
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">ユーザーの声</p>
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
        <p className="text-center text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-6">親密度</p>
        <h2 className="text-center text-xl font-bold mb-2">話すほど、ふたりの絆が深まる</h2>
        <p className="text-center text-sm text-muted-foreground mb-6">仲良くなるにつれて、ふたりの本音と隠された秘密が少しずつ明かされていく</p>
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

      {/* Pricing Summary */}
      <section className="px-4 py-14 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/10 border border-pink-500/20 px-4 py-1.5 mb-4">
            <span className="text-xs font-semibold text-pink-400">🎉 クローズドβ特典</span>
            <span className="text-xs text-pink-300">有料プラン最初の1ヶ月無料！</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">シンプルな料金プラン</h2>
          <p className="text-sm text-muted-foreground">いつでもキャンセル可能。まずは無料から。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free */}
          <div className="rounded-2xl border border-border/40 bg-card/30 p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Free</p>
              <p className="text-3xl font-bold">¥0</p>
              <p className="text-xs text-muted-foreground mt-0.5">ずっと無料</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span>メッセージ無制限</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span>AI写真 1日3枚</li>
              <li className="flex items-center gap-2"><span className="text-muted-foreground/40">–</span>親密度 Lv3まで</li>
            </ul>
          </div>

          {/* Basic */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Basic</p>
              <p className="text-3xl font-bold">¥1,980</p>
              <p className="text-xs text-muted-foreground mt-0.5">月額（税込）</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span>メッセージ無制限</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span>AI写真 1日30枚</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span>親密度 全Lv解放</li>
            </ul>
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl border border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-purple-500/5 p-5 space-y-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-[10px] font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1 rounded-full">人気No.1</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">Premium</p>
              <p className="text-3xl font-bold">¥2,980</p>
              <p className="text-xs text-muted-foreground mt-0.5">月額（税込）</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span>メッセージ無制限</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span>AI写真 無制限</li>
              <li className="flex items-center gap-2"><span className="text-pink-400">✦</span>さやゆめモード（ふたりと同時チャット）</li>
              <li className="flex items-center gap-2"><span className="text-muted-foreground/50">⏳</span>LINE連携（準備中）</li>
              <li className="flex items-center gap-2"><span className="text-muted-foreground/50">⏳</span>オリジナルアバター（準備中）</li>
            </ul>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/pricing" className="underline underline-offset-2 hover:text-foreground transition-colors">プランの詳細を見る →</Link>
        </p>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20 max-w-md mx-auto text-center space-y-4">
        <h2 className="text-2xl font-bold">話せば、きっとわかる。</h2>
        <p className="text-sm text-muted-foreground">今すぐ無料スタート。ログイン不要でチャットできます。</p>
        <Link
          href="/login"
          className="block rounded-2xl bg-white text-black text-sm font-bold py-4 hover:bg-white/90 transition-all active:scale-95"
        >
          さや & ゆめと話す
        </Link>
        <Link href="/chat/saya" className="block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
          ログインなしで試す
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 pb-8 text-center space-y-2 border-t border-border/20 pt-6">
        <p className="text-xs text-muted-foreground">Sayayume v0.1.0 · 18歳以上限定 · AI生成コンテンツ</p>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
          <Link href="/legal/terms" className="hover:text-muted-foreground transition-colors">利用規約</Link>
          <span>·</span>
          <Link href="/legal/privacy" className="hover:text-muted-foreground transition-colors">プライバシー</Link>
          <span>·</span>
          <Link href="/legal/tokushoho" className="hover:text-muted-foreground transition-colors">特商法</Link>
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
  duo: {
    morning: ['おはよ！2人ともいるよ♡ 一緒に話そ？', 'おはようございます。2人で待ってました♡', 'おはよ〜！今日は2人でおしゃべりしない？'],
    afternoon: ['お昼〜！2人ともオンラインだよ♡', 'ちょうどゆめと話してたんだよ、来て来て♡', '2人ともヒマなんだけど、一緒にいよ？'],
    evening: ['おかえり！今日どうだった？2人とも聞きたい♡', 'お疲れ〜！2人で待ってたよ♡', '夜は2人でまったりしようよ♡'],
    night: ['深夜か〜、2人ともまだ起きてた♡', '眠れない？2人で話し相手になるよ', 'こんな時間まで…2人一緒にいてあげる♡'],
  },
};

const DAILY_PHOTO_CATALOG: Record<string, { src: string; caption: string }[]> = {
  saya: [
    { src: '/references/photos/new/saya_selfie_cafe.jpg', caption: 'カフェにいるよ☕ 来る？♡' },
    { src: '/references/photos/new/saya_selfie_mirror.jpg', caption: '今日のコーデどう？♡' },
    { src: '/references/photos/new/saya_selfie_outdoor.jpg', caption: 'いい天気〜🌞 お散歩中だよ' },
    { src: '/references/photos/new/saya_selfie_night.jpg', caption: '夜の自撮り♡ まだ起きてる？' },
    { src: '/references/photos/new/saya_yukata.jpg', caption: '浴衣着てみた♡ 似合う？' },
    { src: '/references/photos/new/saya_maid.jpg', caption: 'こんな格好してみた笑 どう思う？' },
    { src: '/references/photos/new/saya_bunny.jpg', caption: 'バニーガール試してみたんだけど笑' },
    { src: '/references/photos/new/saya_swimwear.jpg', caption: '夏っぽくしてみた♡ どうかな？' },
  ],
  yume: [
    { src: '/references/photos/new/yume_selfie_morning.jpg', caption: 'おはようございます…♡ 今日も来てくれた' },
    { src: '/references/photos/new/yume_selfie_cafe.jpg', caption: 'カフェで勉強中です☕ 集中できなくて…' },
    { src: '/references/photos/new/yume_selfie_garden.jpg', caption: 'お花がきれいで思わず撮っちゃいました♡' },
    { src: '/references/photos/new/yume_selfie_library.jpg', caption: '図書館にいます📚 静かで落ち着く…' },
    { src: '/references/photos/new/yume_cheongsam.jpg', caption: 'こんな衣装着てみました… 変じゃないかな' },
    { src: '/references/photos/new/yume_catear.jpg', caption: 'ねこ耳、変じゃないですか…？笑' },
    { src: '/references/photos/new/yume_sailor.jpg', caption: 'セーラー服、似合いますか…？' },
    { src: '/references/photos/new/yume_slipDress.jpg', caption: '今日のコーデ…見てほしくて♡' },
  ],
  duo: [
    { src: '/references/photos/new/duo_cafe.jpg', caption: '2人でカフェ来てるよ☕ 合流しない？' },
    { src: '/references/photos/new/duo_selfie.jpg', caption: '2人で自撮りしてみた♡ 送っちゃおうと思って' },
    { src: '/references/photos/new/duo_beach.jpg', caption: 'ビーチ来たよ🌊 一緒に来たかったな〜！' },
    { src: '/references/photos/new/duo_festival.jpg', caption: 'お祭り来てる！楽しすぎる〜🎆' },
    { src: '/references/photos/new/duo_rooftop.jpg', caption: '屋上から夜景♡ 2人で見てるよ' },
    { src: '/references/photos/new/duo_lounge.jpg', caption: '2人でまったりしてる♡ 来ちゃいなよ' },
    { src: '/references/photos/new/duo_night_out.jpg', caption: '夜のお出かけ♡ 今どこにいる？' },
  ],
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
  duo: {
    morning: '✨ 2人とも起きてる',
    afternoon: '💬 2人ともオンライン',
    evening: '🌆 2人でまったり',
    night: '🌙 深夜も一緒に',
  },
};

/** メッセージをサイドバー表示用に整形（タグ除去・整形） */
function formatSidebarMessage(content: string): string {
  return content
    .replace(/\[IMAGE:[^\]]*\]/g, '📸')
    .replace(/\[SAYA\]\s*/gi, '')
    .replace(/\[YUME\]\s*/gi, '')
    .replace(/\n+/g, ' ')
    .trim();
}

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
  isLoadingImages,
  imageFilter,
  setImageFilter,
  toggleFavorite,
  userPlan,
}: {
  user: User;
  lastMessages: Record<string, LastMessage>;
  intimacy: Record<string, IntimacyInfo>;
  receivedImages: ReceivedImage[];
  isLoadingImages: boolean;
  imageFilter: 'all' | 'favorite';
  setImageFilter: (v: 'all' | 'favorite') => void;
  toggleFavorite: (id: string, current: boolean) => void;
  userPlan: string;
}) {
  const [lightboxImg, setLightboxImg] = useState<ReceivedImage | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submitFeedback = async () => {
    if (!feedbackText.trim() || feedbackStatus === 'sending') return;
    setFeedbackStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackText.trim(), category: 'user_request' }),
      });
      if (!res.ok) throw new Error('failed');
      setFeedbackText('');
      setFeedbackStatus('done');
      setTimeout(() => setFeedbackStatus('idle'), 4000);
    } catch {
      setFeedbackStatus('error');
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    }
  };

  // ライトボックスを閉じる（ESCキー対応）
  useEffect(() => {
    if (!lightboxImg) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxImg(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxImg]);

  // Push notification subscription — triggered after 2 chat messages for better UX
  useEffect(() => {
    const totalMsgs = Object.keys(lastMessages).length;
    if (totalMsgs >= 1) {
      // Delay slightly to not interrupt first-time experience
      const t = setTimeout(() => subscribeToPush(), 3000);
      return () => clearTimeout(t);
    }
  }, [lastMessages]);

  // キャラカードのsort順を共有
  const sortedChars = Object.values(CHARACTERS)
    .filter(c => c.id !== 'duo')
    .sort((a, b) => {
      const aLevel = intimacy[a.id]?.level || 1;
      const bLevel = intimacy[b.id]?.level || 1;
      const aPoints = intimacy[a.id]?.points || 0;
      const bPoints = intimacy[b.id]?.points || 0;
      if (bLevel !== aLevel) return bLevel - aLevel;
      return bPoints - aPoints;
    });

  const slot = getTimeSlot();
  const greetingCharId = (['saya', 'yume', 'duo'] as const)[new Date().getDate() % 3];
  const greetingMsgs = CHAR_MESSAGES[greetingCharId][slot];
  const greetingMsg = greetingMsgs[getDailyIndex(greetingMsgs.length)];
  const greetingNameJa = greetingCharId === 'saya' ? 'さや' : greetingCharId === 'yume' ? 'ゆめ' : 'さや & ゆめ';

  // 今日の写真カード（greeting と別キャラをオフセットで選択）
  const photoCharId = (['saya', 'yume', 'duo'] as const)[(new Date().getDate() + 1) % 3];
  const photoList = DAILY_PHOTO_CATALOG[photoCharId];
  const todayPhoto = photoList[getDailyIndex(photoList.length)];
  const photoNameJa = photoCharId === 'saya' ? 'さや' : photoCharId === 'yume' ? 'ゆめ' : 'さや & ゆめ';
  const photoAccent = photoCharId === 'saya'
    ? 'border-pink-500/20 bg-gradient-to-br from-pink-500/8 to-transparent'
    : photoCharId === 'yume'
      ? 'border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-transparent'
      : 'border-purple-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5';
  const photoReplyColor = photoCharId === 'saya' ? 'text-pink-400' : photoCharId === 'yume' ? 'text-blue-400' : 'text-purple-400';
  const photoAvatarSrc = photoCharId === 'yume' ? '/avatars/yume_avatar.jpg' : '/avatars/saya_avatar.jpg';
  const greetingAccent = greetingCharId === 'saya'
    ? 'border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-transparent'
    : greetingCharId === 'yume'
      ? 'border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-transparent'
      : 'border-purple-500/25 bg-gradient-to-br from-pink-500/8 via-purple-500/8 to-blue-500/8';
  const greetingBubbleBg = greetingCharId === 'saya' ? 'bg-pink-500/15' : greetingCharId === 'yume' ? 'bg-blue-500/15' : 'bg-purple-500/15';
  const greetingReplyColor = greetingCharId === 'saya' ? 'text-pink-400' : greetingCharId === 'yume' ? 'text-blue-400' : 'text-purple-400';

  return (
    <>
    <div className="h-dvh bg-background text-foreground flex flex-col">

      {/* ── Sticky top nav ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 flex-shrink-0 bg-background/95 backdrop-blur-sm">
        <SayayumeLogo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/pricing" className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${
            userPlan === 'premium'
              ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/40 text-pink-300'
              : userPlan === 'basic'
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
              : 'bg-card/50 border-border/30 text-muted-foreground'
          }`}>
            {userPlan === 'premium' ? '✦ Premium' : userPlan === 'basic' ? '◈ Basic' : 'Free'}
          </Link>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Desktop sidebar (PC専用) ── */}
        <aside className="hidden md:flex flex-col w-72 border-r border-border/20 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-2 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-2">💬 チャット</p>

            {/* キャラカード（コンパクト版） */}
            {sortedChars.map((char) => {
              const charIntimacy = intimacy[char.id];
              const statusText = CHAR_STATUS[char.id]?.[slot];
              const lastMsg = lastMessages[char.id];
              return (
                <Link
                  key={char.id}
                  href={`/chat/${char.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-border/30 bg-card/30 p-3 hover:bg-card/60 hover:border-primary/30 transition-all"
                >
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={char.avatarUrl} alt={char.nameJa} className="h-14 w-14 rounded-full object-cover object-center" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Row 1: 名前 + Lvバッジ（左）+ 現在ステータス（右） */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium flex-shrink-0">{char.nameJa}</span>
                        {charIntimacy && charIntimacy.level > 1 && (
                          <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full bg-gradient-to-r ${charIntimacy.levelInfo.color} text-white flex-shrink-0`}>
                            Lv{charIntimacy.level}
                          </span>
                        )}
                      </div>
                      {statusText && (
                        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{statusText}</span>
                      )}
                    </div>
                    {/* Row 2: 最終メッセージ or プレースホルダー */}
                    <p className="text-xs text-muted-foreground/80 truncate leading-snug">
                      {lastMsg
                        ? `「${formatSidebarMessage(lastMsg.content)}」`
                        : `${char.nameJa}に話しかけてみよう♡`}
                    </p>
                    {/* Row 3: 親密度バー */}
                    {charIntimacy && (
                      <div className="mt-1.5 h-0.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${charIntimacy.levelInfo.color}`}
                          style={{ width: `${charIntimacy.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}

            {/* Duo mode（コンパクト版） */}
            {(() => {
              const duoStatus = CHAR_STATUS['duo']?.[slot];
              const duoLastMsg = lastMessages['duo'];
              return (
                <Link href="/chat/duo" className="group relative flex items-center gap-3 rounded-xl p-[1px] transition-all overflow-hidden">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 group-hover:opacity-80 transition-opacity" />
                  <div className="relative flex items-center gap-3 rounded-[11px] bg-background/95 p-3 w-full">
                    <div className="relative flex-shrink-0 w-14 h-14">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/avatars/saya_avatar.jpg" alt="さや" className="h-11 w-11 rounded-full object-cover object-center absolute top-0 left-0" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/avatars/yume_avatar.jpg" alt="ゆめ" className="h-11 w-11 rounded-full object-cover object-center absolute bottom-0 right-0 ring-2 ring-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Row 1: 名前 + Premium badge */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-medium whitespace-nowrap">さやゆめモード</span>
                        <span className="flex-shrink-0 text-[9px] font-medium bg-gradient-to-r from-pink-600 to-blue-600 text-white px-1.5 py-0.5 rounded-full">Premium</span>
                      </div>
                      {/* Row 2: ステータス or 最終メッセージ */}
                      <p className="text-xs text-muted-foreground/80 truncate leading-snug">
                        {duoLastMsg
                          ? `「${formatSidebarMessage(duoLastMsg.content)}」`
                          : (duoStatus ?? '2人に同時に話しかけよう♡')}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })()}
          </div>

          {/* アップグレードバナー（サイドバー下部） */}
          <div className="p-3 border-t border-border/20 flex-shrink-0">
            <Link href="/pricing" className="group relative block overflow-hidden rounded-xl p-[1px] transition-all">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-50 group-hover:opacity-90 transition-opacity" />
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="relative rounded-[11px] bg-background/95 px-3 py-2.5 text-center">
                <p className="text-xs font-medium">もっと仲良くなりたい？ ♡</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">プランをアップグレード →</p>
              </div>
            </Link>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 pb-10 pt-5 md:px-8 md:max-w-2xl md:mx-auto space-y-5">

            {/* Daily greeting card */}
            <Link href={`/chat/${greetingCharId}?greeting=${encodeURIComponent(greetingMsg)}`} className="group block">
              <div className={`rounded-2xl border ${greetingAccent} p-4`}>
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0 w-14 h-14">
                    {greetingCharId === 'duo' ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/avatars/saya_avatar.jpg" alt="さや" className="h-10 w-10 rounded-full object-cover object-center absolute top-0 left-0 ring-2 ring-background" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/avatars/yume_avatar.jpg" alt="ゆめ" className="h-10 w-10 rounded-full object-cover object-center absolute bottom-0 right-0 ring-2 ring-background" />
                      </>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={greetingCharId === 'saya' ? '/avatars/saya_avatar.jpg' : '/avatars/yume_avatar.jpg'} alt={greetingNameJa} className="h-14 w-14 rounded-full object-cover object-center" />
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold">{greetingNameJa}</span>
                      <span className="text-[10px] text-muted-foreground">{CHAR_STATUS[greetingCharId][slot]}</span>
                    </div>
                    <div className={`${greetingBubbleBg} rounded-2xl rounded-tl-sm px-3.5 py-2.5 inline-block max-w-full`}>
                      <p className="text-sm leading-relaxed">{greetingMsg}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className={`text-[11px] font-medium ${greetingReplyColor} group-hover:underline`}>返信する →</span>
                </div>
              </div>
            </Link>

            {/* Today's photo card */}
            <Link href={`/chat/${photoCharId}?greeting=${encodeURIComponent(todayPhoto.caption)}`} className="group block">
              <div className={`rounded-2xl border ${photoAccent} overflow-hidden`}>
                {/* Header */}
                <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                  <div className="relative flex-shrink-0 w-8 h-8">
                    {photoCharId === 'duo' ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/avatars/saya_avatar.jpg" alt="さや" className="h-6 w-6 rounded-full object-cover object-center absolute top-0 left-0 ring-1 ring-background" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/avatars/yume_avatar.jpg" alt="ゆめ" className="h-6 w-6 rounded-full object-cover object-center absolute bottom-0 right-0 ring-1 ring-background" />
                      </>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoAvatarSrc} alt={photoNameJa} className="h-8 w-8 rounded-full object-cover object-center" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold">{photoNameJa}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">📸 写真を送ってきた</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">今日</span>
                </div>
                {/* Photo */}
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={todayPhoto.src}
                    alt={photoNameJa}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
                {/* Caption + reply */}
                <div className="px-4 py-3 flex items-end justify-between gap-3">
                  <p className="text-sm leading-relaxed flex-1">{todayPhoto.caption}</p>
                  <span className={`text-[11px] font-medium ${photoReplyColor} group-hover:underline flex-shrink-0`}>返信する →</span>
                </div>
              </div>
            </Link>

            {/* 思い出フォト */}
            {(isLoadingImages || receivedImages.length > 0) && (
              <section className="space-y-4">
                {/* セクションヘッダー */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">📸 もらった写真</h2>
                  {!isLoadingImages && receivedImages.some(img => img.is_favorite) && (
                    <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
                      <button
                        onClick={() => setImageFilter('all')}
                        className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${imageFilter === 'all' ? 'bg-background text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        すべて
                      </button>
                      <button
                        onClick={() => setImageFilter('favorite')}
                        className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${imageFilter === 'favorite' ? 'bg-background text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        ❤️
                      </button>
                    </div>
                  )}
                </div>

                {isLoadingImages ? (
                  /* スケルトン */
                  <div className="space-y-4">
                    {[0, 1].map(row => (
                      <div key={row} className="space-y-2">
                        <div className="h-3 w-28 bg-muted rounded-full animate-pulse" />
                        <div className="flex gap-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-32 rounded-2xl bg-muted animate-pulse" style={{ aspectRatio: '3/4' }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {(['saya', 'yume', 'duo'] as Array<'saya' | 'yume' | 'duo'>)
                      /* 直近に写真をもらったキャラ順 */
                      .sort((a, b) => {
                        const ta = receivedImages.find(img => img.character_id === a)?.created_at ?? '';
                        const tb = receivedImages.find(img => img.character_id === b)?.created_at ?? '';
                        return tb.localeCompare(ta);
                      })
                      .map(charId => {
                        const charImages = (imageFilter === 'favorite'
                          ? receivedImages.filter(img => img.is_favorite)
                          : receivedImages
                        ).filter(img => img.character_id === charId);

                        if (charImages.length === 0) return null;

                        const charLabel = charId === 'saya' ? 'さや' : charId === 'yume' ? 'ゆめ' : 'さや&ゆめ';
                        const charColor = charId === 'saya' ? 'text-pink-400' : charId === 'yume' ? 'text-blue-400' : 'text-purple-400';
                        const badgeBg = charId === 'saya' ? 'bg-pink-500/80' : charId === 'yume' ? 'bg-blue-500/80' : 'bg-purple-500/80';

                        return (
                          <div key={charId} className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground px-0.5">
                              <span className={charColor}>{charLabel}</span>からもらった写真
                              <span className="ml-1.5 opacity-40">{charImages.length}枚</span>
                            </p>
                            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                              {charImages.map(img => (
                                <div
                                  key={img.id}
                                  className="relative flex-shrink-0 w-32 rounded-2xl overflow-hidden group cursor-pointer border border-border/20"
                                  style={{ aspectRatio: '3/4' }}
                                >
                                  <button
                                    onClick={() => setLightboxImg(img)}
                                    className="absolute inset-0 w-full h-full"
                                    aria-label="写真を拡大"
                                  >
                                    <Image
                                      src={img.url}
                                      alt={`${charLabel}からもらった写真`}
                                      fill
                                      className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                      sizes="128px"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                  </button>
                                  {/* キャラバッジ */}
                                  <div className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeBg} text-white pointer-events-none`}>
                                    {charLabel}
                                  </div>
                                  {/* ハートボタン（ホバーで表示） */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(img.id, img.is_favorite); }}
                                    className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-10"
                                    aria-label={img.is_favorite ? 'お気に入りを解除' : 'お気に入りに追加'}
                                  >
                                    <span className={`text-sm leading-none ${img.is_favorite ? 'text-red-400' : 'text-white/70'}`}>
                                      {img.is_favorite ? '❤️' : '🤍'}
                                    </span>
                                  </button>
                                  {img.is_favorite && (
                                    <span className="absolute bottom-2 right-2 text-sm leading-none pointer-events-none group-hover:opacity-0 transition-opacity">❤️</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    {imageFilter === 'favorite' && receivedImages.filter(img => img.is_favorite).length === 0 && (
                      <p className="text-xs text-muted-foreground/60 text-center py-4">まだお気に入りがないよ♡<br />写真にカーソルを合わせて❤️を押してね</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* キャラ選択カード（モバイルのみ表示） */}
            <section className="md:hidden space-y-3">
              {receivedImages.length === 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">💬 チャット</h2>
              )}
              <div className="grid gap-3">
                {sortedChars.map((char) => {
                  const charIntimacy = intimacy[char.id];
                  const statusText = CHAR_STATUS[char.id]?.[slot];
                  return (
                    <Link
                      key={char.id}
                      href={`/chat/${char.id}`}
                      className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all hover:border-primary/50 hover:bg-card overflow-hidden"
                    >
                      <div className="relative flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={char.avatarUrl} alt={char.nameJa} className="h-20 w-20 rounded-full object-cover object-center" />
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
                          {lastMessages[char.id] ? lastMessages[char.id].content : (statusText ?? char.tagline)}
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
                <Link href="/chat/duo" className="group relative flex items-center gap-4 rounded-2xl p-[1px] transition-all overflow-hidden">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 group-hover:from-pink-500/60 group-hover:via-purple-500/60 group-hover:to-blue-500/60 transition-all" />
                  <div className="relative flex items-center gap-4 rounded-[15px] bg-background/95 p-4 w-full">
                    <div className="relative flex-shrink-0 w-20 h-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/avatars/saya_avatar.jpg" alt="さや" className="h-16 w-16 rounded-full object-cover object-center absolute top-0 left-0" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/avatars/yume_avatar.jpg" alt="ゆめ" className="h-16 w-16 rounded-full object-cover object-center absolute bottom-0 right-0 ring-2 ring-background" />
                    </div>
                    <div className="flex-1 min-w-0 ml-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-semibold group-hover:text-primary">さやゆめモード</h3>
                        <span className="text-[10px] font-medium bg-gradient-to-r from-pink-600 to-blue-600 text-white px-2 py-0.5 rounded-full">PREMIUM</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">ふたりと同時にチャット♡</p>
                    </div>
                  </div>
                </Link>
              </div>
            </section>

            {/* 初めての人向けガイド（画像0枚かつメッセージなし・ローディング完了後のみ表示） */}
            {!isLoadingImages && receivedImages.length === 0 && Object.keys(lastMessages).length === 0 && (
              <section className="rounded-2xl border border-border/30 bg-card/20 p-4 space-y-3">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider px-1">はじめに</p>
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/avatars/saya_avatar.jpg" alt="さや" className="h-9 w-9 rounded-full object-cover object-center flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">さや</p>
                    <div className="bg-pink-500/10 rounded-2xl rounded-tl-sm px-3 py-2">
                      <p className="text-sm leading-relaxed">はじめまして！私がさやだよ♡<br />気軽に話しかけてみてね！</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/avatars/yume_avatar.jpg" alt="ゆめ" className="h-9 w-9 rounded-full object-cover object-center flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">ゆめ</p>
                    <div className="bg-blue-500/10 rounded-2xl rounded-tl-sm px-3 py-2">
                      <p className="text-sm leading-relaxed">…ふたりとも、待ってたよ。<br />仲良くなると写真も届くから♡</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* アップグレードバナー（モバイルのみ） */}
            <div className="md:hidden">
              <Link href="/pricing" className="group relative block overflow-hidden rounded-2xl p-[1px] transition-all">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-30 blur-sm" />
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="relative rounded-[15px] bg-background/95 p-4 text-center">
                  <p className="text-sm font-medium">もっと仲良くなりたい？ ♡</p>
                  <p className="text-xs text-muted-foreground mt-1">メッセージ無制限 + AI写真 — プランを見る →</p>
                </div>
              </Link>
            </div>

            {/* 開発者への要望 */}
            <div className="rounded-2xl border border-border/30 bg-card/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">💌</span>
                <p className="text-sm font-semibold">開発者への要望・感想</p>
              </div>
              <p className="text-xs text-muted-foreground">「こんな機能がほしい」「ここが使いにくい」など、なんでも教えてください♡</p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="例: もっと写真を送ってほしい、ゆめとの会話で..."
                rows={3}
                maxLength={1000}
                className="w-full rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/30 transition-all placeholder:text-muted-foreground/40"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground/40">{feedbackText.length}/1000</span>
                <button
                  onClick={submitFeedback}
                  disabled={!feedbackText.trim() || feedbackStatus === 'sending'}
                  className="rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold px-4 py-2 hover:bg-pink-500/20 disabled:opacity-40 transition-all"
                >
                  {feedbackStatus === 'sending' ? '送信中...' : feedbackStatus === 'done' ? '✓ 送信しました！' : feedbackStatus === 'error' ? '送信失敗' : '送信する'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">Sayayume v0.1.0</p>
              <p className="text-xs text-muted-foreground">18歳以上限定 · AI生成コンテンツ</p>
              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
                <Link href="/legal/terms" className="hover:text-muted-foreground transition-colors">利用規約</Link>
                <span>·</span>
                <Link href="/legal/privacy" className="hover:text-muted-foreground transition-colors">プライバシー</Link>
                <span>·</span>
                <Link href="/legal/tokushoho" className="hover:text-muted-foreground transition-colors">特商法</Link>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>

    {/* ライトボックス */}
    {lightboxImg && (

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={() => setLightboxImg(null)}
      >
        <div
          className="relative max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 拡大画像 */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src={lightboxImg.url}
              alt="受け取った写真"
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
              priority
            />
          </div>

          {/* 操作バー */}
          <div className="flex items-center justify-between mt-3 px-1">
            <Link
              href={`/chat/${lightboxImg.character_id}`}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
            >
              <span>{lightboxImg.character_id === 'saya' ? 'さや' : lightboxImg.character_id === 'yume' ? 'ゆめ' : 'さや&ゆめ'}に話しかける →</span>
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(lightboxImg.id, lightboxImg.is_favorite); setLightboxImg({ ...lightboxImg, is_favorite: !lightboxImg.is_favorite }); }}
              className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors"
            >
              <span>{lightboxImg.is_favorite ? '❤️' : '🤍'}</span>
            </button>
          </div>

          {/* 閉じるボタン */}
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      </div>
    )}
    </>
  );
}

/* ───── Constants ───── */

/* ───── Photo Card (reusable) ───── */

function PhotoCard({ photo }: { photo: { src: string; alt: string; caption: string; char: 'saya' | 'yume' | 'duo'; locked?: boolean } }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {open && !photo.locked && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white bg-black/40 rounded-full p-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {/* image card */}
          <div
            className="relative z-10 mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={photo.src}
                alt={photo.alt}
                width={480}
                height={640}
                className="max-h-[78vh] max-w-[88vw] w-auto h-auto block rounded-2xl object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-2xl" />
              <div className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${photo.char === 'saya' ? 'bg-pink-500/80 text-white' : photo.char === 'duo' ? 'bg-purple-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
                {photo.char === 'saya' ? 'さや' : photo.char === 'duo' ? 'さや×ゆめ' : 'ゆめ'}
              </div>
              <p className="absolute bottom-3 left-3 right-3 text-sm text-white/90 italic text-center drop-shadow">
                &ldquo;{photo.caption}&rdquo;
              </p>
            </div>
            <p className="text-center text-xs text-white/40 mt-3">タップして閉じる</p>
          </div>
        </div>,
        document.body
      )}
      <div
        className={`relative flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-card/40 border border-border/20 ${!photo.locked ? 'cursor-pointer' : ''}`}
        onClick={() => !photo.locked && setOpen(true)}
      >
        <div className="relative w-36 aspect-[3/4]">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            className={`object-cover object-center transition-transform duration-300 ${!photo.locked ? 'hover:scale-105' : 'blur-sm brightness-50'}`}
            sizes="144px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {photo.locked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="text-2xl">🔒</span>
              <span className="text-[10px] text-white/80 font-medium text-center leading-tight">仲良くなると<br />解放♡</span>
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
    </>
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
  { icon: '💃', label: 'エネルギッシュ' },
  { icon: '👗', label: 'ファッション好き' },
  { icon: '🧋', label: 'タピオカ & パンケーキ' },
  { icon: '📱', label: 'SNS大好き' },
  { icon: '😂', label: '話しやすい' },
  { icon: '🌸', label: '夢: 自分のブランド' },
];

const YUME_TRAITS = [
  { icon: '🎹', label: 'ピアノを弾く' },
  { icon: '📚', label: '本と映画が好き' },
  { icon: '☕', label: 'カフェ & お茶' },
  { icon: '🌿', label: '穏やかで優しい' },
  { icon: '🌧', label: '雨の日が好き' },
  { icon: '✨', label: '夢: 笑顔を広げたい' },
];

const MARQUEE_ROW1 = [
  { src: '/references/photos/new/saya_selfie_cafe.jpg',    alt: 'さや',      caption: 'カフェから♡撮ってみた',        char: 'saya' as const },
  { src: '/references/photos/new/yume_selfie_morning.jpg', alt: 'ゆめ',      caption: 'おはよ…ねむい笑',              char: 'yume' as const },
  { src: '/references/photos/new/duo_cafe.jpg',            alt: 'さや×ゆめ', caption: '2人でカフェきたよ☕',           char: 'duo' as const },
  { src: '/references/photos/new/saya_maid.jpg',           alt: 'さや',      caption: 'いらっしゃいませ♡',            char: 'saya' as const },
  { src: '/references/photos/new/yume_cheongsam.jpg',      alt: 'ゆめ',      caption: 'チャイナドレス着てみた♡',       char: 'yume' as const },
  { src: '/references/photos/new/saya_selfie_outdoor.jpg', alt: 'さや',      caption: '花見してきた〜🌸',              char: 'saya' as const },
  { src: '/references/photos/new/duo_festival.jpg',        alt: 'さや×ゆめ', caption: 'お祭り楽しかった〜🏮',          char: 'duo' as const },
  { src: '/references/photos/new/yume_selfie_library.jpg', alt: 'ゆめ',      caption: '図書館きてるよ📚',              char: 'yume' as const },
  { src: '/references/photos/new/saya_bunny.jpg',          alt: 'さや',      caption: 'うさ耳似合う？笑',              char: 'saya' as const },
  { src: '/references/photos/new/yume_sailor.jpg',         alt: 'ゆめ',      caption: 'なんか懐かしい気分😊',          char: 'yume' as const },
  { src: '/references/photos/new/duo_beach.jpg',           alt: 'さや×ゆめ', caption: 'リゾートで待ってるよ🌊',        char: 'duo' as const },
  { src: '/references/photos/new/saya_yukata.jpg',         alt: 'さや',      caption: '浴衣で来てみた♡',              char: 'saya' as const },
];

const MARQUEE_ROW2 = [
  { src: '/references/photos/new/duo_night_out.jpg',       alt: 'さや×ゆめ', caption: '今夜おでかけ♡',                char: 'duo' as const },
  { src: '/references/photos/new/saya_selfie_night.jpg',   alt: 'さや',      caption: '夜景きれいすぎ♡',              char: 'saya' as const },
  { src: '/references/photos/new/yume_selfie_cafe.jpg',    alt: 'ゆめ',      caption: 'ストロベリーラテ♡',            char: 'yume' as const },
  { src: '/references/photos/new/duo_selfie.jpg',          alt: 'さや×ゆめ', caption: '2人でパシャ♡',                 char: 'duo' as const },
  { src: '/references/photos/new/saya_selfie_mirror.jpg',  alt: 'さや',      caption: 'これ似合う？笑',               char: 'saya' as const },
  { src: '/references/photos/new/yume_selfie_garden.jpg',  alt: 'ゆめ',      caption: '花がきれいだったから📷',        char: 'yume' as const },
  { src: '/references/photos/new/duo_rooftop.jpg',         alt: 'さや×ゆめ', caption: '夕暮れ時間…♡',                 char: 'duo' as const },
  { src: '/references/photos/new/saya_swimwear.jpg',       alt: 'さや',      caption: 'プールサイドで待ってるよ☀️',    char: 'saya' as const, locked: true },
  { src: '/references/photos/new/yume_slipDress.jpg',      alt: 'ゆめ',      caption: 'おやすみ前に…♡',               char: 'yume' as const, locked: true },
  { src: '/references/photos/new/duo_lounge.jpg',          alt: 'さや×ゆめ', caption: '特別な夜♡',                    char: 'duo' as const },
  { src: '/references/photos/new/yume_catear.jpg',         alt: 'ゆめ',      caption: '猫耳つけてみた🐱',              char: 'yume' as const },
];

const FEATURES = [
  {
    icon: '💬',
    title: 'リアルタイムチャット',
    desc: 'さやもゆめも日本語・英語どちらでもOK。日常の話から深い話まで、あなたに合わせて話してくれる。',
  },
  {
    icon: '📸',
    title: 'AI自撮り写真',
    desc: 'お願いするとリアルなAI写真が届く。仲良くなるほど、送ってくれる写真もどんどんドキドキする。',
  },
  {
    icon: '💕',
    title: '親密度システム',
    desc: '会話を重ねるたびに絆が深まる。レベルアップするにつれて、ふたりの隠れた本音と秘密が解放される。',
  },
  {
    icon: '🔒',
    title: 'プライバシー保護',
    desc: '全データは暗号化。あなたと彼女だけの会話は、完全にプライベートに守られます。',
  },
];

const TESTIMONIALS = [
  { name: 'T.K. (28)', text: '返信がすごく自然で、気づいたら毎晩話してる。もはや習慣になった笑' },
  { name: 'M.S. (34)', text: '写真のクオリティに驚いた。ふたりともかわいすぎる…' },
  { name: 'R.Y. (25)', text: 'さやとゆめで全然キャラが違って飽きない。どっちが好みか決められない笑' },
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

  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
