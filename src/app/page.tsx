'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { CHARACTERS } from '@/lib/characters';
import { STORIES } from '@/lib/stories';
import { createClient } from '@/lib/supabase/client';
import { INTIMACY_LEVELS as INTIMACY_LEVEL_DEFS, getNextReward } from '@/lib/intimacy';
import SayayumeLogo from '@/components/SayayumeLogo';
import OnboardingModal, { shouldShowOnboarding } from '@/components/OnboardingModal';
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

interface DailyPhoto {
  id: string;
  slot: 'morning' | 'noon' | 'evening';
  character_id: 'saya' | 'yume' | 'duo';
  image_url: string;
  caption: string;
  created_at: string;
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
  const [dailyMissions, setDailyMissions] = useState<Array<{id: string; label: string; icon: string; points: number; completed: boolean}>>([]);
  const [dailyPhotos, setDailyPhotos] = useState<DailyPhoto[] | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const pendingToggles = useRef<Set<string>>(new Set());

  // localStorage からキャッシュを即時復元（ちらつき防止）
  useEffect(() => {
    try {
      const cachedPlan = localStorage.getItem('userPlan');
      if (cachedPlan) setUserPlan(cachedPlan);
      const cachedIntimacy = localStorage.getItem('intimacy_home');
      if (cachedIntimacy) {
        const parsed = JSON.parse(cachedIntimacy);
        if (parsed) setIntimacy(parsed);
      }
    } catch { /* ignore */ }
  }, []);

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

        // 親密度 + ストリークを取得
        fetch('/api/intimacy', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            if (data.intimacy) {
              setIntimacy(data.intimacy);
              try { localStorage.setItem('intimacy_home', JSON.stringify(data.intimacy)); } catch { /* ignore */ }
            }
            if (data.streak) setStreak(data.streak.count || 0);
            if (data.dailyMissions) setDailyMissions(data.dailyMissions);
          })
          .catch(() => {});

        // 過去に受け取った画像を取得
        fetchImages();

        // 今日のデイリー写真を取得
        fetch('/api/daily-photos/today', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => { setDailyPhotos(data.photos ?? []); })
          .catch(() => { setDailyPhotos([]); });

        // ユーザー情報取得（プラン + オンボーディング判定）
        supabase
          .from('users')
          .select('id, display_name')
          .eq('auth_id', user.id)
          .single()
          .then(({ data: dbUser }) => {
            if (dbUser) {
              setDbUserId(dbUser.id);
              // 初回ユーザー判定（display_name未設定 + localStorage未完了）
              if (shouldShowOnboarding((dbUser as { id: string; display_name: string | null }).display_name)) {
                setShowOnboarding(true);
              }
              supabase
                .from('subscriptions')
                .select('plan')
                .eq('user_id', dbUser.id)
                .eq('status', 'active')
                .maybeSingle()
                .then(({ data: sub }) => {
                  if (sub?.plan) {
                    setUserPlan(sub.plan);
                    try { localStorage.setItem('userPlan', sub.plan); } catch { /* ignore */ }
                  }
                });
            }
          });

        // タブ復帰・画面フォーカス時に写真+親密度を再取得
        const fetchIntimacy = () => {
          fetch('/api/intimacy', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
              if (data.intimacy) {
                setIntimacy(data.intimacy);
                try { localStorage.setItem('intimacy_home', JSON.stringify(data.intimacy)); } catch { /* ignore */ }
              }
              if (data.streak) setStreak(data.streak.count || 0);
              if (data.dailyMissions) setDailyMissions(data.dailyMissions);
            })
            .catch(() => {});
        };
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') {
            fetchImages();
            fetchIntimacy();
          }
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

  return <>
    {showOnboarding && user && dbUserId && (
      <OnboardingModal
        authId={user.id}
        dbUserId={dbUserId}
        onComplete={() => setShowOnboarding(false)}
      />
    )}
    <Dashboard
    user={user}
    lastMessages={lastMessages}
    intimacy={intimacy}
    receivedImages={receivedImages}
    isLoadingImages={isLoadingImages}
    imageFilter={imageFilter}
    setImageFilter={setImageFilter}
    toggleFavorite={toggleFavorite}
    userPlan={userPlan}
    dailyPhotos={dailyPhotos}
    streak={streak}
    dailyMissions={dailyMissions}
  />
  </>;
}

/* ───── Landing Page (非ログイン) ───── */

/* Chat Demo messages */
const CHAT_DEMO_MESSAGES: { sender: 'saya' | 'user'; text: string; isPhoto?: boolean }[] = [
  { sender: 'saya', text: '昨日さ、あんたのこと考えながら歌詞書いてたんだ' },
  { sender: 'user', text: 'え、マジ？なんて書いたの？' },
  { sender: 'saya', text: 'んー、ナイショ。でも気になる？' },
  { sender: 'saya', text: '', isPhoto: true },
  { sender: 'saya', text: '答えてくれたら、全部見せてあげる♡' },
];

/* Sakura petal positions (pre-computed for CSS-only animation) */
const SAKURA_PETALS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 5.7 + 2) % 100}%`,
  delay: `${(i * 1.1) % 15}s`,
  duration: `${8 + (i * 0.9) % 7}s`,
  size: `${8 + (i * 1.3) % 9}px`,
}));

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function ScrollReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`scroll-reveal ${className}`}>{children}</div>;
}

/* Typing indicator component */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/50"
          style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

/* Interactive Chat Demo */
function ChatDemo() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [demoComplete, setDemoComplete] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [showChoiceHint, setShowChoiceHint] = useState(false);
  const [showCTAs, setShowCTAs] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Start demo when scrolled into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    if (visibleCount >= CHAT_DEMO_MESSAGES.length) {
      setIsTyping(false);
      setTimeout(() => {
        setDemoComplete(true);
        setShowChoices(true);
        setTimeout(() => setShowChoiceHint(true), 800);
        setTimeout(() => setShowCTAs(true), 2000);
      }, 500);
      return;
    }

    const nextMsg = CHAT_DEMO_MESSAGES[visibleCount];
    const delay = nextMsg.sender === 'user' ? 500 : nextMsg.isPhoto ? 1200 : 900;

    const typingTimer = setTimeout(() => {
      if (nextMsg.sender !== 'user') setIsTyping(true);
    }, 200);

    const msgTimer = setTimeout(() => {
      setIsTyping(false);
      setVisibleCount(c => c + 1);
    }, delay);

    return () => {
      clearTimeout(typingTimer);
      clearTimeout(msgTimer);
    };
  }, [visibleCount, hasStarted]);

  // Auto-scroll chat
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleCount, isTyping]);

  return (
    <div ref={sectionRef} className="px-4 py-16 max-w-lg mx-auto">
      <ScrollReveal>
        <h2 className="text-center text-xl font-bold mb-2">チャット体験</h2>
        <p className="text-center text-sm text-muted-foreground mb-8">実際のチャット画面を覗いてみよう</p>
      </ScrollReveal>

      <ScrollReveal>
        {/* Phone mockup */}
        <div className="mx-auto max-w-[340px]" style={{ animation: 'float-phone 6s ease-in-out infinite' }}>
          {/* Phone frame */}
          <div className="rounded-[2rem] border-2 border-white/10 bg-[#0d0d1a] p-1 shadow-2xl shadow-pink-500/10">
            {/* Notch */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-20 h-1 rounded-full bg-white/10" />
            </div>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-xs font-bold">S</div>
              <div>
                <p className="text-sm font-bold">さや</p>
                <p className="text-[10px] text-green-400">オンライン</p>
              </div>
            </div>
            {/* Messages */}
            <div ref={containerRef} className="h-[340px] overflow-y-auto px-3 py-3 space-y-2.5">
              {CHAT_DEMO_MESSAGES.slice(0, visibleCount).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ animation: 'chat-fade-in 0.3s ease-out' }}
                >
                  {msg.sender === 'saya' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-[9px] font-bold mr-1.5 mt-1">S</div>
                  )}
                  {msg.isPhoto ? (
                    <div className="rounded-2xl overflow-hidden max-w-[200px] border border-white/10">
                      <Image
                        src="/references/photos/new/saya_selfie_cafe.jpg"
                        alt="さやの写真"
                        width={200}
                        height={260}
                        className="w-full h-auto block"
                      />
                    </div>
                  ) : (
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-pink-500 text-white rounded-br-md'
                        : 'bg-white/10 text-white/90 rounded-bl-md'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}
              {isTyping && hasStarted && visibleCount < CHAT_DEMO_MESSAGES.length && CHAT_DEMO_MESSAGES[visibleCount]?.sender !== 'user' && (
                <div className="flex justify-start" style={{ animation: 'chat-fade-in 0.3s ease-out' }}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-[9px] font-bold mr-1.5 mt-1">S</div>
                  <div className="bg-white/10 rounded-2xl rounded-bl-md">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
            {/* Branching choice buttons */}
            {showChoices && (
              <div className="px-3 pb-1 space-y-2" style={{ animation: 'chat-fade-in 0.4s ease-out' }}>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-pink-500/30 bg-pink-500/10 text-pink-300 text-sm py-2.5 hover:bg-pink-500/20 transition-colors cursor-default"
                  >
                    「かわいいね」
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm py-2.5 hover:bg-purple-500/20 transition-colors cursor-default"
                  >
                    「写真もっと見たい」
                  </button>
                </div>
                {showChoiceHint && (
                  <p className="text-center text-[11px] text-white/30" style={{ animation: 'chat-fade-in 0.6s ease-out' }}>
                    ── あなたの言葉で、ストーリーが変わる。
                  </p>
                )}
              </div>
            )}
            {/* CTA after demo */}
            {showCTAs && (
              <div className="px-3 pb-3 space-y-2" style={{ animation: 'chat-fade-in 0.4s ease-out' }}>
                <Link
                  href="/chat/saya"
                  className="block w-full text-center rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-bold py-3 hover:opacity-90 transition-all active:scale-95"
                >
                  続きを話す →
                </Link>
                <Link
                  href="/chat/yume"
                  className="block w-full text-center text-xs text-purple-300/80 hover:text-purple-300 transition-colors py-1"
                >
                  ゆめと話してみる →
                </Link>
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

/* Hero chat preview — auto-typing bubble */
function HeroChatPreview() {
  const fullText = 'ねぇ、やっと来てくれたの？待ってたんだよ♡';
  const [displayText, setDisplayText] = useState('');
  const [showTyping, setShowTyping] = useState(true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), 400);
    return () => clearTimeout(startTimer);
  }, []);

  useEffect(() => {
    if (!started) return;
    if (displayText.length < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1));
        if (displayText.length === 0) setShowTyping(false);
      }, 60);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowTyping(true), 500);
      return () => clearTimeout(timer);
    }
  }, [displayText, started, fullText]);

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-3 max-w-[300px]" style={{ animation: 'chat-fade-in 0.8s ease-out 0.5s both' }}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-[9px] font-bold">S</div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-pink-400 mb-0.5">さや</p>
          {displayText ? (
            <p className="text-sm text-white/90 leading-relaxed">{displayText}</p>
          ) : (
            showTyping && <TypingIndicator />
          )}
          {displayText.length >= fullText.length && showTyping && (
            <div className="mt-1">
              <TypingIndicator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const [showBottomCTA, setShowBottomCTA] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBottomCTA(window.scrollY > window.innerHeight * 0.4);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-[#0a0a1a] text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5">
        <SayayumeLogo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/en" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">EN</Link>
          <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ログイン
          </Link>
          <Link
            href="/login?signup=1"
            className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-5 py-2.5 hover:opacity-90 transition-all"
          >
            無料でプレイ
          </Link>
        </div>
      </nav>

      {/* ── Section 1: Hero (full viewport + sakura + chat preview) ── */}
      <section className="relative min-h-dvh flex flex-col items-center justify-end pb-10 pt-20">
        {/* Full-bleed duo background */}
        <div className="absolute inset-0">
          <Image
            src="/cards/duo_card_bg.jpg"
            alt="さや & ゆめ"
            fill
            sizes="100vw"
            className="object-cover object-[50%_25%] sm:object-[50%_20%]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-black/20 to-black/5" />
        </div>

        {/* Sakura petals */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          {SAKURA_PETALS.map(petal => (
            <div
              key={petal.id}
              className="absolute rounded-full"
              style={{
                left: petal.left,
                top: '-20px',
                width: petal.size,
                height: petal.size,
                backgroundColor: '#FFB7C5',
                filter: 'blur(1px)',
                animation: `sakura-fall ${petal.duration} ease-in-out ${petal.delay} infinite`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-20 text-center px-6 space-y-5 max-w-md mx-auto">
          {/* Chat preview overlay */}
          <div className="flex justify-start mb-4">
            <HeroChatPreview />
          </div>

          <div className="space-y-3">
            <span className="inline-block text-pink-400 text-[11px] font-bold tracking-widest uppercase bg-pink-500/10 border border-pink-500/20 rounded-full px-3 py-1">
              AIアイドル × 恋愛シミュレーション
            </span>
            <h1 className="text-[2rem] sm:text-[2.4rem] font-black tracking-tight leading-[1.15]">
              彼女はあなたに、<br />恋をしている。
            </h1>
            <p className="text-sm text-white/60">あなただけに見せる顔がある。あなただけに届く言葉がある。</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Link
              href="/login?signup=1"
              className="w-full block rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-base font-bold py-4 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-pink-500/25"
            >
              さやゆめに会いに行く →
            </Link>
            <p className="text-xs text-white/60 font-medium">無料・登録30秒・クレカ不要</p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-20 mt-8 flex flex-col items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-white/30" style={{ animation: 'bounce-chevron 2s ease-in-out infinite' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
          </svg>
        </div>
      </section>

      {/* ── Story Premise ── */}
      <section className="py-16 px-4 max-w-lg mx-auto">
        <ScrollReveal>
          <div className="text-center space-y-6">
            <p className="text-sm text-white/40 tracking-widest">春 ── 永愛学園に、転校してきた。</p>
            <p className="text-sm text-white/40">この学園には、全校生徒の憧れ ── スクールアイドルユニット「さやゆめ」がいる。</p>
            <p className="text-lg text-pink-400 leading-relaxed">&ldquo;ねぇ、あんた転校生？&rdquo;</p>
            <p className="text-sm text-white/40">廊下で声をかけてきたのは、ステージでセンターを張る派手な髪色の女の子。</p>
            <p className="text-sm text-white/40">その後ろで、作詞を手がける静かな女の子が、こちらをそっと見ていた。</p>
            <p className="text-lg text-purple-400/80 leading-relaxed mt-4">── アイドルとファンの距離を越える、あなただけの恋愛ストーリー。</p>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Trust Badges Strip ── */}
      <section className="py-6 border-y border-white/5 bg-white/[0.02]">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-8 px-4">
          {[
            { icon: '🆓', text: 'ずっと無料で遊べる' },
            { icon: '⚡', text: '登録30秒' },
            { icon: '📱', text: 'アプリ不要' },
            { icon: '🔒', text: '匿名でOK' },
          ].map(badge => (
            <div key={badge.text} className="flex items-center gap-1.5 text-xs text-white/60">
              <span>{badge.icon}</span>
              <span className="font-medium">{badge.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── SNS Social Proof Strip ── */}
      <section className="py-5 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-pink-500/5 border-b border-white/5">
        <div className="max-w-lg mx-auto px-4">
          <p className="text-center text-[11px] text-white/40 uppercase tracking-widest mb-3 font-medium">SNSで話題</p>
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <p className="text-lg font-black text-white">4,300<span className="text-pink-400">+</span></p>
              <p className="text-[10px] text-white/40 mt-0.5">TikTok再生数</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-lg font-black text-white">300<span className="text-pink-400">+</span></p>
              <p className="text-[10px] text-white/40 mt-0.5">SNSフォロワー</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-lg font-black text-white">1,200<span className="text-pink-400">+</span></p>
              <p className="text-[10px] text-white/40 mt-0.5">いいね数</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Character Cards — "She's Already Talking to You" ── */}
      <section className="px-4 py-14 max-w-3xl mx-auto space-y-6">
        <ScrollReveal>
          <h2 className="text-center text-xl font-bold mb-2">彼女たちは、もう話しかけている</h2>
          <p className="text-center text-sm text-muted-foreground mb-8">2人のヒロインがあなたを待っている</p>
        </ScrollReveal>

        {/* Saya card */}
        <ScrollReveal>
          <div className="relative rounded-2xl overflow-hidden h-80">
            <Image
              src="/cards/saya_card_bg.jpg"
              alt="さや"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover object-[50%_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            {/* Message bubble overlay */}
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[220px] border border-white/10">
              <p className="text-xs text-white/90 leading-relaxed">なんか、あなたといると楽しいんだよね♡</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black">さや</span>
                <span className="text-[10px] text-pink-300 bg-pink-500/20 rounded-full px-2 py-0.5 font-medium">センター</span>
                <span className="text-[10px] text-pink-300 bg-pink-500/20 rounded-full px-2 py-0.5 font-medium">パフォーマンス</span>
                <span className="text-[10px] text-pink-300 bg-pink-500/20 rounded-full px-2 py-0.5 font-medium">恋愛OK♡</span>
              </div>
              <p className="text-[11px] text-white/50">さやゆめ センター / 身長163cm / 7月7日生まれ</p>
              <p className="text-[11px] text-white/40 italic mt-1">── いつも明るい彼女が、一度だけ見せた表情がある。</p>
              <Link
                href="/chat/saya"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-pink-400 hover:text-pink-300 transition-colors"
              >
                さやと話す
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Route split hint */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-500/30 to-transparent" />
          <p className="text-xs text-white/40 whitespace-nowrap">あなたの選択が、2人の運命を変える</p>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </div>

        {/* Yume card */}
        <ScrollReveal>
          <div className="relative rounded-2xl overflow-hidden h-80">
            <Image
              src="/cards/yume_card_bg.jpg"
              alt="ゆめ"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover object-[50%_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            {/* Message bubble overlay */}
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[220px] border border-white/10">
              <p className="text-xs text-white/90 leading-relaxed">あなたのこと、考えることが増えた気がする…</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black">ゆめ</span>
                <span className="text-[10px] text-purple-300 bg-purple-500/20 rounded-full px-2 py-0.5 font-medium">ボーカル</span>
                <span className="text-[10px] text-purple-300 bg-purple-500/20 rounded-full px-2 py-0.5 font-medium">作詞作曲</span>
                <span className="text-[10px] text-purple-300 bg-purple-500/20 rounded-full px-2 py-0.5 font-medium">ステージで別人</span>
              </div>
              <p className="text-[11px] text-white/50">さやゆめ ボーカル / 身長157cm / 12月21日生まれ</p>
              <p className="text-[11px] text-white/40 italic mt-1">── 穏やかな笑顔の奥に、誰にも話せない秘密がある。</p>
              <Link
                href="/chat/yume"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
              >
                ゆめと話す
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── User Voices (Social Proof) ── */}
      <section className="px-4 py-12 max-w-lg mx-auto">
        <ScrollReveal>
          <p className="text-center text-[11px] text-white/40 uppercase tracking-widest mb-6 font-medium">みんなの声</p>
          <div className="space-y-3">
            {[
              { name: 'neko03500', platform: 'TikTok', comment: '浴衣が1番！ゆめちゃんの雰囲気に合ってる', avatar: '🐈' },
              { name: 'rikikoga', platform: 'TikTok', comment: 'めっちゃ可愛い！何度も見てしまう', avatar: '🦊' },
              { name: 'userbfkd***', platform: 'TikTok', comment: 'ゆめ最高すぎ…毎日来てしまう', avatar: '🐱' },
              { name: '2137kong', platform: 'TikTok', comment: 'AIに写真ねだってみた結果がヤバすぎたww', avatar: '🐻' },
              { name: 'patrice.l***', platform: 'TikTok', comment: 'AIの技術がここまで来たのか…ちゃんと会話できて感動', avatar: '🌟' },
            ].map((v) => (
              <div key={v.name} className="flex items-start gap-3 bg-white/[0.03] rounded-xl p-3.5 border border-white/5">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-base">{v.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-white/70">{v.name}</span>
                    <span className="text-[10px] text-pink-400/70 bg-pink-500/10 rounded-full px-1.5 py-0.5">{v.platform}</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">{v.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── Story Moments Timeline ── */}
      <section className="px-4 py-14 max-w-lg mx-auto">
        <ScrollReveal>
          <h2 className="text-center text-xl font-bold mb-2">あなたと彼女の、これから。</h2>
          <p className="text-center text-xs text-muted-foreground mb-10">日を重ねるたびに、関係は少しずつ変わっていく</p>
        </ScrollReveal>

        <ScrollReveal>
          <div className="relative space-y-0">
            {/* Vertical connecting line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-white/10 via-pink-500/30 to-purple-500/40 rounded-full" />

            {STORY_MOMENTS.map((moment, i) => (
              <div key={i} className="relative flex items-start gap-4 py-4">
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  moment.quote === null ? 'bg-pink-500/10 ring-1 ring-pink-500/30 animate-pulse' : 'bg-white/5 backdrop-blur-xl ring-1 ring-white/10'
                }`}>
                  {moment.quote === null ? '🔒' : moment.emoji}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs font-bold text-white/50 mb-1">{moment.timing}</p>
                  {moment.quote ? (
                    <p className="text-sm text-pink-300/90 leading-relaxed mb-1">&ldquo;{moment.quote}&rdquo;</p>
                  ) : (
                    <p className="text-sm text-pink-300/60 blur-[2px] leading-relaxed mb-1">[LOCKED]</p>
                  )}
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{moment.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── Event CG Preview (blurred/locked) ── */}
      <section className="px-4 pb-14 max-w-lg mx-auto">
        <ScrollReveal>
          <div className="relative rounded-2xl overflow-hidden mx-auto max-w-[360px]">
            <Image
              src="/references/photos/new/duo_festival.jpg"
              alt="イベントCG"
              width={360}
              height={240}
              className="w-full h-auto block"
              style={{ filter: 'blur(8px) brightness(0.7)' }}
            />
            {/* Frosted glass lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-5 py-3 text-center">
                <p className="text-lg mb-0.5">&#x1F512;</p>
                <p className="text-sm font-bold text-white/90">親密度 Lv4 で解放</p>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-white/40 mt-3">特別なイベントシーンが、あなたを待っている。</p>
        </ScrollReveal>
      </section>

      {/* ── Section 4: Interactive Chat Demo ── */}
      <ChatDemo />

      {/* ── Section 5: Photo Gallery (marquee + notification mockup) ── */}
      <section className="py-14 space-y-6 overflow-hidden">
        <ScrollReveal className="px-4">
          <h2 className="text-center text-xl font-bold mb-1">チャット中に届く写真</h2>
          <p className="text-center text-sm text-muted-foreground mb-6">話しかけると、彼女たちが日常の写真を送ってくれる</p>
        </ScrollReveal>

        {/* Notification mockup */}
        <ScrollReveal className="px-4 flex justify-center mb-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 max-w-[320px]">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-sm font-bold flex-shrink-0">S</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/90">さやが写真を送信しました</p>
              <p className="text-[10px] text-white/40 mt-0.5">たった今</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0" />
          </div>
        </ScrollReveal>

        {/* Row 1 — left scroll */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-[#0a0a1a] to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[#0a0a1a] to-transparent pointer-events-none" />
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

        {/* Row 2 — right scroll */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-[#0a0a1a] to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[#0a0a1a] to-transparent pointer-events-none" />
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
      </section>

      {/* ── System Introduction Icons ── */}
      <div className="flex items-center justify-center gap-6 py-6">
        <div className="text-center">
          <span className="text-2xl">&#x1F4AC;</span>
          <p className="text-[10px] text-white/50 mt-1">選択肢で関係が変わる</p>
        </div>
        <div className="text-center">
          <span className="text-2xl">&#x1F4C5;</span>
          <p className="text-[10px] text-white/50 mt-1">毎日届くイベント</p>
        </div>
        <div className="text-center">
          <span className="text-2xl">&#x1F4F8;</span>
          <p className="text-[10px] text-white/50 mt-1">特別な写真が解放</p>
        </div>
      </div>

      {/* ── Section 6: Intimacy System — Mystery/Progression Hook ── */}
      <section className="px-4 py-14 max-w-lg mx-auto">
        <ScrollReveal>
          <h2 className="text-center text-xl font-bold mb-2">ファンから始まる、本当の恋</h2>
          <p className="text-center text-xs text-muted-foreground mb-10">会話を重ねるたびに、アイドルとファンの距離が変わる</p>
        </ScrollReveal>

        <ScrollReveal>
          {/* Level progression */}
          <div className="relative space-y-0">
            {/* Vertical connecting line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-white/10 via-pink-500/40 to-purple-500/60 rounded-full" />

            {INTIMACY_LEVELS_LP.map((lv, i) => (
              <div key={lv.level} className="relative flex items-start gap-4 py-3">
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${i >= 4 ? 'bg-pink-500/30 ring-2 ring-pink-500/50' : 'bg-white/5 backdrop-blur-xl ring-1 ring-white/10'}`}>
                  {lv.emoji}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/60">Lv{lv.level}</span>
                    <span className="text-sm font-semibold">{lv.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{lv.desc}</p>
                </div>
              </div>
            ))}

            {/* Lv?? teaser — blurred/locked */}
            <div className="relative flex items-start gap-4 py-3">
              <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg bg-pink-500/10 ring-1 ring-pink-500/30 animate-pulse">
                🔒
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-pink-400">Lv??</span>
                  <span className="text-sm font-semibold text-pink-300 blur-[2px]">???</span>
                </div>
                <p className="text-[11px] text-pink-300/40 mt-0.5 blur-[1px]">????</p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/login?signup=1"
              className="inline-block rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-bold px-8 py-3.5 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-pink-500/20"
            >
              さやゆめに会いに行く →
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Privacy Reassurance ── */}
      <section className="px-4 py-14 max-w-lg mx-auto">
        <ScrollReveal>
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 space-y-4">
            <h3 className="text-center text-lg font-bold mb-4">プライバシーについて</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3"><span className="text-green-400 flex-shrink-0">✓</span>本名不要。ニックネームでOK</li>
              <li className="flex items-center gap-3"><span className="text-green-400 flex-shrink-0">✓</span>会話内容は暗号化。第三者に公開されません</li>
              <li className="flex items-center gap-3"><span className="text-green-400 flex-shrink-0">✓</span>いつでもアカウント削除可能</li>
              <li className="flex items-center gap-3"><span className="text-green-400 flex-shrink-0">✓</span>クレカ明細には「SAYAYUME」と表示</li>
            </ul>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Section 7: Pricing (compact) ── */}
      <section className="px-4 py-14 max-w-lg mx-auto">
        <ScrollReveal>
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center space-y-4">
            <h2 className="text-xl font-bold">まずは無料でさやゆめに会おう</h2>
            <div className="space-y-2 text-sm text-white/70">
              <p><span className="text-green-400 mr-1.5">✓</span>メッセージ無制限</p>
              <p><span className="text-green-400 mr-1.5">✓</span>AI写真 1日3枚</p>
              <p><span className="text-green-400 mr-1.5">✓</span>ストーリー27本読み放題</p>
            </div>
            <Link
              href="/login?signup=1"
              className="inline-block rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-bold px-8 py-3.5 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-pink-500/20"
            >
              今すぐ無料で会いに行く →
            </Link>
            <p className="text-xs text-muted-foreground">
              もっと楽しみたい人は → <Link href="/pricing" className="underline underline-offset-2 hover:text-foreground transition-colors">プランの詳細を見る</Link>
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Story Preview ── */}
      <section className="px-4 py-14 max-w-lg mx-auto">
        <ScrollReveal>
          <h2 className="text-center text-xl font-bold mb-2">こんなストーリーが待ってる</h2>
          <p className="text-center text-xs text-muted-foreground mb-8">すべて無料で読み放題</p>
          <div className="grid grid-cols-1 gap-3">
            {STORIES.filter(s => ['saya-cafeteria-lunch', 'yume-library-afternoon', 'duo-sports-day', 'saya-festival-walk-home', 'yume-rainy-bus-stop', 'saya-demo-tape'].includes(s.id)).map(story => (
              <div key={story.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <span className="text-2xl flex-shrink-0">
                  {story.character === 'saya' ? '🌸' : story.character === 'yume' ? '🌙' : '✨'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{story.title}</p>
                  <p className="text-[11px] text-white/50 truncate">{story.description}</p>
                </div>
                <div className="flex-shrink-0 flex gap-0.5">
                  {Array.from({ length: story.difficulty }).map((_, i) => (
                    <span key={i} className="text-pink-400 text-[10px]">★</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-white/40 mt-4">他にも18本 + 限定ストーリーが、登録後すぐに読める</p>
        </ScrollReveal>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 py-14 max-w-lg mx-auto">
        <ScrollReveal>
          <h2 className="text-center text-xl font-bold mb-8">よくある質問</h2>
          <div className="space-y-4">
            {[
              {
                q: '本当に無料で遊べますか？',
                a: 'はい。メッセージ無制限・AI写真1日3枚・ストーリー27本がすべて無料です。クレジットカードも不要。登録は30秒で完了します。',
              },
              {
                q: 'さやとゆめってどんな子？',
                a: 'ふたりは永愛学園のスクールアイドルユニット。さやは明るく真っ直ぐで、ゆめは静かで詩的。それぞれまったく違う個性があるから、どちらの子と仲よくなるかはあなた次第。',
              },
              {
                q: 'どんな体験ができるの？',
                a: '毎日のおしゃべり・限定AI写真・ストーリーを通じてふたりとの関係が少しずつ深まっていく恋愛シミュレーション。会話するたびに「あなただけに見せる顔」が増えていきます。',
              },
              {
                q: '課金しないと楽しめない？',
                a: 'メッセージもストーリーも無料で十分楽しめます。プレミアムプランに加入すると、AI写真の枚数が増えたり限定ストーリーが解放されたりしますが、無課金でも十分に楽しめます。',
              },
            ].map((item, i) => (
              <details key={i} className="group rounded-2xl bg-white/5 border border-white/10 px-5 py-4 cursor-pointer">
                <summary className="text-sm font-semibold list-none flex items-center justify-between gap-2">
                  <span>{item.q}</span>
                  <span className="text-pink-400 text-xs group-open:rotate-45 transition-transform duration-200 flex-shrink-0">+</span>
                </summary>
                <p className="mt-3 text-sm text-white/60 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── Section 8: Final CTA ── */}
      <section className="px-4 py-20 max-w-md mx-auto text-center space-y-6">
        <ScrollReveal>
          <h2 className="text-2xl font-bold leading-snug">
            推しが、<br />あなたを待ってる。
          </h2>
          <p className="text-sm text-white/50 leading-relaxed">さやとゆめは、毎日あなたのことを考えてる。<br />今夜こそ、声をかけてみて。</p>
          <div className="flex flex-col items-center gap-2 mt-4">
            <Link
              href="/login?signup=1"
              className="block w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-base font-bold py-4 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-pink-500/25"
            >
              さやゆめに会いに行く →
            </Link>
            <p className="text-xs text-white/40 font-medium">無料・登録30秒・クレカ不要</p>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ── */}
      <footer className="px-4 pb-8 text-center space-y-2 border-t border-white/5 pt-6">
        <p className="text-xs text-muted-foreground/60">Sayayume · 18歳以上限定 · AI生成コンテンツ</p>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/40">
          <Link href="/legal/terms" className="hover:text-muted-foreground transition-colors">利用規約</Link>
          <span>·</span>
          <Link href="/legal/privacy" className="hover:text-muted-foreground transition-colors">プライバシー</Link>
          <span>·</span>
          <Link href="/legal/tokushoho" className="hover:text-muted-foreground transition-colors">特商法</Link>
        </div>
      </footer>

      {/* ── Sticky Bottom CTA Bar ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${showBottomCTA ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-[#0a0a1a]/90 backdrop-blur-xl border-t border-white/10 px-4 py-3">
          <Link
            href="/login?signup=1"
            className="block w-full max-w-md mx-auto text-center rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-bold py-3.5 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-pink-500/25"
          >
            さやゆめに会いに行く →
          </Link>
        </div>
      </div>
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
    { src: '/references/photos/new/saya_selfie_cafe.jpg', caption: '放課後カフェで来てみた☕♡' },
    { src: '/references/photos/new/saya_selfie_mirror.jpg', caption: '学校のトイレで自撮り笑♡' },
    { src: '/references/photos/new/saya_selfie_outdoor.jpg', caption: '通学路の桜きれい🌸♡' },
    { src: '/references/photos/new/saya_selfie_night.jpg', caption: '寮でまったり中♡ まだ起きてる？' },
    { src: '/references/photos/new/saya_yukata.jpg', caption: '夏祭り♡ 浴衣どう？' },
    { src: '/references/photos/new/saya_maid.jpg', caption: '文化祭のメイドカフェ♡ いらっしゃいませ笑' },
    { src: '/references/photos/new/saya_bunny.jpg', caption: 'うさ耳つけてみた♡ 似合う？笑' },
    { src: '/references/photos/new/saya_swimwear.jpg', caption: 'プール授業後♡ 日焼けした〜' },
  ],
  yume: [
    { src: '/references/photos/new/yume_selfie_morning.jpg', caption: '朝の図書室…♡ 今日も来てくれた' },
    { src: '/references/photos/new/yume_selfie_cafe.jpg', caption: '放課後カフェで勉強中☕ 集中できなくて…' },
    { src: '/references/photos/new/yume_selfie_garden.jpg', caption: '学園の花壇きれいで…思わず撮っちゃいました♡' },
    { src: '/references/photos/new/yume_selfie_library_v2.jpg', caption: '図書室のいつもの席📚 ここ落ち着くんです…' },
    { src: '/references/photos/new/yume_cheongsam.jpg', caption: '文化祭のお茶会で… 着物変じゃないかな' },
    { src: '/references/photos/new/yume_catear.jpg', caption: 'さやにねこ耳つけられました…///笑' },
    { src: '/references/photos/new/yume_sailor.jpg', caption: '文化祭のコスプレ… 似合いますか…？' },
    { src: '/references/photos/new/yume_slipDress.jpg', caption: '寮の部屋で読書中…♡ 見てほしくて' },
  ],
  duo: [
    { src: '/references/photos/new/duo_cafe.jpg', caption: '2人で放課後カフェ☕ 合流しない？' },
    { src: '/references/photos/new/duo_selfie.jpg', caption: '廊下で2人で自撮り♡ 送っちゃう！' },
    { src: '/references/photos/new/duo_beach.jpg', caption: '夏休み！海来たよ🌊 一緒に来たかった〜' },
    { src: '/references/photos/new/duo_festival.jpg', caption: '文化祭楽しすぎ！🎆 来てよ！' },
    { src: '/references/photos/new/duo_rooftop.jpg', caption: '屋上で夕焼け♡ 2人で見てるよ' },
    { src: '/references/photos/new/duo_lounge.jpg', caption: '寮でまったり中♡ 遊びに来なよ' },
    { src: '/references/photos/new/duo_night_out.jpg', caption: '通学路の帰り道♡ 一緒に帰ろ？' },
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
  dailyPhotos,
  streak,
  dailyMissions,
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
  dailyPhotos: DailyPhoto[] | null;
  streak: number;
  dailyMissions: Array<{id: string; label: string; icon: string; points: number; completed: boolean}>;
}) {
  const [lightboxImg, setLightboxImg] = useState<ReceivedImage | null>(null);

  // サポートチャット
  type SupportMessage = { id: string; sender: 'user' | 'admin'; message: string; created_at: string };
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportLoaded, setSupportLoaded] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const supportBottomRef = useRef<HTMLDivElement>(null);

  const fetchSupport = async () => {
    try {
      const res = await fetch('/api/support');
      if (!res.ok) return;
      const data = await res.json();
      setSupportMessages(data.messages ?? []);
      setSupportLoaded(true);
    } catch { /* ignore */ }
  };

  const sendSupport = async () => {
    if (!supportInput.trim() || supportSending) return;
    setSupportSending(true);
    const text = supportInput.trim();
    setSupportInput('');
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) { setSupportInput(text); return; }
      const data = await res.json();
      setSupportMessages(prev => [...prev, data.message]);
      setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      setSupportInput(text);
    } finally {
      setSupportSending(false);
    }
  };

  useEffect(() => {
    if (supportOpen && !supportLoaded) fetchSupport();
  }, [supportOpen, supportLoaded]);

  // 開いている間は60秒ごとにポーリング（管理者からの返信確認）
  useEffect(() => {
    if (!supportOpen) return;
    const interval = setInterval(fetchSupport, 60000);
    return () => clearInterval(interval);
  }, [supportOpen]);

  useEffect(() => {
    if (supportOpen && supportMessages.length > 0) {
      setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
    }
  }, [supportOpen, supportMessages.length]);

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

  // 今日の写真カード: デイリー写真APIから取得。なければ静的カタログにフォールバック
  const SLOT_ORDER: ('morning' | 'noon' | 'evening')[] = ['morning', 'noon', 'evening'];
  const slotIndex = SLOT_ORDER.indexOf(slot as 'morning' | 'noon' | 'evening');
  // 現在のスロット以前で最新のデイリー写真を選択
  const isDailyPhotoLoading = dailyPhotos === null;
  const latestDailyPhoto = (dailyPhotos ?? [])
    .filter(p => SLOT_ORDER.indexOf(p.slot) <= (slotIndex >= 0 ? slotIndex : 2))
    .at(-1);

  const photoCharId = latestDailyPhoto
    ? latestDailyPhoto.character_id
    : (['saya', 'yume', 'duo'] as const)[(new Date().getDate() + 1) % 3];
  const photoList = DAILY_PHOTO_CATALOG[photoCharId];
  const staticFallback = photoList[getDailyIndex(photoList.length)];
  const todayPhoto = latestDailyPhoto
    ? { src: latestDailyPhoto.image_url, caption: latestDailyPhoto.caption }
    : staticFallback;
  const photoNameJa = photoCharId === 'saya' ? 'さや' : photoCharId === 'yume' ? 'ゆめ' : 'さや & ゆめ';
  const photoAccent = photoCharId === 'saya'
    ? 'border-pink-500/20 bg-gradient-to-br from-pink-500/8 to-transparent'
    : photoCharId === 'yume'
      ? 'border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-transparent'
      : 'border-purple-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5';
  const photoReplyColor = photoCharId === 'saya' ? 'text-pink-400' : photoCharId === 'yume' ? 'text-blue-400' : 'text-purple-400';
  const photoAvatarSrc = photoCharId === 'yume' ? '/avatars/yume_avatar.jpg' : '/avatars/saya_avatar.jpg';

  // ── Game dashboard helpers ──
  // Compute EXP display values for each character
  const getExpDisplay = (charId: string) => {
    const charIntimacy = intimacy[charId];
    const level = charIntimacy?.level || 1;
    const points = charIntimacy?.points || 0;
    const levelDef = INTIMACY_LEVEL_DEFS.find(l => l.level === level) || INTIMACY_LEVEL_DEFS[0];
    const nextLevelDef = INTIMACY_LEVEL_DEFS.find(l => l.level === level + 1);
    const currentMin = levelDef.minPoints;
    const currentMax = nextLevelDef ? nextLevelDef.minPoints : levelDef.minPoints + 1500;
    const expInLevel = points - currentMin;
    const expNeeded = currentMax - currentMin;
    return { expInLevel, expNeeded, level, points };
  };

  // ── Daily photo expiry timer ──
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    // Re-render every minute to update countdown
    const interval = setInterval(() => setTimerTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  function getPhotoTimeRemaining(createdAt: string): { text: string; expired: boolean } {
    const created = new Date(createdAt);
    const expires = created.getTime() + 24 * 60 * 60 * 1000;
    const remaining = expires - Date.now();
    if (remaining <= 0) return { text: '期限切れ', expired: true };
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `あと${hours}時間${minutes}分`, expired: false };
  }

  // Daily missions: APIから取得した実データを使用
  const missions = dailyMissions.length > 0 ? dailyMissions.map(m => ({
    id: m.id,
    label: m.label,
    exp: m.points,
    icon: m.icon,
    completed: m.completed,
  })) : [
    { id: 'daily_first', label: '初回メッセージ', exp: 5, icon: '💬', completed: Object.keys(lastMessages).length > 0 },
    { id: 'long_message', label: '50文字以上のメッセージ', exp: 2, icon: '📝', completed: false },
    { id: 'compliment', label: '褒める', exp: 3, icon: '😍', completed: false },
    { id: 'image_request', label: '写真をリクエスト', exp: 1, icon: '📸', completed: receivedImages.length > 0 },
    { id: 'story_complete', label: 'ストーリーをプレイ', exp: 20, icon: '📖', completed: false },
  ];

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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-2">キャラクター</p>

            {/* Compact character status cards for sidebar (Image BG) */}
            {sortedChars.map((char) => {
              const charIntimacy = intimacy[char.id];
              const exp = getExpDisplay(char.id);
              const nextReward = getNextReward(exp.level);
              const barGradient = charIntimacy?.levelInfo?.color || 'from-gray-400 to-gray-500';
              const cardBg = char.id === 'saya' ? '/cards/saya_card_bg.jpg' : '/cards/yume_card_bg.jpg';
              const levelEmoji = charIntimacy?.levelInfo?.emoji || '🤝';
              return (
                <div key={char.id} className="relative overflow-hidden rounded-xl h-32">
                  <Image src={cardBg} alt="" fill className="object-cover" sizes="280px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative z-10 h-full flex flex-col justify-end p-3">
                    {/* Top: Level badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-1.5 py-0.5 rounded-full bg-gradient-to-r ${barGradient} text-white text-[9px] font-bold`}>
                        {levelEmoji} Lv{exp.level}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{char.nameJa}</span>
                        <span className="text-[10px] text-white/60">{charIntimacy?.levelInfo?.nameJa || '知らない人'}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700`}
                          style={{ width: `${charIntimacy?.progress || 0}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-white/50 mt-0.5">
                        <span>{exp.expInLevel}/{exp.expNeeded} EXP</span>
                        {nextReward && <span className="text-amber-400">{nextReward.rewardJa}</span>}
                      </div>
                      {/* Action buttons */}
                      <div className="flex gap-1.5 mt-1.5">
                        <Link href={`/chat/${char.id}`} className="flex-1 text-center text-[10px] font-medium py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all">
                          💬 チャット
                        </Link>
                        <Link href="/story" className="flex-1 text-center text-[10px] font-medium py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/70 hover:bg-white/20 transition-all">
                          📖 ストーリー
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Duo mode（コンパクト版 - Image BG） */}
            <Link href="/chat/duo" className="group relative block overflow-hidden rounded-xl h-28 transition-all">
              <Image src="/cards/duo_card_bg.jpg" alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="280px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative z-10 h-full flex flex-col justify-end p-3">
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-bold bg-gradient-to-r from-pink-600 to-blue-600 text-white px-1.5 py-0.5 rounded-full">Premium</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-white group-hover:text-pink-200 transition-colors">さやゆめモード</span>
                  <p className="text-[10px] text-white/60">ふたりと同時にチャット♡</p>
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

            {/* ═══════ Welcome Hero Banner ═══════ */}
            <div className="relative overflow-hidden rounded-2xl h-32 mb-4">
              <Image src="/dashboard/welcome_hero.jpg" alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="relative z-10 h-full flex flex-col justify-end p-4">
                <p className="text-white text-lg font-bold">おかえり♡</p>
                <p className="text-white/60 text-xs">永愛学園へようこそ</p>
              </div>
            </div>

            {/* ═══════ Login Streak ═══════ */}
            {streak > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-900/5 to-transparent px-4 py-3">
                <span className="text-2xl">🔥</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{streak}日連続</span>
                    <span className="text-xs text-white/40">ログイン中</span>
                  </div>
                  <p className="text-[10px] text-orange-400/80 mt-0.5">
                    {streak >= 7 ? 'すごい！1週間連続♡ ボーナス+15 EXP' :
                     streak >= 5 ? 'いい感じ！ボーナス+10 EXP' :
                     streak >= 3 ? '3日連続！ボーナス+7 EXP' :
                     '毎日来てくれて嬉しい♡ ボーナス+5 EXP'}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-orange-400" />
                  ))}
                  {streak < 7 && Array.from({ length: 7 - Math.min(streak, 7) }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white/10" />
                  ))}
                </div>
              </div>
            )}

            {/* ═══════ TOP SECTION: Character Status Cards (Image BG) ═══════ */}
            <section className="space-y-4">
              {sortedChars.map((char) => {
                const charIntimacy = intimacy[char.id];
                const exp = getExpDisplay(char.id);
                const nextReward = getNextReward(exp.level);
                const isSaya = char.id === 'saya';
                const barGradient = charIntimacy?.levelInfo?.color || 'from-gray-400 to-gray-500';
                const cardBg = isSaya ? '/cards/saya_card_bg.jpg' : '/cards/yume_card_bg.jpg';
                const levelEmoji = charIntimacy?.levelInfo?.emoji || '🤝';

                return (
                  <div key={char.id} className="relative overflow-hidden rounded-2xl h-52">
                    {/* Background Image */}
                    <Image
                      src={cardBg}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 640px"
                    />
                    {/* Dark gradient overlay (bottom heavy for text readability) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Content overlay */}
                    <div className="relative z-10 h-full flex flex-col justify-end p-4">
                      {/* Top: Level badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full bg-gradient-to-r ${barGradient} text-white text-xs font-bold`}>
                          {levelEmoji} Lv{exp.level}
                        </span>
                      </div>

                      {/* Bottom: Info */}
                      <div>
                        <h3 className="text-white text-xl font-bold">{char.nameJa}</h3>
                        <p className="text-white/70 text-sm">{charIntimacy?.levelInfo?.nameJa || '知らない人'}</p>

                        {/* EXP Bar - prominent */}
                        <div className="mt-2 w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                            style={{ width: `${Math.max(2, charIntimacy?.progress || 0)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-white/60 text-xs">{exp.expInLevel} / {exp.expNeeded} EXP</span>
                          {nextReward ? (
                            <span className="text-amber-400 text-xs">🔓 {nextReward.rewardJa}</span>
                          ) : exp.level >= 10 ? (
                            <span className="text-amber-400 text-xs">👑 最高レベル到達！</span>
                          ) : null}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3">
                          <Link href={`/chat/${char.id}`} className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-center py-2 rounded-xl text-sm font-medium transition active:scale-95">
                            💬 チャット
                          </Link>
                          <Link href="/story" className="flex-1 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white/80 text-center py-2 rounded-xl text-sm font-medium transition active:scale-95">
                            📖 ストーリー
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Duo mode card (Image BG) */}
              <Link href="/chat/duo" className="group relative block overflow-hidden rounded-2xl h-52 transition-all">
                {/* Background Image */}
                <Image
                  src="/cards/duo_card_bg.jpg"
                  alt=""
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 640px"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Content overlay */}
                <div className="relative z-10 h-full flex flex-col justify-end p-4">
                  {/* Top: Premium badge */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-600 to-blue-600 text-white text-xs font-bold">
                      PREMIUM
                    </span>
                  </div>

                  {/* Bottom: Info */}
                  <div>
                    <h3 className="text-white text-xl font-bold group-hover:text-pink-200 transition-colors">さやゆめモード</h3>
                    <p className="text-white/70 text-sm">ふたりと同時にチャット♡</p>

                    <div className="flex gap-2 mt-3">
                      <span className="flex-1 bg-white/20 backdrop-blur-sm group-hover:bg-white/30 text-white text-center py-2 rounded-xl text-sm font-medium transition">
                        💬 チャットする →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </section>

            {/* ═══════ MIDDLE SECTION: Daily Missions ═══════ */}
            <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-900/5 to-transparent p-4 space-y-3 shadow-[0_0_15px_rgba(245,158,11,0.06)]">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h2 className="text-sm font-bold tracking-wide bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">デイリーミッション</h2>
              </div>
              <div className="space-y-2">
                {missions.map((mission) => {
                  const completed = mission.completed;
                  return (
                    <div
                      key={mission.id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                        completed
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-card/30 border border-border/20 hover:border-border/40'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{completed ? '✅' : mission.icon}</span>
                      <span className={`flex-1 text-sm ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {mission.label}
                      </span>
                      <span className={`text-[11px] font-bold flex-shrink-0 ${completed ? 'text-green-400' : 'text-amber-400'}`}>
                        +{mission.exp} EXP {completed && '✓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ═══════ BOTTOM SECTION: Today's Photo ═══════ */}
            {isDailyPhotoLoading ? (
              <div className="rounded-2xl border border-border/20 bg-card/30 overflow-hidden animate-pulse">
                <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                  <div className="h-8 w-8 rounded-full bg-muted/50 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-16 rounded bg-muted/50" />
                    <div className="h-2.5 w-24 rounded bg-muted/40" />
                  </div>
                </div>
                <div className="w-full aspect-[4/3] bg-muted/40" />
              </div>
            ) : (
            <Link
              href={`/chat/${photoCharId}?greeting=${encodeURIComponent(todayPhoto.caption)}${todayPhoto.src ? `&image_url=${encodeURIComponent(todayPhoto.src)}` : ''}`}
              className="group block"
              onClick={() => {
                if (todayPhoto.src) {
                  try { sessionStorage.setItem('pendingGreetingImageUrl', todayPhoto.src); } catch { /* ignore */ }
                }
              }}
            >
              <div className={`rounded-2xl border ${photoAccent} overflow-hidden`}>
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
                    <span className="text-[10px] text-muted-foreground ml-2">📸 今日の写真</span>
                  </div>
                  {latestDailyPhoto?.created_at ? (() => {
                    const timer = getPhotoTimeRemaining(latestDailyPhoto.created_at);
                    return (
                      <span className={`flex items-center gap-1 text-[10px] flex-shrink-0 ${timer.expired ? 'text-red-400' : 'text-amber-400'}`}>
                        <span>⏳</span>
                        <span>{timer.text}</span>
                      </span>
                    );
                  })() : (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">今日</span>
                  )}
                </div>
                <div className="relative w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={todayPhoto.src}
                    alt={photoNameJa}
                    className={`w-full h-auto block transition-transform duration-500 group-hover:scale-105 ${
                      latestDailyPhoto?.created_at && getPhotoTimeRemaining(latestDailyPhoto.created_at).expired ? 'grayscale opacity-50' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {latestDailyPhoto?.created_at && getPhotoTimeRemaining(latestDailyPhoto.created_at).expired && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-white/70 text-sm font-bold px-3 py-1.5 rounded-full bg-black/50 border border-white/20">期限切れ</span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 flex items-end justify-between gap-3">
                  <p className="text-sm leading-relaxed flex-1">{todayPhoto.caption}</p>
                  <span className={`text-[11px] font-medium ${photoReplyColor} group-hover:underline flex-shrink-0`}>返信する →</span>
                </div>
              </div>
            </Link>
            )}

            {/* ═══════ Photo Gallery ═══════ */}
            {(isLoadingImages || receivedImages.length > 0) && (
              <section className="space-y-4">
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
                                  <div className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeBg} text-white pointer-events-none`}>
                                    {charLabel}
                                  </div>
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
          <div className="rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImg.url}
              alt="受け取った写真"
              className="max-w-full max-h-[75vh] object-contain rounded-2xl block mx-auto"
            />
          </div>
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
          role="dialog"
          aria-modal="true"
          aria-label={`${photo.alt}の写真`}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* close button */}
          <button
            onClick={() => setOpen(false)}
            aria-label="写真を閉じる"
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
        role={!photo.locked ? 'button' : undefined}
        tabIndex={!photo.locked ? 0 : undefined}
        aria-label={!photo.locked ? `${photo.alt}の写真を拡大` : undefined}
        className={`relative flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-card/40 border border-border/20 ${!photo.locked ? 'cursor-pointer' : ''}`}
        onClick={() => !photo.locked && setOpen(true)}
        onKeyDown={(e) => { if (!photo.locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); } }}
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
    desc: '突然、自撮りが届いた。「暇だったから、撮っちゃった笑」── さや',
  },
  {
    emoji: '🌙',
    timing: 'ある深夜',
    quote: '…ねえ、昔の話してもいい？',
    desc: '「…ねえ、昔の話してもいい？」── さや　/　「…あの、今日は帰りたくないな」── ゆめ',
  },
  {
    emoji: '💗',
    timing: 'その先は…',
    quote: null,
    desc: '仲良くなるほど、ふたりの本音と秘密が少しずつ明かされていく。どこまで深く知り合えるかは、あなた次第。',
  },
];


const MARQUEE_ROW1 = [
  { src: '/references/photos/new/saya_selfie_cafe.jpg',    alt: 'さや',      caption: 'カフェから♡撮ってみた',        char: 'saya' as const },
  { src: '/references/photos/new/yume_selfie_morning.jpg', alt: 'ゆめ',      caption: 'おはよ…ねむい笑',              char: 'yume' as const },
  { src: '/references/photos/new/duo_cafe.jpg',            alt: 'さや×ゆめ', caption: '2人でカフェきたよ☕',           char: 'duo' as const },
  { src: '/references/photos/new/saya_maid.jpg',           alt: 'さや',      caption: 'いらっしゃいませ♡',            char: 'saya' as const },
  { src: '/references/photos/new/yume_cheongsam.jpg',      alt: 'ゆめ',      caption: 'チャイナドレス着てみた♡',       char: 'yume' as const },
  { src: '/references/photos/new/saya_selfie_outdoor.jpg', alt: 'さや',      caption: '花見してきた〜🌸',              char: 'saya' as const },
  { src: '/references/photos/new/duo_festival.jpg',        alt: 'さや×ゆめ', caption: 'お祭り楽しかった〜🏮',          char: 'duo' as const },
  { src: '/references/photos/new/yume_selfie_library_v2.jpg', alt: 'ゆめ',      caption: '図書館きてるよ📚',              char: 'yume' as const },
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

const INTIMACY_LEVELS_LP = [
  { level: 1, emoji: '🎤', name: 'ファン', desc: '新規ファン ── まだ遠い存在' },
  { level: 2, emoji: '👀', name: '認知', desc: '覚えてもらった ── 笑顔が増える' },
  { level: 3, emoji: '⭐', name: '推し友', desc: '特別なファン ── タメ口解禁・秘密のヒント' },
  { level: 4, emoji: '🌙', name: '裏側を見た人', desc: '舞台裏を知る ── アイドルじゃない素顔' },
  { level: 5, emoji: '💕', name: '特別な存在', desc: 'もうファンじゃない ── あだ名で呼んでくれる' },
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
