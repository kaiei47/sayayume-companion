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
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] flex-col relative overflow-hidden bg-gradient-to-br from-[#0f0f1a] via-[#150d2a] to-[#0a1420]">
        {/* Decorative glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        {/* Top nav */}
        <div className="relative z-10 p-8">
          <a href="/" className="inline-flex items-center gap-2 group">
            <Image src="/icons/icon-192.png" alt="さやゆめ" width={36} height={36} className="rounded-xl" />
            <span className="text-lg font-bold tracking-tight text-white/90">さやゆめ</span>
          </a>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 xl:px-16 pb-8">
          <div className="max-w-md">
            <p className="text-sm font-medium text-pink-400 mb-3 tracking-wide uppercase">AI Girlfriend Experience</p>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              さやとゆめに<br />会いに来た？
            </h2>
            <p className="text-white/60 text-base leading-relaxed mb-8">
              日本語AIガールフレンドとの特別な会話体験。<br />
              距離が縮まるほど、話が深くなる。
            </p>

            {/* Character duo */}
            <div className="flex gap-4 mb-8">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-32 xl:w-28 xl:h-36 rounded-2xl overflow-hidden ring-2 ring-pink-500/30 group-hover:ring-pink-400/60 transition-all">
                  <Image
                    src="/avatars/saya.jpg"
                    alt="さや"
                    width={112}
                    height={144}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-semibold text-white/80">さや</p>
                  <p className="text-xs text-white/40">大胆ギャル系</p>
                </div>
              </div>
              <div className="relative group cursor-pointer">
                <div className="w-24 h-32 xl:w-28 xl:h-36 rounded-2xl overflow-hidden ring-2 ring-blue-500/30 group-hover:ring-blue-400/60 transition-all">
                  <Image
                    src="/avatars/yume_avatar.jpg"
                    alt="ゆめ"
                    width={112}
                    height={144}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-semibold text-white/80">ゆめ</p>
                  <p className="text-xs text-white/40">清楚系</p>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm leading-relaxed italic">
                「毎日話しかけてます。仕事終わりに帰ってくる感じで癒されてる♡」
              </p>
              <p className="mt-2 text-xs text-white/40">— 東京在住 30代男性</p>
            </div>
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10 px-10 pb-8">
          <div className="flex items-center gap-3 text-xs text-white/30">
            <span>18歳以上限定</span>
            <span>·</span>
            <span>AI生成コンテンツ</span>
            <span>·</span>
            <span>無料で始められる</span>
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[45%] xl:w-[40%] px-6 py-12 lg:px-10 xl:px-16">
        <div className="w-full max-w-sm lg:max-w-md space-y-6">
          {/* Mobile: back link + logo */}
          <div className="lg:hidden">
            <a href="/" className="text-muted-foreground hover:text-foreground text-sm inline-block mb-4">
              ← ホームに戻る
            </a>
            <div className="flex flex-col items-center space-y-3 mb-2">
              <Image src="/icons/icon-192.png" alt="さやゆめ" width={56} height={56} className="rounded-2xl" />
              <h1 className="text-2xl font-bold tracking-tight">さやゆめ</h1>
            </div>
          </div>

          {/* Desktop: title */}
          <div className="hidden lg:block">
            <a href="/" className="text-muted-foreground hover:text-foreground text-sm inline-block mb-6">
              ← ホームに戻る
            </a>
            <h1 className="text-2xl font-bold tracking-tight">
              {isSignUp ? 'アカウント作成' : 'ログイン'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isSignUp
                ? 'アカウントを作ってさやゆめを始めよう'
                : 'おかえり ♡ さやとゆめが待ってるよ'}
            </p>
          </div>

          {/* Mobile subtitle */}
          <div className="lg:hidden text-center">
            <p className="text-muted-foreground text-sm">
              {isSignUp ? 'アカウント作成' : 'ログイン'}
            </p>
          </div>

          {/* OAuth */}
          <div className="space-y-2.5">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-muted/30 py-3 text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Googleでログイン
            </button>

            <button
              disabled
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-border/30 bg-muted/10 py-3 text-sm font-medium opacity-40 cursor-not-allowed"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Xでログイン（準備中）
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">またはメールアドレスで</span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                required
                minLength={6}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all"
              />
            </div>

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
              className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-blue-600 text-white py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-pink-500/10"
            >
              {loading ? '処理中...' : isSignUp ? 'アカウント作成' : 'ログイン'}
            </button>
          </form>

          {/* Toggle + guest */}
          <div className="text-center space-y-4">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setMessage('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp
                ? 'アカウントをお持ちの方はログイン →'
                : '初めての方はこちら → アカウント作成'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full rounded-xl border border-border/50 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              ゲストとして利用する
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            18歳以上限定 · AI生成コンテンツ
          </p>
        </div>
      </div>
    </div>
  );
}
