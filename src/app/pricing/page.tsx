'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLANS } from '@/lib/plans';
import { createClient } from '@/lib/supabase/client';

type PlanKey = 'free' | 'basic' | 'premium';

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
    if (searchParams.get('canceled') === 'true') {
      setShowCanceled(true);
      setTimeout(() => setShowCanceled(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    async function checkSubscription() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsLoggedIn(true);

      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (dbUser) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('user_id', dbUser.id)
          .eq('status', 'active')
          .single();

        if (sub) {
          setCurrentPlan(sub.plan);
        }
      }
    }
    checkSubscription();
  }, []);

  const handleSubscribe = async (plan: PlanKey) => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    if (plan === 'free') return;

    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (data.url) {
        // 新規サブスク → Stripe Checkoutにリダイレクト
        window.location.href = data.url;
      } else if (data.success && data.redirect) {
        // プラン変更成功 → 成功画面にリダイレクト
        setCurrentPlan(plan);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setErrorMsg(data.error || 'Payment failed. Please try again.');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setLoading('basic');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const plans: { key: PlanKey; popular?: boolean }[] = [
    { key: 'free' },
    { key: 'basic', popular: currentPlan === 'free' },
    { key: 'premium' },
  ];

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <a href="/" className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block">
            ← Back
          </a>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Plans</h1>
          <p className="text-muted-foreground">Unlock more with Saya & Yume ♡</p>
        </div>

        {/* 成功/キャンセル通知 */}
        {showSuccess && (
          <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center text-green-400 text-sm">
            Subscription started! ♡
          </div>
        )}
        {showCanceled && (
          <div className="mb-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-center text-yellow-400 text-sm">
            Payment canceled
          </div>
        )}

        {/* プランカード */}
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map(({ key, popular }) => {
            const plan = PLANS[key];
            const isCurrent = currentPlan === key;
            const isUpgrade = key !== 'free' && currentPlan === 'free';
            const hasActiveSub = currentPlan !== 'free';

            return (
              <div
                key={key}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                  isCurrent
                    ? 'border-green-500/50 bg-green-500/5 ring-1 ring-green-500/30'
                    : popular
                      ? 'border-blue-500/50 bg-blue-500/5'
                      : 'border-border/50 bg-card/50'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-3 py-0.5 text-xs font-medium text-white flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                    Current plan
                  </div>
                )}
                {!isCurrent && popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
                    Popular
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{plan.nameJa}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {plan.price === 0 ? 'Free' : `¥${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-muted-foreground">/mo</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div
                    className="w-full rounded-xl py-2.5 text-sm font-medium bg-green-500/10 text-green-400 text-center border border-green-500/20"
                  >
                    Active
                  </div>
                ) : key === 'free' ? (
                  hasActiveSub ? (
                    <button
                      onClick={handleManage}
                      disabled={loading !== null}
                      className="w-full rounded-xl py-2.5 text-sm font-medium border border-border/50 hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Cancel plan'}
                    </button>
                  ) : null
                ) : (
                  <button
                    onClick={() => handleSubscribe(key)}
                    disabled={loading !== null}
                    className={`w-full rounded-xl py-2.5 text-sm font-medium transition-colors ${
                      popular
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'border border-border/50 hover:bg-muted/50'
                    } disabled:opacity-50`}
                  >
                    {loading === key
                      ? 'Loading...'
                      : hasActiveSub
                        ? 'Change plan'
                        : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="mt-8 text-center space-y-2">
          {errorMsg && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{errorMsg}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Cancel anytime · No prorated refunds · 18+ only
          </p>
          {currentPlan !== 'free' && (
            <button
              onClick={handleManage}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Manage subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
