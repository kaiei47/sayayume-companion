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
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (dbUser) {
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

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch {
      alert('エラーが発生しました');
    } finally {
      setPortalLoading(false);
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
        <div className="animate-pulse text-muted-foreground text-sm">読み込み中...</div>
      </div>
    );
  }

  const plan = subscription ? PLANS[subscription.plan] : PLANS.free;

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        {/* ヘッダー */}
        <div>
          <a href="/" className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block">
            ← トップに戻る
          </a>
          <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        </div>

        {/* アカウント情報 */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">アカウント</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">メール</span>
            <span className="text-sm truncate max-w-[200px]">{user?.email}</span>
          </div>
        </div>

        {/* サブスクリプション */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">プラン</h2>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold">{plan.nameJa}</span>
              {subscription?.plan !== 'free' && (
                <span className="ml-2 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  アクティブ
                </span>
              )}
            </div>
            <span className="text-lg font-bold">
              {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}/月`}
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

          {/* 更新日 */}
          {subscription?.current_period_end && (
            <p className="text-xs text-muted-foreground">
              {subscription.cancel_at_period_end
                ? `${new Date(subscription.current_period_end).toLocaleDateString('ja-JP')} に終了予定`
                : `次回更新: ${new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}`}
            </p>
          )}

          {/* ボタン */}
          <div className="flex gap-2 pt-1">
            {subscription?.plan === 'free' ? (
              <a
                href="/pricing"
                className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 text-sm font-medium text-center hover:bg-blue-500 transition-colors"
              >
                プランをアップグレード
              </a>
            ) : (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex-1 rounded-xl border border-border/50 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                {portalLoading ? '処理中...' : 'サブスクリプションを管理'}
              </button>
            )}
          </div>
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
          <p className="text-xs text-muted-foreground">18歳以上限定 · AI生成コンテンツ</p>
        </div>
      </div>
    </div>
  );
}
