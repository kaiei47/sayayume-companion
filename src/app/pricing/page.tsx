'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
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
          .select('plan, status, current_period_end, cancel_at_period_end')
          .eq('user_id', dbUser.id)
          .eq('status', 'active')
          .single();

        if (sub) {
          setCurrentPlan(sub.plan);
          setPeriodEnd((sub as { plan: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean }).current_period_end);
          setCancelAtPeriodEnd((sub as { plan: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean }).cancel_at_period_end ?? false);
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
        window.location.href = data.url;
      } else if (data.success && data.redirect) {
        setCurrentPlan(plan);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setErrorMsg(data.error || '決済に失敗しました。もう一度お試しください。');
      }
    } catch {
      setErrorMsg('エラーが発生しました。もう一度お試しください。');
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
        setErrorMsg(data.error || 'エラーが発生しました。もう一度お試しください。');
      }
    } catch {
      setErrorMsg('エラーが発生しました。もう一度お試しください。');
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
    <div className="min-h-dvh bg-background">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0f0f1a] to-background">
        {/* Glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-96 h-64 bg-pink-600/10 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/3 w-80 h-64 bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-12">
          {/* Back link */}
          <a href="/" className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1 mb-8">
            ← 戻る
          </a>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Left: text */}
            <div className="lg:max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/10 border border-pink-500/20 px-3 py-1 text-xs font-medium text-pink-400 mb-4">
                🎉 クローズドβ限定 — 最初の1ヶ月無料！
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
                さやとゆめと、<br className="hidden lg:block" />もっと深く。
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed">
                無料プランでもメッセージは無制限。<br />
                仲が深まったら、写真や特別なコンテンツも解放される。
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mt-5">
                {['いつでもキャンセル可', '初月無料', '日本語対応', 'PWAアプリ'].map((f) => (
                  <span key={f} className="rounded-full bg-muted/50 border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: characters */}
            <div className="hidden lg:flex items-end gap-4 flex-shrink-0">
              <div className="text-center">
                <div className="w-28 h-36 rounded-2xl overflow-hidden ring-2 ring-pink-500/20 shadow-xl shadow-pink-500/10">
                  <Image
                    src="/avatars/saya.jpg"
                    alt="さや"
                    width={112}
                    height={144}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <p className="text-xs font-semibold text-foreground/70 mt-2">さや</p>
                <p className="text-xs text-muted-foreground">大胆ギャル系</p>
              </div>
              <div className="text-center mb-4">
                <div className="w-28 h-36 rounded-2xl overflow-hidden ring-2 ring-blue-500/20 shadow-xl shadow-blue-500/10">
                  <Image
                    src="/avatars/yume_avatar.jpg"
                    alt="ゆめ"
                    width={112}
                    height={144}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <p className="text-xs font-semibold text-foreground/70 mt-2">ゆめ</p>
                <p className="text-xs text-muted-foreground">清楚系</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Plans section ── */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Notifications */}
        {showSuccess && (
          <div className="mb-6 rounded-2xl bg-green-500/10 border border-green-500/20 p-4 text-center text-green-400 text-sm">
            🎉 プラン開始しました！さやとゆめが待ってるよ ♡
          </div>
        )}
        {showCanceled && (
          <div className="mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-center text-yellow-400 text-sm">
            決済がキャンセルされました
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map(({ key, popular }) => {
            const plan = PLANS[key];
            const isCurrent = currentPlan === key;
            const hasActiveSub = currentPlan !== 'free';

            return (
              <div
                key={key}
                className={`relative rounded-2xl border flex flex-col transition-all ${
                  isCurrent
                    ? 'border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20 shadow-lg shadow-green-500/5'
                    : popular
                      ? 'border-blue-500/40 bg-gradient-to-b from-blue-500/5 to-background shadow-xl shadow-blue-500/10'
                      : 'border-border/50 bg-card/30'
                }`}
              >
                {/* Badge */}
                {isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-4 py-1 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                    現在のプラン
                  </div>
                )}
                {!isCurrent && popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                    ⭐ 人気 No.1
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  {/* Plan name & price */}
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-foreground/80 mb-2">{plan.nameJa}</h3>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold tracking-tight">
                        {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-muted-foreground mb-1">/月</span>
                      )}
                    </div>
                    {plan.price > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-full px-2.5 py-0.5">
                        🎉 最初の1ヶ月無料
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isCurrent || popular ? 'text-green-400' : 'text-green-500/70'}`}>
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-muted-foreground leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  {isCurrent ? (
                    <div className="space-y-2">
                      <div className="w-full rounded-xl py-3 text-sm font-semibold bg-green-500/10 text-green-400 text-center border border-green-500/20">
                        ✓ 利用中
                      </div>
                      {key !== 'free' && periodEnd && (
                        <p className="text-xs text-center text-muted-foreground">
                          {cancelAtPeriodEnd ? (
                            <>
                              <span className="text-orange-400">解約予定</span>
                              {' · '}
                              {new Date(periodEnd).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} まで利用可
                            </>
                          ) : (
                            <>
                              次回更新: {new Date(periodEnd).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  ) : key === 'free' ? (
                    hasActiveSub ? (
                      <button
                        onClick={handleManage}
                        disabled={loading !== null}
                        className="w-full rounded-xl py-3 text-sm font-medium border border-border/50 hover:bg-muted/50 transition-colors disabled:opacity-50 text-muted-foreground"
                      >
                        {loading ? '読み込み中...' : 'プランを変更する'}
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push('/')}
                        className="w-full rounded-xl py-3 text-sm font-medium border border-border/50 hover:bg-muted/50 transition-colors text-muted-foreground"
                      >
                        無料で始める →
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleSubscribe(key)}
                      disabled={loading !== null}
                      className={`w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 shadow-lg ${
                        popular
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-90 shadow-blue-500/20'
                          : key === 'premium'
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 shadow-pink-500/20'
                            : 'border border-border/50 hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      {loading === key
                        ? '処理中...'
                        : hasActiveSub
                          ? 'プランを変更する'
                          : `${plan.name}を始める`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-center text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            いつでもキャンセル可 · アップグレードは差額を日割りで即時請求 · ダウングレードは期間終了後に適用 · 18歳以上限定
          </p>
          {currentPlan !== 'free' && (
            <button
              onClick={handleManage}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              サブスクを管理する
            </button>
          )}
        </div>

        {/* ── FAQ (desktop: 2-col, mobile: stacked) ── */}
        <div className="mt-16 border-t border-border/30 pt-12">
          <h2 className="text-xl font-bold text-center mb-8">よくある質問</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {[
              {
                q: '無料プランでどこまで使える？',
                a: 'メッセージは無制限。AI写真は1日3枚まで体験できます。親密度はLv3まで上がります。',
              },
              {
                q: 'いつでもキャンセルできる？',
                a: 'はい、いつでもキャンセル可能です。解約後も請求期間終了まで利用できます。',
              },
              {
                q: '支払い方法は？',
                a: 'クレジットカード（Visa/Mastercard/Amex等）に対応。Stripeの安全な決済で処理されます。',
              },
              {
                q: '親密度Lv3のキャップとは？',
                a: '無料プランでは「仲良し」まで。有料プランなら「恋人」「運命の人」まで解放されます。',
              },
              {
                q: 'BasicとPremiumの違いは？',
                a: 'BasicはAI写真30枚/日。PremiumはAI写真無制限＋将来のボイスメッセージや限定コンテンツも対象です。',
              },
              {
                q: 'プランを変更するとどうなる？',
                a: 'アップグレード（例: Basic→Premium）は即時適用。現在の残り期間分のBasic料金がクレジットされ、Premiumとの差額を日割りで即時請求します。ダウングレード（例: Premium→Free/Basic）は現在の請求期間が終わった後に新プランが適用されます。',
              },
              {
                q: 'クローズドβ無料って？',
                a: 'βローンチ期間限定で、有料プランの最初の1ヶ月が無料になるクーポンが自動適用されます。',
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-border/40 bg-card/30 p-5">
                <p className="text-sm font-semibold mb-2">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
