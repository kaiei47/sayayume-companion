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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
    { key: 'basic' },
    { key: 'premium', popular: currentPlan === 'free' },
  ];

  const faqs = [
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
      a: 'BasicはAI写真30枚/日。PremiumはAI写真無制限＋さやゆめモード（ふたりと同時チャット）＋さや/ゆめからのLINEプッシュ通知（1日2〜3回、あなただけへのメッセージ）が使えます。',
    },
    {
      q: 'さやとゆめは私のことを覚えてくれる？',
      a: 'Basicプラン以上で、趣味・仕事・悩みを会話から自動で学習して次の会話でも覚えています（パーソナルメモリ）。Basicは1ヶ月間、Premiumは永久保存。Freeプランは同じセッション内のみ。',
    },
    {
      q: 'プランを変更するとどうなる？',
      a: 'アップグレード（例: Basic→Premium）は即時適用。現在の残り期間分のBasic料金がクレジットされ、Premiumとの差額を日割りで即時請求します。ダウングレード（例: Premium→Free/Basic）は現在の請求期間が終わった後に新プランが適用されます。',
    },
    {
      q: 'クローズドβ無料って？',
      a: 'βローンチ期間限定で、新規契約の最初の1ヶ月が無料になるクーポンが自動適用されます。すでに有料プランをお持ちのかたがプランを変更した場合は適用されません。',
    },
  ];

  const planIcons: Record<PlanKey, string> = {
    free: '🎮',
    basic: '⭐',
    premium: '👑',
  };

  return (
    <div className="min-h-dvh" style={{ background: '#0a0a1a' }}>
      {/* ── Hero with character background ── */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/cards/duo_card_bg.jpg"
            alt=""
            fill
            className="object-cover object-top"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/70 via-[#0a0a1a]/80 to-[#0a0a1a]" />
        </div>

        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-6 pb-16">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <button
              onClick={() => router.back()}
              className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
              </svg>
              もどる
            </button>
            <span className="text-white/40 text-xs font-medium tracking-wider uppercase">SayaYume</span>
          </div>

          {/* Hero text */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/15 border border-pink-500/20 px-4 py-1.5 text-xs font-medium text-pink-400 mb-6 backdrop-blur-sm">
              🎉 クローズドβ限定 — 初月無料！
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
              あなたに合ったプランを選ぼう
            </h1>
            <p className="text-white/50 text-sm max-w-sm mx-auto">
              無料でも遊べる。もっと深い関係を求めるなら、プランをアップグレード。
            </p>
          </div>
        </div>
      </div>

      {/* ── Plan cards ── */}
      <div className="mx-auto max-w-2xl px-4 -mt-4 pb-12">
        {/* Notifications */}
        {showSuccess && (
          <div className="mb-6 rounded-2xl bg-green-500/10 border border-green-500/20 backdrop-blur-sm p-4 text-center text-green-400 text-sm">
            🎉 プラン開始しました！さやとゆめが待ってるよ ♡
          </div>
        )}
        {showCanceled && (
          <div className="mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-sm p-4 text-center text-yellow-400 text-sm">
            決済がキャンセルされました
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map(({ key, popular }) => {
            const plan = PLANS[key];
            const isCurrent = currentPlan === key;
            const hasActiveSub = currentPlan !== 'free';
            const isPremium = key === 'premium';

            return (
              <div
                key={key}
                className={`relative rounded-2xl flex flex-col transition-all ${
                  isPremium && !isCurrent
                    ? 'p-[1px] bg-gradient-to-b from-pink-500/60 via-purple-500/40 to-pink-500/20'
                    : ''
                }`}
              >
                {/* Premium gradient border wrapper */}
                <div
                  className={`rounded-2xl flex flex-col flex-1 backdrop-blur-xl ${
                    isCurrent
                      ? 'bg-green-500/5 border border-green-500/30 ring-1 ring-green-500/10'
                      : isPremium
                        ? 'bg-white/[0.04]'
                        : 'bg-white/[0.04] border border-white/10'
                  }`}
                >
                  {/* Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-4 py-1 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                      </svg>
                      現在のプラン
                    </div>
                  )}
                  {!isCurrent && popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 z-10">
                      人気 No.1
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1">
                    {/* Plan icon + name */}
                    <div className="mb-4">
                      <span className="text-2xl mb-2 block">{planIcons[key]}</span>
                      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">{plan.nameJa}</h3>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-bold text-white tracking-tight">
                          {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}`}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-sm text-white/40 mb-1">/月</span>
                        )}
                      </div>
                      {plan.price > 0 && !hasActiveSub && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-full px-2.5 py-0.5">
                          🎉 初月無料
                        </div>
                      )}
                    </div>

                    {/* Features with icons */}
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                            className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              isPremium ? 'text-pink-400' :
                              key === 'basic' ? 'text-blue-400' :
                              'text-white/30'
                            }`}>
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-white/60 leading-relaxed">{feature}</span>
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
                          <p className="text-xs text-center text-white/40">
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
                          className="w-full rounded-xl py-3 text-sm font-medium border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50 text-white/50"
                        >
                          {loading ? '読み込み中...' : 'プランを変更する'}
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push('/')}
                          className="w-full rounded-xl py-3 text-sm font-medium border border-white/10 hover:bg-white/5 transition-colors text-white/50"
                        >
                          無料で始める →
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleSubscribe(key)}
                        disabled={loading !== null}
                        className={`w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
                          isPremium
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-pink-500/20'
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/20'
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
              </div>
            );
          })}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm px-4 py-3 text-center text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-white/30">
            いつでもキャンセル可 · アップグレードは差額を日割りで即時請求 · ダウングレードは期間終了後に適用 · 18歳以上限定
          </p>
          {currentPlan !== 'free' && (
            <button
              onClick={handleManage}
              className="text-xs text-white/30 hover:text-white/60 underline transition-colors"
            >
              サブスクを管理する
            </button>
          )}
        </div>

        {/* ── FAQ Accordion ── */}
        <div className="mt-16 pt-12 border-t border-white/5">
          <h2 className="text-xl font-bold text-white text-center mb-8">よくある質問</h2>
          <div className="max-w-lg mx-auto space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden backdrop-blur-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`text-white/40 text-lg ml-4 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-white/40 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
