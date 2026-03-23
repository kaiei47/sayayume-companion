'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [nicknameError, setNicknameError] = useState('');
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineChecking, setLineChecking] = useState(true);

  // 解約フロー
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // メモリカード
  interface MemoryItem { id: string; character_id: string; category: string; value: string; emotional_weight: number; needs_followup: boolean; }
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [deletingMemory, setDeletingMemory] = useState<string | null>(null);

  const loadMemories = async () => {
    setMemoriesLoading(true);
    const res = await fetch('/api/memories');
    if (res.ok) { const d = await res.json(); setMemories(d.memories || []); }
    setMemoriesLoading(false);
  };

  const deleteMemory = async (id: string) => {
    setDeletingMemory(id);
    await fetch(`/api/memories?id=${id}`, { method: 'DELETE' });
    setMemories(prev => prev.filter(m => m.id !== id));
    setDeletingMemory(null);
  };

  const deleteAllMemories = async () => {
    if (!confirm('さやとゆめの記憶を全て消去しますか？')) return;
    await fetch('/api/memories?all=1', { method: 'DELETE' });
    setMemories([]);
  };

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

        // LINE連携状況を確認
        const { data: lineUser } = await supabase
          .from('line_users')
          .select('id')
          .eq('user_id', dbUser.id)
          .maybeSingle();
        setLineLinked(!!lineUser);
        setLineChecking(false);

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

    // LINE連携完了のクエリパラメータを確認
    const params = new URLSearchParams(window.location.search);
    if (params.get('line_linked') === '1') {
      setLineLinked(true);
      window.history.replaceState({}, '', '/settings');
    }
  }, [router]);

  const handleSaveNickname = async () => {
    if (!dbUserId) return;
    setNicknameSaving(true);
    setNicknameError('');
    const supabase = createClient();
    const { error } = await supabase.from('users').update({ display_name: nickname.trim() || null }).eq('id', dbUserId);
    setNicknameSaving(false);
    if (error) {
      setNicknameError('保存に失敗しました。もう一度試してください。');
    } else {
      setNicknameSaved(true);
      setTimeout(() => setNicknameSaved(false), 3000);
    }
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
      <div className="flex min-h-dvh items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="animate-pulse text-white/40 text-sm">Loading...</div>
      </div>
    );
  }

  const plan = subscription ? PLANS[subscription.plan] : PLANS.free;
  const isPaid = subscription?.plan !== 'free';
  const isCancelScheduled = subscription?.cancel_at_period_end === true;
  const periodEndDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const planGradient: Record<string, string> = {
    free: 'from-gray-500/20 to-gray-600/10',
    basic: 'from-blue-500/20 to-blue-600/10',
    premium: 'from-pink-500/20 to-purple-600/10',
  };

  const planIcon: Record<string, string> = {
    free: '🎮',
    basic: '⭐',
    premium: '👑',
  };

  return (
    <div className="min-h-dvh pb-24" style={{ background: '#0a0a1a' }}>
      <div className="mx-auto max-w-md px-4 pt-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            もどる
          </button>
          <h1 className="text-lg font-bold text-white">Settings</h1>
          <div className="w-12" /> {/* spacer */}
        </div>

        <div className="space-y-4">
          {/* ── アカウント ── */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 space-y-4">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">アカウント</h2>

            {/* Avatar + email */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white ring-2 ring-pink-500/30 ring-offset-2 ring-offset-[#0a0a1a]">
                  {user?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-[#0a0a1a]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{user?.email}</p>
                <p className="text-[11px] text-white/30">Googleアカウント連携</p>
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">ニックネーム</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="さや & ゆめに呼んでもらう名前"
                  maxLength={20}
                  className="flex-1 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-pink-500/40 focus:border-pink-500/30 transition-colors"
                />
                <button
                  onClick={handleSaveNickname}
                  disabled={nicknameSaving}
                  className="rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all min-w-[56px]"
                >
                  {nicknameSaved ? '✓' : nicknameSaving ? '...' : '保存'}
                </button>
              </div>
              {nicknameSaved && (
                <p className="text-xs text-green-400">✓ 保存しました！次のメッセージから呼んでくれるよ♡</p>
              )}
              {nicknameError && (
                <p className="text-xs text-red-400">{nicknameError}</p>
              )}
              {!nicknameSaved && !nicknameError && (
                <p className="text-[11px] text-white/25">さや & ゆめがこの名前で呼んでくれます ♡</p>
              )}
            </div>
          </div>

          {/* ── LINE連携 ── */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 space-y-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">LINE連携</h2>
            {lineChecking ? (
              <div className="text-sm text-white/30">確認中...</div>
            ) : lineLinked ? (
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06C755] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#06C755]"></span>
                </span>
                <div>
                  <p className="text-sm font-medium text-white">連携済み</p>
                  <p className="text-[11px] text-white/30">さや & ゆめからLINEで通知が届きます♡</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/30">
                  LINEと連携すると、さや & ゆめから毎日通知が届くようになります。
                </p>
                <a
                  href="/api/auth/line?mode=link"
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#06C755' }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  LINEと連携する
                </a>
              </div>
            )}
          </div>

          {/* ── プラン ── */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 space-y-4">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">プラン</h2>

            {/* Current plan badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${planGradient[subscription?.plan || 'free']} border border-white/10 flex items-center justify-center text-lg`}>
                  {planIcon[subscription?.plan || 'free']}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{plan.nameJa}</span>
                    {isPaid && !isCancelScheduled && (
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                        利用中
                      </span>
                    )}
                    {isCancelScheduled && (
                      <span className="text-[10px] text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20">
                        解約予定
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/30">
                    {plan.price === 0 ? 'Free' : `¥${plan.price.toLocaleString()}/月`}
                  </span>
                </div>
              </div>
            </div>

            {/* Next renewal */}
            {!isCancelScheduled && periodEndDate && (
              <div className="flex items-center gap-2 text-xs text-white/30 bg-white/[0.03] rounded-lg px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 6a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-7Z" clipRule="evenodd" />
                </svg>
                次回更新: {periodEndDate}
              </div>
            )}

            {/* Cancel scheduled */}
            {isCancelScheduled && (
              <div className="rounded-xl bg-orange-500/5 border border-orange-500/15 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm leading-none mt-0.5">⚠️</span>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-orange-300">自動継続は停止されています</p>
                    {periodEndDate ? (
                      <p className="text-xs text-white/50">
                        <span className="font-semibold text-white/80">{periodEndDate}</span> までは引き続き{plan.nameJa}プランをご利用いただけます。
                      </p>
                    ) : (
                      <p className="text-xs text-white/50">現在の請求期間が終わるまでご利用いただけます。</p>
                    )}
                    <p className="text-[11px] text-white/25">
                      期間終了後は自動的にFreeプランに切り替わります。
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReactivate}
                  disabled={cancelLoading}
                  className="w-full rounded-lg border border-blue-500/30 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                >
                  {cancelLoading ? '処理中...' : '解約を取り消して継続する'}
                </button>
              </div>
            )}

            {cancelError && (
              <p className="text-xs text-red-400">{cancelError}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {!isPaid ? (
                <Link
                  href="/pricing"
                  className="flex-1 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white py-2.5 text-sm font-medium text-center hover:opacity-90 transition-all shadow-lg shadow-pink-500/10"
                >
                  プランをアップグレード
                </Link>
              ) : (
                <>
                  <Link
                    href="/pricing"
                    className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white/60 text-center hover:bg-white/5 transition-colors"
                  >
                    プラン変更
                  </Link>
                  {!isCancelScheduled && (
                    <button
                      onClick={() => { setShowCancelModal(true); setCancelError(''); }}
                      className="rounded-xl border border-red-500/20 py-2.5 px-4 text-sm font-medium text-red-400/70 hover:bg-red-500/5 transition-colors"
                    >
                      解約
                    </button>
                  )}
                </>
              )}
            </div>
            {isPaid && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full text-xs text-white/25 hover:text-white/40 transition-colors disabled:opacity-50"
              >
                {portalLoading ? '読み込み中...' : 'Stripeで詳細を確認する →'}
              </button>
            )}
            {portalError && (
              <p className="text-xs text-red-400 mt-1">{portalError}</p>
            )}
          </div>

          {/* ── メモリー ── */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 space-y-3">
            <button
              onClick={() => { setMemoriesOpen(!memoriesOpen); if (!memoriesOpen) loadMemories(); }}
              className="w-full flex items-center justify-between"
            >
              <div>
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider text-left">メモリー</h2>
                <p className="text-[11px] text-white/25 mt-1 text-left">
                  キャラが覚えていること ({memories.length}件)
                </p>
              </div>
              <span className={`text-white/30 text-sm transition-transform duration-200 ${memoriesOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {memoriesOpen && (
              <div className="space-y-3 pt-1">
                {memoriesLoading ? (
                  <p className="text-xs text-white/30">読み込み中...</p>
                ) : memories.length === 0 ? (
                  <p className="text-xs text-white/30">まだ記憶がありません。会話を続けると覚えていくよ♡</p>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {memories.map(m => (
                        <li key={m.id} className="flex items-start justify-between gap-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mr-2 ${
                              m.category === 'profile' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20' :
                              m.category === 'preference' ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' :
                              m.category === 'episode' ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20' :
                              'bg-pink-500/15 text-pink-300 border border-pink-500/20'
                            }`}>
                              {m.category === 'profile' ? 'プロフィール' :
                               m.category === 'preference' ? '好み' :
                               m.category === 'episode' ? 'エピソード' : '関係'}
                            </span>
                            <span className="text-white/60">{m.value}</span>
                            {m.needs_followup && (
                              <span className="ml-1 text-[10px] text-yellow-400">（フォロー予定）</span>
                            )}
                          </div>
                          <button
                            onClick={() => deleteMemory(m.id)}
                            disabled={deletingMemory === m.id}
                            className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40"
                            title="削除"
                          >
                            {deletingMemory === m.id ? '...' : '×'}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={deleteAllMemories}
                      className="w-full text-[11px] text-red-400/50 hover:text-red-400 transition-colors py-1"
                    >
                      全ての記憶を消去する
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── ログアウト ── */}
          <button
            onClick={handleLogout}
            className="w-full text-sm text-red-400/60 hover:text-red-400 transition-colors py-3"
          >
            ログアウト
          </button>

          {/* Footer */}
          <div className="text-center space-y-1 pt-2 pb-4">
            <p className="text-[11px] text-white/20">さやゆめ v0.1.0</p>
            <p className="text-[11px] text-white/20">18+ only · AI-generated content</p>
          </div>
        </div>
      </div>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/5 backdrop-blur-xl border-t border-white/10 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          <Link href="/" className="flex flex-col items-center gap-0.5 text-white/40 hover:text-white/60 transition-colors">
            <span className="text-lg">🏠</span>
            <span className="text-[9px]">Home</span>
          </Link>
          <Link href="/chat/saya" className="flex flex-col items-center gap-0.5 text-white/40 hover:text-white/60 transition-colors">
            <span className="text-lg">💬</span>
            <span className="text-[9px]">Chat</span>
          </Link>
          <Link href="/story" className="flex flex-col items-center gap-0.5 text-white/40 hover:text-white/60 transition-colors">
            <span className="text-lg">📖</span>
            <span className="text-[9px]">Story</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center gap-0.5 text-pink-400">
            <span className="text-lg">⚙️</span>
            <span className="text-[9px]">Settings</span>
          </Link>
        </div>
      </nav>

      {/* ── 解約確認モーダル (Glassmorphism) ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white/[0.06] backdrop-blur-2xl border border-white/10 p-6 space-y-5 mb-4 sm:mb-0 shadow-2xl">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">解約の確認</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                  <span>
                    自動継続が停止されます。{periodEndDate && (
                      <span className="font-semibold text-white">（次回の請求はありません）</span>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                  <span>
                    {periodEndDate ? (
                      <><span className="font-semibold text-white">{periodEndDate} まで</span>は引き続き{plan.nameJa}プランをご利用いただけます。</>
                    ) : (
                      '現在の請求期間が終わるまで引き続きご利用いただけます。'
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-white/30">
                  <span className="mt-0.5 flex-shrink-0">·</span>
                  <span>期間終了後はFreeプランに自動移行します。日割り返金は行いません。</span>
                </li>
              </ul>
            </div>

            {cancelError && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{cancelError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelError(''); }}
                disabled={cancelLoading}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/60 hover:bg-white/5 transition-colors disabled:opacity-50"
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
