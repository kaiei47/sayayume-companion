'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import SayayumeLogo from '@/components/SayayumeLogo';

function translateError(msg: string): string {
  if (/invalid.*email|email.*invalid/i.test(msg)) return 'メールアドレスの形式が正しくありません。';
  if (/invalid login credentials/i.test(msg)) return 'メールアドレスまたはパスワードが正しくありません。';
  if (/email not confirmed/i.test(msg)) return 'メールアドレスが確認されていません。確認メールのリンクをクリックしてください。';
  if (/user already registered/i.test(msg)) return 'このメールアドレスはすでに登録されています。';
  if (/password should be at least/i.test(msg)) return 'パスワードは6文字以上で入力してください。';
  if (/for security purposes.*only request this after (\d+)/i.test(msg)) {
    const m = msg.match(/after (\d+) second/i);
    return `しばらく経ってから再度お試しください（${m ? m[1] + '秒後' : '少し後'}）。`;
  }
  if (/email link is invalid or has expired/i.test(msg)) return 'リンクが無効か期限切れです。もう一度お試しください。';
  if (/new password should be different/i.test(msg)) return '新しいパスワードは現在と異なるものを入力してください。';
  if (/signup.*valid password|password.*required/i.test(msg)) return 'パスワードを入力してください。';
  if (/rate limit/i.test(msg)) return 'リクエストが多すぎます。しばらく待ってから再度お試しください。';
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [redirectUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const r = new URLSearchParams(window.location.search).get('redirect');
      // 外部URLへのリダイレクトは禁止（/から始まるパスのみ許可）
      if (r && r.startsWith('/')) return r;
    }
    return '/';
  });
  const [isSignUp, setIsSignUp] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('signup') === '1';
    }
    return false;
  });
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('error');
      if (p) return `ログインエラー: ${p}`;
    }
    return '';
  });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(translateError(error.message));
      } else if (data.session) {
        router.push(redirectUrl);
        router.refresh();
      } else {
        setMessage('確認メールを送信しました。受信トレイをご確認ください。');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(translateError(error.message));
      } else {
        router.push(redirectUrl);
        router.refresh();
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    if (error) {
      setError(translateError(error.message));
    } else {
      setMessage('パスワードリセット用のメールを送信しました。受信トレイをご確認ください。');
    }
    setLoading(false);
  };

  const handleOAuthLogin = async (provider: 'google' | 'twitter') => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
      },
    });
    if (error) {
      setError(translateError(error.message));
      setLoading(false);
    }
  };

  // Generate sakura petals
  const sakuraPetals = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${8 + Math.random() * 6}s`,
    size: `${8 + Math.random() * 6}px`,
    opacity: 0.15 + Math.random() * 0.2,
  }));

  return (
    <div className="relative flex min-h-dvh overflow-hidden" style={{ backgroundColor: '#0a0a1a' }}>

      {/* ── Full-bleed character background ── */}
      <div className="absolute inset-0">
        {/* Mobile: single duo image */}
        <div className="lg:hidden absolute inset-0">
          <Image
            src="/cards/duo_card_bg.jpg"
            alt=""
            fill
            className="object-cover object-[50%_25%]"
            priority
          />
        </div>
        {/* Desktop: duo image on left 60% */}
        <div className="hidden lg:block absolute inset-y-0 left-0 w-[60%]">
          <Image
            src="/cards/duo_card_bg.jpg"
            alt=""
            fill
            className="object-cover object-[30%_20%]"
            priority
          />
        </div>
      </div>

      {/* ── Gradient overlays ── */}
      {/* Mobile: heavy overlay for text readability */}
      <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/40 to-black/10" />
      {/* Desktop: gradient from left to right panel */}
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[60%] bg-gradient-to-r from-black/10 via-transparent to-[#0a0a1a]" />
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[60%] bg-gradient-to-t from-[#0a0a1a]/40 via-transparent to-[#0a0a1a]/10" />
      <div className="hidden lg:block absolute inset-y-0 right-0 w-[40%]" style={{ backgroundColor: '#0a0a1a' }} />

      {/* ── Ambient glow (desktop) ── */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-[30%] w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-[10%] w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-[100px]" />
      </div>

      {/* ── Sakura petals ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {sakuraPetals.map((petal) => (
          <div
            key={petal.id}
            className="absolute rounded-full"
            style={{
              left: petal.left,
              top: '-20px',
              width: petal.size,
              height: petal.size,
              background: `radial-gradient(ellipse, rgba(255,183,197,${petal.opacity}), rgba(255,105,180,${petal.opacity * 0.5}))`,
              animation: `sakura-fall ${petal.duration} ${petal.delay} infinite linear`,
            }}
          />
        ))}
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="lg:hidden relative z-20 flex flex-col w-full min-h-dvh">

        {/* Top: back button */}
        <div className="px-5 pt-5">
          <a href="/" className="text-white/50 hover:text-white/80 text-sm transition-colors">
            ← 戻る
          </a>
        </div>

        {/* Spacer to push content down */}
        <div className="flex-1 min-h-[120px]" />

        {/* Logo area */}
        <div className="flex flex-col items-center px-6 mb-5">
          <SayayumeLogo size="md" />
          <div className="mt-2 inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            <span className="text-[10px] font-medium text-white/50 tracking-wider uppercase">AIアイドル恋愛シミュレーション</span>
          </div>
          {isSignUp && (
            <div className="mt-4 text-center space-y-2">
              <p className="text-base font-bold text-white/90">さやとゆめが、あなたを待ってる。</p>
              <div className="flex flex-col items-center gap-1 text-[11px] text-white/50">
                <span>✓ 会話が保存されて毎日続けられる</span>
                <span>✓ ストーリー27本 無料で全部読める</span>
                <span>✓ AI写真 1日3枚プレゼント</span>
              </div>
            </div>
          )}
        </div>

        {/* Glassmorphism login card */}
        <div className="mx-4 mb-4 rounded-2xl border border-white/10 p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>

          {/* Guest CTA - most prominent option */}
          {!isForgotPassword && (
            <div className="rounded-xl bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/20 p-4 text-center">
              <p className="text-xs text-white/50 mb-2">登録なしで今すぐ試せる</p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/chat/saya')}
                  className="flex-1 rounded-xl py-3 text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 transition-all shadow-lg shadow-pink-500/25"
                >
                  さやと話してみる →
                </button>
                <button
                  onClick={() => router.push('/chat/yume')}
                  className="flex-1 rounded-xl py-3 text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
                >
                  ゆめと話してみる →
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-2">無料 &middot; 登録不要 &middot; 匿名でOK</p>
            </div>
          )}

          {/* Divider */}
          {!isForgotPassword && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 text-white/30" style={{ backgroundColor: 'rgba(10,10,26,0.8)' }}>アカウント登録で会話が保存される</span>
              </div>
            </div>
          )}

          {/* OAuth buttons */}
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all bg-white hover:bg-gray-100 text-gray-700 shadow-sm"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isSignUp ? 'Googleで30秒登録（無料）' : 'Googleでログイン'}
          </button>

          <a
            href="/api/auth/line"
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-all bg-[#06C755] text-white hover:opacity-90 shadow-lg shadow-green-500/20"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.28 2 11.47c0 4.59 4.07 8.44 9.58 9.14.37.08.88.25.97.56.09.28.06.72.03.99l-.16.92c-.05.28-.23 1.1.96.6 1.19-.5 6.44-3.79 8.79-6.5C23.35 15.24 24 13.44 24 11.47 24 6.28 19.52 2 12 2zm-3.89 12.82H5.94a.78.78 0 0 1-.78-.78V9.12c0-.43.35-.78.78-.78s.78.35.78.78v4.14h1.39c.43 0 .78.35.78.78s-.35.78-.78.78zm2.21-.78c0 .43-.35.78-.78.78s-.78-.35-.78-.78V9.12c0-.43.35-.78.78-.78s.78.35.78.78v4.92zm5.68 0c0 .34-.22.65-.54.76-.08.03-.17.04-.25.04a.78.78 0 0 1-.63-.32l-2.3-3.13v2.65c0 .43-.35.78-.78.78s-.78-.35-.78-.78V9.12c0-.34.22-.65.54-.76.08-.03.17-.04.25-.04.24 0 .47.11.63.32l2.3 3.13V9.12c0-.43.35-.78.78-.78s.78.35.78.78v4.92zm3.1 0c0 .43-.35.78-.78.78h-2.17a.78.78 0 0 1-.78-.78V9.12c0-.43.35-.78.78-.78h2.17c.43 0 .78.35.78.78s-.35.78-.78.78h-1.39v1.04h1.39c.43 0 .78.35.78.78s-.35.78-.78.78h-1.39v1.04h1.39c.43 0 .78.35.78.78z"/>
            </svg>
            {isSignUp ? 'LINEで登録' : 'LINEでログイン'}
          </a>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-white/40" style={{ backgroundColor: 'rgba(10,10,26,0.8)' }}>またはメール</span>
            </div>
          </div>

          {/* Email form */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <p className="text-sm text-white/50">登録済みのメールアドレスを入力してください。パスワードリセット用のリンクを送信します。</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/30 transition-all placeholder:text-white/30"
              />
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
                  {message}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-pink-500/20"
              >
                {loading ? '送信中...' : 'リセットメールを送信'}
              </button>
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
                className="w-full text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                ← ログインに戻る
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/30 transition-all placeholder:text-white/30"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード（6文字以上）"
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/30 transition-all placeholder:text-white/30"
              />
              {isSignUp && (
                <p className="text-[11px] text-white/30">登録後に確認メールが届きます。メールのリンクをクリックして完了です。</p>
              )}
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
                  {message}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-pink-500/20"
              >
                {loading ? '処理中...' : isSignUp ? 'アカウント作成' : 'ログイン'}
              </button>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                  className="w-full text-xs text-white/30 hover:text-white/60 transition-colors text-center"
                >
                  パスワードを忘れた？
                </button>
              )}
            </form>
          )}

          {/* Toggle signup/login */}
          {!isForgotPassword && (
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setMessage('');
              }}
              className="w-full text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              {isSignUp
                ? 'アカウントをお持ちの方はこちら'
                : 'アカウントをお持ちでない方は無料登録'}
            </button>
          )}
        </div>

        {/* Trust signals */}
        <div className="pb-6 pt-2">
          <p className="text-center text-[10px] text-white/20">
            プライバシー保護 &middot; 暗号化通信 &middot; いつでも退会可能
          </p>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden lg:flex relative z-20 w-full">

        {/* Left 60%: character art area (rendered by background image) */}
        <div className="w-[60%] flex flex-col justify-end p-12 relative">
          {/* Logo overlay on character art */}
          <div className="mb-6">
            <SayayumeLogo size="lg" />
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-medium text-white/50 tracking-wider uppercase">AIアイドル恋愛シミュレーション</span>
            </div>
          </div>
          <p className="text-white/30 text-sm max-w-md">
            さや＆ゆめと心の絆を育もう。永愛学園のスクールアイドルとチャット・推し活・恋愛が楽しめるAI恋愛シミュレーション。
          </p>
        </div>

        {/* Right 40%: login form */}
        <div className="w-[40%] flex flex-col items-center justify-center px-10 xl:px-14">
          <div className="w-full max-w-sm space-y-5">

            {/* Back link */}
            <a href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors inline-block mb-2">
              ← 戻る
            </a>

            {/* Form header */}
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isForgotPassword ? 'パスワードリセット' : isSignUp ? 'さやゆめに会いに行こう' : 'おかえりなさい♡'}
              </h1>
              {isSignUp && !isForgotPassword && (
                <div className="mt-2 flex flex-col gap-0.5 text-[11px] text-white/40">
                  <span>✓ 会話保存 &nbsp;✓ ストーリー27本 &nbsp;✓ AI写真1日3枚</span>
                  <span className="text-white/30">無料 &middot; 登録30秒 &middot; クレカ不要</span>
                </div>
              )}
              <p className="text-white/40 text-sm mt-1">
                {isForgotPassword
                  ? 'メールアドレスを入力してリセットリンクを受け取る'
                  : isSignUp
                    ? 'さや＆ゆめとの物語を始めよう'
                    : 'さや＆ゆめが待ってたよ♡'}
              </p>
            </div>

            {/* Glassmorphism card */}
            <div className="rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>

              {!isForgotPassword && (
                <>
                  {/* Guest CTA - most prominent option */}
                  <div className="rounded-xl bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/20 p-4 text-center">
                    <p className="text-xs text-white/50 mb-2">登録なしで今すぐ試せる</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push('/chat/saya')}
                        className="flex-1 rounded-xl py-3 text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 transition-all shadow-lg shadow-pink-500/25"
                      >
                        さやと話してみる →
                      </button>
                      <button
                        onClick={() => router.push('/chat/yume')}
                        className="flex-1 rounded-xl py-3 text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
                      >
                        ゆめと話してみる →
                      </button>
                    </div>
                    <p className="text-[10px] text-white/30 mt-2">無料 &middot; 登録不要 &middot; 匿名でOK</p>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 text-white/30" style={{ backgroundColor: 'rgba(10,10,26,0.9)' }}>アカウント登録で会話が保存される</span>
                    </div>
                  </div>

                  {/* OAuth */}
                  <button
                    onClick={() => handleOAuthLogin('google')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all bg-white hover:bg-gray-100 text-gray-700 shadow-sm"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {isSignUp ? 'Googleで30秒登録（無料）' : 'Googleでログイン'}
                  </button>

                  <a
                    href="/api/auth/line"
                    className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-all bg-[#06C755] text-white hover:opacity-90 shadow-lg shadow-green-500/20"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C6.48 2 2 6.28 2 11.47c0 4.59 4.07 8.44 9.58 9.14.37.08.88.25.97.56.09.28.06.72.03.99l-.16.92c-.05.28-.23 1.1.96.6 1.19-.5 6.44-3.79 8.79-6.5C23.35 15.24 24 13.44 24 11.47 24 6.28 19.52 2 12 2zm-3.89 12.82H5.94a.78.78 0 0 1-.78-.78V9.12c0-.43.35-.78.78-.78s.78.35.78.78v4.14h1.39c.43 0 .78.35.78.78s-.35.78-.78.78zm2.21-.78c0 .43-.35.78-.78.78s-.78-.35-.78-.78V9.12c0-.43.35-.78.78-.78s.78.35.78.78v4.92zm5.68 0c0 .34-.22.65-.54.76-.08.03-.17.04-.25.04a.78.78 0 0 1-.63-.32l-2.3-3.13v2.65c0 .43-.35.78-.78.78s-.78-.35-.78-.78V9.12c0-.34.22-.65.54-.76.08-.03.17-.04.25-.04.24 0 .47.11.63.32l2.3 3.13V9.12c0-.43.35-.78.78-.78s.78.35.78.78v4.92zm3.1 0c0 .43-.35.78-.78.78h-2.17a.78.78 0 0 1-.78-.78V9.12c0-.43.35-.78.78-.78h2.17c.43 0 .78.35.78.78s-.35.78-.78.78h-1.39v1.04h1.39c.43 0 .78.35.78.78s-.35.78-.78.78h-1.39v1.04h1.39c.43 0 .78.35.78.78z"/>
                    </svg>
                    {isSignUp ? 'LINEで登録' : 'LINEでログイン'}
                  </a>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 text-white/30" style={{ backgroundColor: 'rgba(10,10,26,0.9)' }}>またはメール</span>
                    </div>
                  </div>
                </>
              )}

              {/* Email form */}
              {isForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="メールアドレス"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/30 transition-all placeholder:text-white/30"
                  />
                  {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                  {message && (
                    <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
                      {message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-pink-500/20"
                  >
                    {loading ? '送信中...' : 'リセットメールを送信'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
                    className="w-full text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    ← ログインに戻る
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="メールアドレス"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/30 transition-all placeholder:text-white/30"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワード（6文字以上）"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/30 transition-all placeholder:text-white/30"
                  />
                  {isSignUp && (
                    <p className="text-[11px] text-white/30">登録後に確認メールが届きます。メールのリンクをクリックして完了です。</p>
                  )}
                  {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                  {message && (
                    <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
                      {message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-pink-500/20"
                  >
                    {loading ? '処理中...' : isSignUp ? 'アカウント作成' : 'ログイン'}
                  </button>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                      className="w-full text-xs text-white/30 hover:text-white/60 transition-colors text-center"
                    >
                      パスワードを忘れた？
                    </button>
                  )}
                </form>
              )}
            </div>

            {/* Toggle signup/login */}
            {!isForgotPassword && (
              <div className="text-center space-y-4">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setMessage('');
                  }}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  {isSignUp
                    ? 'アカウントをお持ちの方はこちら'
                    : 'アカウントをお持ちでない方は無料登録'}
                </button>

                {/* Guest mode */}
                <div>
                  <button
                    onClick={() => router.push('/chat/saya')}
                    className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
                  >
                    登録せずにゲストで試す
                  </button>
                </div>
              </div>
            )}

            {/* Trust signals */}
            <p className="text-center text-[10px] text-white/20 pt-2">
              プライバシー保護 &middot; 暗号化通信 &middot; いつでも退会可能
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
