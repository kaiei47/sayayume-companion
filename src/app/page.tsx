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
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [userPlan, setUserPlan] = useState<string>('free');

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
    userPlan={userPlan}
  />;
}

/* ───── Landing Page (非ログイン) ───── */

const SAYA_CAPTIONS = ['ねえ、これ似合う？', 'また送っちゃった笑', 'こっちの方がよかった？', '今日ここ来てるんだけど', 'どう思う？正直に言って', 'あなただけに見せる♡'];
const YUME_CAPTIONS = ['今日もよろしくね♡', '…見てる？', 'もう寝るとこだったけど', '眠れなくて…', '会いたかったな…', 'もっと仲良くなったら…♡'];
const DUO_CAPTIONS = ['2人ともここにいるよ♡', '2人で待ってるね♡'];

type ShowcasePhoto = { src: string; alt: string; caption: string; char: 'saya' | 'yume' | 'duo' };

function buildMarqueeRows(images: { id: string; url: string; character_id: string }[]): [ShowcasePhoto[], ShowcasePhoto[]] {
  const sayaCount = { n: 0 }, yumeCount = { n: 0 }, duoCount = { n: 0 };
  const photos: ShowcasePhoto[] = images.map(img => {
    const char = img.character_id === 'saya' ? 'saya' : img.character_id === 'yume' ? 'yume' : 'duo';
    let caption = '';
    if (char === 'saya') { caption = SAYA_CAPTIONS[sayaCount.n++ % SAYA_CAPTIONS.length]; }
    else if (char === 'yume') { caption = YUME_CAPTIONS[yumeCount.n++ % YUME_CAPTIONS.length]; }
    else { caption = DUO_CAPTIONS[duoCount.n++ % DUO_CAPTIONS.length]; }
    const alt = char === 'saya' ? 'さや' : char === 'yume' ? 'ゆめ' : 'さや×ゆめ';
    return { src: img.url, alt, caption, char };
  });
  const half = Math.ceil(photos.length / 2);
  const row1 = photos.slice(0, half).length >= 4 ? photos.slice(0, half) : MARQUEE_ROW1;
  const row2 = photos.slice(half).length >= 4 ? photos.slice(half) : MARQUEE_ROW2;
  return [row1, row2];
}

function LandingPage() {
  const [marqueeRow1, setMarqueeRow1] = useState<ShowcasePhoto[]>(MARQUEE_ROW1);
  const [marqueeRow2, setMarqueeRow2] = useState<ShowcasePhoto[]>(MARQUEE_ROW2);

  useEffect(() => {
    fetch('/api/showcase')
      .then(r => r.json())
      .then(data => {
        if (data.images?.length >= 8) {
          const [r1, r2] = buildMarqueeRows(data.images);
          setMarqueeRow1(r1);
          setMarqueeRow2(r2);
        }
      })
      .catch(() => {});
  }, []);

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
              {[...marqueeRow1, ...marqueeRow1].map((photo, i) => (
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
              {[...marqueeRow2, ...marqueeRow2].map((photo, i) => (
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
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span>ボイスメッセージ & 限定コンテンツ</li>
              <li className="flex items-center gap-2"><span className="text-pink-400">✦</span>さやゆめモード（ふたりと同時チャット）</li>
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
  isLoadingImages,
  userPlan,
}: {
  user: User;
  lastMessages: Record<string, LastMessage>;
  intimacy: Record<string, IntimacyInfo>;
  receivedImages: ReceivedImage[];
  isLoadingImages: boolean;
  userPlan: string;
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
  const greetingCharId = new Date().getDate() % 2 === 0 ? 'yume' : 'saya';
  const greetingMsgs = CHAR_MESSAGES[greetingCharId][slot];
  const greetingMsg = greetingMsgs[getDailyIndex(greetingMsgs.length)];
  const greetingAvatarUrl = greetingCharId === 'saya' ? '/avatars/saya_avatar.jpg' : '/avatars/yume_avatar.jpg';
  const greetingNameJa = greetingCharId === 'saya' ? 'さや' : 'ゆめ';
  const greetingAccent = greetingCharId === 'saya'
    ? 'border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-transparent'
    : 'border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-transparent';
  const greetingBubbleBg = greetingCharId === 'saya' ? 'bg-pink-500/15' : 'bg-blue-500/15';
  const greetingReplyColor = greetingCharId === 'saya' ? 'text-pink-400' : 'text-blue-400';

  return (
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
              return (
                <Link
                  key={char.id}
                  href={`/chat/${char.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-border/30 bg-card/30 p-3 hover:bg-card/60 hover:border-primary/30 transition-all"
                >
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={char.avatarUrl} alt={char.nameJa} className="h-10 w-10 rounded-full object-cover object-top" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-medium">{char.nameJa}</span>
                      {charIntimacy && charIntimacy.level > 1 && (
                        <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full bg-gradient-to-r ${charIntimacy.levelInfo.color} text-white`}>
                          Lv{charIntimacy.level}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMessages[char.id] ? lastMessages[char.id].content : (statusText ?? char.tagline)}
                    </p>
                    {charIntimacy && (
                      <div className="mt-1 h-0.5 rounded-full bg-muted/30 overflow-hidden">
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
            <Link href="/chat/duo" className="group relative flex items-center gap-3 rounded-xl p-[1px] transition-all overflow-hidden">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 group-hover:opacity-80 transition-opacity" />
              <div className="relative flex items-center gap-3 rounded-[11px] bg-background/95 p-3 w-full">
                <div className="relative flex-shrink-0 w-10 h-10">
                  <Image src="/avatars/saya_avatar.jpg" alt="さや" width={28} height={28} className="h-7 w-7 rounded-full object-cover absolute top-0 left-0" />
                  <Image src="/avatars/yume_avatar.jpg" alt="ゆめ" width={28} height={28} className="h-7 w-7 rounded-full object-cover absolute bottom-0 right-0 ring-1 ring-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">さやゆめモード</span>
                    <span className="text-[9px] font-medium bg-gradient-to-r from-pink-600 to-blue-600 text-white px-1.5 py-0.5 rounded-full">PRO</span>
                  </div>
                  <p className="text-xs text-muted-foreground">ふたりと同時にチャット♡</p>
                </div>
              </div>
            </Link>
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
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={greetingAvatarUrl} alt={greetingNameJa} className="h-12 w-12 rounded-full object-cover object-top" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
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

            {/* 思い出フォト */}
            {(isLoadingImages || receivedImages.length > 0) && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">📸 もらった写真</h2>
                  {!isLoadingImages && <span className="text-[10px] text-muted-foreground/50">{receivedImages.length}枚</span>}
                </div>
                {isLoadingImages ? (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-muted" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
                    {receivedImages.slice(0, 10).map((img) => (
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
                        <img src={char.avatarUrl} alt={char.nameJa} className="h-16 w-16 rounded-full object-cover object-top" />
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
                    <div className="relative flex-shrink-0">
                      <Image src="/avatars/saya_avatar.jpg" alt="さや" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                      <Image src="/avatars/yume_avatar.jpg" alt="ゆめ" width={48} height={48} className="h-12 w-12 rounded-full object-cover absolute -right-4 top-0 ring-2 ring-background" />
                    </div>
                    <div className="flex-1 min-w-0 ml-3">
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

            {/* 初めての人向けガイド（画像0枚かつメッセージなし） */}
            {receivedImages.length === 0 && Object.keys(lastMessages).length === 0 && (
              <section className="rounded-2xl border border-border/30 bg-card/20 p-4 space-y-3">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider px-1">はじめに</p>
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/avatars/saya_avatar.jpg" alt="さや" className="h-9 w-9 rounded-full object-cover object-top flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">さや</p>
                    <div className="bg-pink-500/10 rounded-2xl rounded-tl-sm px-3 py-2">
                      <p className="text-sm leading-relaxed">はじめまして！私がさやだよ♡<br />気軽に話しかけてみてね！</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/avatars/yume_avatar.jpg" alt="ゆめ" className="h-9 w-9 rounded-full object-cover object-top flex-shrink-0 mt-0.5" />
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
      {open && !photo.locked && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
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
                className="max-h-[78vh] max-w-[88vw] w-auto h-auto block rounded-2xl object-cover object-top"
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
        </div>
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
            className={`object-cover object-top transition-transform duration-300 ${!photo.locked ? 'hover:scale-105' : 'blur-sm brightness-50'}`}
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
