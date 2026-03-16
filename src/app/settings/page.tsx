'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PLANS, PlanType } from '@/lib/plans';
import type { User } from '@supabase/supabase-js';

interface SubscriptionInfo {
  plan: PlanType;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameSaved, setNicknameSaved] = useState(false);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  // 解約フロー
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      const { data: dbUser } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('auth_id', user.id)
        .single();

      if (dbUser) {
        setDbUserId(dbUser.id);
        setNickname((dbUser as { id: string; display_name: string | null }).display_name || '');

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, status, current_period_end, cancel_at_period_end')
          .eq('user_id', dbUser.id)
          .eq('status', 'active')
          .single();

        if (sub) {
          setSubscription(sub as SubscriptionInfo);
        } else {
          setSubscription({ plan: 'free', status: 'active', current_period_end: null, cancel_at_period_end: false });
        }
      }

      setLoading(false);
    }
    loadData();
  }, [router]);

  const handleSaveNickname = async () => {
    if (!dbUserId) return;
    setNicknameSaving(true);
    const supabase = createClient();
    await supabase.from('users').update({ display_name: nickname.trim() || null }).eq('id', dbUserId);
    setNicknameSaving(false);
    setNicknameSaved(true);
    setTimeout(() => setNicknameSaved(false), 2000);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setPortalError('Something went wrong. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSubscription(prev => prev ? {
          ...prev,
          cancel_at_period_end: true,
          current_period_end: data.current_period_end,
        } : prev);
        setShowCancelModal(false);
      } else {
        setCancelError(data.error || '解約処理に失敗しました。もう一度お試しください。');
      }
    } catch {
      setCancelError('解約処理に失敗しました。もう一度お試しください。');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivate = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSubscription(prev => prev ? {
          ...prev,
          cancel_at_period_end: false,
          current_period_end: data.current_period_end,
        } : prev);
      } else {
        setCancelError(data.error || '処理に失敗しました。もう一度お試しください。');
      }
    } catch {
      setCancelError('処理に失敗しました。もう一度お試しください。');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  const plan = subscription ? PLANS[subscription.plan] : PLANS.free;
  const isPaid = subscription?.plan !== 'free';
  const isCancelScheduled = subscription?.cancel_at_period_end === true;
  const periodEndDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        {/* ヘッダー */}
        <div>
          <a href="/" className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block">
            ← 戻る
          </a>
          <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        </div>

        {/* アカウント情報 */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">アカウント</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">メールアドレス</span>
            <span className="text-sm truncate max-w-[200px]">{user?.email}</span>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">ニックネーム</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="さや & ゆめに呼んでもらう名前"
                maxLength={20}
                className="flex-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-base outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
              />
              <button
                onClick={handleSaveNickname}
                disabled={nicknameSaving}
                className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors min-w-[56px]"
              >
                {nicknameSaved ? '✓' : nicknameSaving ? '...' : '保存'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">さや & ゆめがこの名前で呼んでくれます ♡</p>
          </div>
        </div>

        {/* サブスクリプション */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">プラン管理</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{plan.nameJa}</span>
              {isPaid && !isCancelScheduled && (
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  利用中
                </span>
              )}
              {isCancelScheduled && (
                <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                  解約予定
                </span>
              )}
            </div>
            <span className="text-lg font-bold">
              {plan.price === 0 ? 'Free' : `¥${plan.price.toLocaleString()}/mo`}
            </span>
          </div>

          {/* プラン特典 */}
          <ul className="space-y-1.5">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-green-500 flex-shrink-0">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          {/* 解約予定ステータス */}
          {isCancelScheduled && (
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5">⚠️</span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-orange-300">自動継続は停止されています</p>
                  {periodEndDate ? (
                    <p className="text-sm text-foreground/80">
                      <span className="font-bold text-white">{periodEndDate}</span> までは引き続き{plan.nameJa}プランをご利用いただけます。
                    </p>
                  ) : (
                    <p className="text-sm text-foreground/80">現在の請求期間が終わるまでご利用いただけます。</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    期間終了後は自動的にFreeプランに切り替わります。追加の請求は発生しません。
                  </p>
                </div>
              </div>
              <button
                onClick={handleReactivate}
                disabled={cancelLoading}
                className="w-full rounded-lg border border-blue-500/30 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? '処理中...' : '解約を取り消して継続する'}
              </button>
            </div>
          )}

          {/* 次回更新日（解約予定でない場合） */}
          {!isCancelScheduled && periodEndDate && (
            <p className="text-xs text-muted-foreground">
              次回更新日: {periodEndDate}（自動継続）
            </p>
          )}

          {cancelError && (
            <p className="text-xs text-red-400">{cancelError}</p>
          )}

          {/* ボタン */}
          <div className="space-y-2 pt-1">
            {!isPaid ? (
              <a
                href="/pricing"
                className="block w-full rounded-xl bg-blue-600 text-white py-2.5 text-sm font-medium text-center hover:bg-blue-500 transition-colors"
              >
                プランをアップグレード
              </a>
            ) : (
              <>
                {!isCancelScheduled && (
                  <button
                    onClick={() => { setShowCancelModal(true); setCancelError(''); }}
                    className="w-full rounded-xl border border-red-500/30 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    サブスクリプションを解約する
                  </button>
                )}
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full rounded-xl border border-border/50 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  {portalLoading ? '読み込み中...' : 'Stripeで詳細を確認する'}
                </button>
              </>
            )}
          </div>
          {portalError && (
            <p className="text-xs text-red-400 mt-1">{portalError}</p>
          )}
        </div>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl border border-red-500/30 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          ログアウト
        </button>

        {/* フッター */}
        <div className="text-center space-y-1 pt-4">
          <p className="text-xs text-muted-foreground">さやゆめ v0.1.0</p>
          <p className="text-xs text-muted-foreground">18+ only · AI-generated content</p>
        </div>
      </div>

      {/* 解約確認モーダル */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border/50 p-6 space-y-5 mb-4 sm:mb-0">
            <div className="space-y-3">
              <h3 className="text-lg font-bold">解約の確認</h3>
              {/* 解約後の流れを箇条書きで明示 */}
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                  <span>
                    自動継続が停止されます。{periodEndDate && (
                      <span className="font-semibold text-foreground">（次回の請求はありません）</span>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                  <span>
                    {periodEndDate ? (
                      <><span className="font-semibold text-foreground">{periodEndDate} まで</span>は引き続き{plan.nameJa}プランをご利用いただけます。</>
                    ) : (
                      '現在の請求期間が終わるまで引き続きご利用いただけます。'
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex-shrink-0">·</span>
                  <span>期間終了後はFreeプランに自動移行します。日割り返金は行いません。</span>
                </li>
              </ul>
            </div>

            {cancelError && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{cancelError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelError(''); }}
                disabled={cancelLoading}
                className="flex-1 rounded-xl border border-border/50 py-3 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 rounded-xl bg-red-600 text-white py-3 text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? '処理中...' : '解約する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
