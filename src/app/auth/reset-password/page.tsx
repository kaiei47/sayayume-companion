'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

function translateError(msg: string): string {
  if (/new password should be different/i.test(msg)) return '新しいパスワードは現在と異なるものを入力してください。';
  if (/password should be at least/i.test(msg)) return 'パスワードは6文字以上で入力してください。';
  if (/same password/i.test(msg)) return '現在と同じパスワードは使用できません。';
  return msg;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // セッションが確立されているか確認（callbackで交換済みのはず）
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        setError('リセットリンクが無効か期限切れです。もう一度お試しください。');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('パスワードが一致しません。');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(translateError(error.message));
    } else {
      setMessage('パスワードを更新しました！');
      setTimeout(() => router.push('/'), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <a href="/">
            <Image src="/icons/icon-192.png" alt="さやゆめ" width={52} height={52} className="rounded-2xl" />
          </a>
          <h1 className="text-2xl font-bold tracking-tight">新しいパスワードを設定</h1>
          <p className="text-sm text-muted-foreground">6文字以上のパスワードを入力してください</p>
        </div>

        {!sessionReady && !error && (
          <p className="text-center text-sm text-muted-foreground">確認中...</p>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
            {error}
            <br />
            <a href="/login" className="underline mt-2 inline-block">ログインページへ戻る</a>
          </div>
        )}

        {message && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400 text-center">
            {message}
            <br />
            <span className="text-xs">トップページに移動します...</span>
          </div>
        )}

        {sessionReady && !message && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新しいパスワード（6文字以上）"
              required
              minLength={6}
              className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all placeholder:text-muted-foreground/50"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="パスワードを確認"
              required
              minLength={6}
              className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all placeholder:text-muted-foreground/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 bg-gradient-to-r from-pink-600 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-pink-500/10 transition-all"
            >
              {loading ? '更新中...' : 'パスワードを更新する'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
