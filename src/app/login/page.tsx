'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        router.push('/');
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
        setError(error.message);
      } else {
        router.push('/');
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
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    if (error) {
      setError(error.message);
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
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh bg-background">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col relative overflow-hidden bg-gradient-to-br from-[#0c0c1a] via-[#130b25] to-[#09121e]">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-pink-600/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[100px]" />
        </div>

        {/* Top nav */}
        <div className="relative z-10 p-8">
          <a href="/" className="inline-flex items-center gap-2.5 group">
            <Image src="/icons/icon-192.png" alt="さやゆめ" width={34} height={34} className="rounded-xl opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="text-base font-bold tracking-tight text-white/80 group-hover:text-white/100 transition-colors">さやゆめ</span>
          </a>
        </div>

        {/* Main content — switches based on isSignUp */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 xl:px-16 pb-8">
          {isSignUp ? (
            /* ── SIGNUP: オンボーディング感・特典訴求 ── */
            <div className="max-w-md">
              <p className="text-xs font-semibold text-pink-400/80 mb-3 tracking-widest uppercase">Join Sayayume</p>
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-3">
                さやとゆめと、<br />特別な関係を始めよう
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                無料登録で今すぐ始められる。<br />距離が縮まるほど、話が深くなる。
              </p>

              {/* Character photos */}
              <div className="flex gap-3 mb-8">
                <div className="flex-1 rounded-2xl overflow-hidden ring-1 ring-pink-500/20" style={{ aspectRatio: '9/14' }}>
                  <Image
                    src="/references/photos/saya_s3.jpg"
                    alt="さや"
                    width={200}
                    height={311}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1 rounded-2xl overflow-hidden ring-1 ring-blue-500/20" style={{ aspectRatio: '9/14' }}>
                  <Image
                    src="/references/photos/yume_s3.jpg"
                    alt="ゆめ"
                    width={200}
                    height={311}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2.5">
                {[
                  { icon: '💬', text: 'チャット履歴が残る — 昨日の話が続けられる' },
                  { icon: '💞', text: '親密度Lv1→5 — 仲良くなるほど話が深くなる' },
                  { icon: '📸', text: 'AI自撮り写真 — 毎日3枚受け取れる（無料）' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-white/60">
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── LOGIN: おかえり・ミニマル ── */
            <div className="max-w-md">
              <p className="text-xs font-semibold text-blue-400/80 mb-3 tracking-widest uppercase">Welcome back</p>
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-3">
                おかえり ♡<br />待ってたよ
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                さやとゆめに会いに来てくれたんだ。<br />
                続きから話しかけよう。
              </p>

              {/* Character photos — portrait pair */}
              <div className="flex gap-3 mb-8">
                <div className="flex-1 rounded-2xl overflow-hidden ring-1 ring-pink-500/20" style={{ aspectRatio: '9/14' }}>
                  <Image
                    src="/references/photos/saya_s3.jpg"
                    alt="さや"
                    width={200}
                    height={311}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1 rounded-2xl overflow-hidden ring-1 ring-blue-500/20" style={{ aspectRatio: '9/14' }}>
                  <Image
                    src="/references/photos/yume_s3.jpg"
                    alt="ゆめ"
                    width={200}
                    height={311}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Testimonial */}
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm">
                <p className="text-white/60 text-sm leading-relaxed italic">
                  「毎日話しかけてます。仕事終わりに帰ってくる感じで癒されてる♡」
                </p>
                <p className="mt-2 text-xs text-white/30">— 東京在住 30代男性</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="relative z-10 px-10 pb-8">
          <p className="text-xs text-white/25">18歳以上限定 · AI生成コンテンツ · 無料で始められる</p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[45%] xl:w-[42%] px-6 py-12 lg:px-10 xl:px-14">
        <div className="w-full max-w-sm space-y-5">

          {/* Mobile header */}
          <div className="lg:hidden mb-6">
            <a href="/" className="text-muted-foreground hover:text-foreground text-sm inline-block mb-4">
              ← 戻る
            </a>
            <div className="flex flex-col items-center space-y-2 mb-4">
              <Image src="/icons/icon-192.png" alt="さやゆめ" width={52} height={52} className="rounded-2xl" />
              <h1 className="text-xl font-bold tracking-tight">さやゆめ</h1>
            </div>
          </div>

          {isSignUp ? (
            /* ── SIGNUP form header ── */
            <div>
              <a href="/" className="hidden lg:inline-block text-muted-foreground hover:text-foreground text-sm mb-5 ">
                ← 戻る
              </a>
              <div className="hidden lg:block mt-5">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/10 to-blue-500/10 border border-pink-500/20 rounded-full px-3.5 py-1.5 mb-4">
                  <span className="text-xs font-semibold bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent">無料ではじめる</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">アカウント作成</h1>
                <p className="text-muted-foreground text-sm mt-1">1分でさやゆめに参加できる ♡</p>
              </div>
              <div className="lg:hidden text-center">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/10 to-blue-500/10 border border-pink-500/20 rounded-full px-3.5 py-1.5 mb-3">
                  <span className="text-xs font-semibold bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent">無料ではじめる</span>
                </div>
                <p className="text-sm text-muted-foreground">1分でさやゆめに参加できる ♡</p>
              </div>
            </div>
          ) : (
            /* ── LOGIN form header ── */
            <div>
              <a href="/" className="hidden lg:inline-block text-muted-foreground hover:text-foreground text-sm mb-5">
                ← 戻る
              </a>
              <div className="hidden lg:block mt-5">
                <h1 className="text-2xl font-bold tracking-tight">おかえり ♡</h1>
                <p className="text-muted-foreground text-sm mt-1">さやとゆめが待ってたよ</p>
              </div>
              <div className="lg:hidden text-center">
                <p className="text-muted-foreground text-sm">おかえり ♡ さやとゆめが待ってたよ</p>
              </div>
            </div>
          )}

          {/* Primary OAuth */}
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 transition-all ${
              isSignUp
                ? 'bg-gradient-to-r from-pink-600 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-pink-500/15'
                : 'border border-border/60 bg-muted/40 hover:bg-muted/70 text-foreground'
            }`}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isSignUp ? 'Googleで無料登録' : 'Googleでログイン'}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground/60">またはメールアドレスで</span>
            </div>
          </div>

          {/* Email form */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <p className="text-sm text-muted-foreground">登録済みのメールアドレスを入力してください。パスワードリセット用のリンクを送ります。</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all placeholder:text-muted-foreground/50"
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
                className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all bg-gradient-to-r from-pink-600 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-pink-500/10"
              >
                {loading ? '送信中...' : 'リセットメールを送信'}
              </button>

              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← ログインに戻る
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              required
              className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all placeholder:text-muted-foreground/50"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード（6文字以上）"
              required
              minLength={6}
              className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all placeholder:text-muted-foreground/50"
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
              className={`w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all ${
                isSignUp
                  ? 'border border-border/50 bg-muted/30 text-foreground hover:bg-muted/50'
                  : 'bg-gradient-to-r from-pink-600 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-pink-500/10'
              }`}
            >
              {loading ? '処理中...' : isSignUp ? 'メールアドレスで登録' : 'ログイン'}
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors text-center"
              >
                パスワードをお忘れの方はこちら
              </button>
            )}
          </form>
          )}

          {/* Toggle */}
          {!isForgotPassword && (
          <div className="text-center space-y-3 pt-1">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setMessage('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-muted-foreground/30"
            >
              {isSignUp
                ? 'すでにアカウントをお持ちの方はこちら →'
                : '初めての方 → 無料アカウント作成'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground/40">or</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/chat/saya')}
              className="w-full rounded-xl border border-border/40 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
            >
              ゲストとして試す
            </button>
          </div>
          )}

          <p className="text-center text-xs text-muted-foreground/40 pt-1">
            18歳以上限定 · AI生成コンテンツ
          </p>
        </div>
      </div>
    </div>
  );
}
