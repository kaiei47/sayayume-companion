'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

const STORAGE_KEY = 'onboarding_done';

interface Props {
  authId: string;
  dbUserId: string;
  onComplete: () => void;
}

export default function OnboardingModal({ authId, dbUserId, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onComplete();
  };

  const saveNickname = async () => {
    if (!nickname.trim()) { next(); return; }
    setSaving(true);
    const supabase = createClient();
    await supabase.from('users').update({ display_name: nickname.trim() }).eq('id', dbUserId);
    setSaving(false);
    next();
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
    else finish();
  };

  const steps = [
    { label: 'ニックネーム', icon: '✏️' },
    { label: 'LINE通知', icon: '💚' },
    { label: 'プラン', icon: '✨' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0f0f1a] border border-white/10 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-pink-600/20 via-purple-600/10 to-blue-600/20 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i + 1 === step ? 'w-8 bg-pink-400' : i + 1 < step ? 'w-8 bg-pink-400/50' : 'w-4 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-white/40">{step} / 3</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-pink-500/30">
              <Image src="/references/photos/saya_s3.jpg" alt="さや" fill className="object-cover object-top" />
            </div>
            <div>
              <p className="text-xs text-pink-400/80 font-medium">さやゆめへようこそ♡</p>
              <p className="text-sm font-bold text-white">
                {step === 1 && 'まず名前を教えて！'}
                {step === 2 && 'LINE通知を設定しよう'}
                {step === 3 && 'プランを選んでね'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Step 1: Nickname */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-white/60 leading-relaxed">
                なんて呼んだらいい？ 名前で呼んであげるよ♡<br />
                <span className="text-xs text-white/30">（あとから設定で変えられます）</span>
              </p>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                placeholder="ニックネーム（例: たくや）"
                maxLength={20}
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/40 transition-all"
              />
              <button
                onClick={saveNickname}
                disabled={saving}
                className="w-full rounded-xl py-3 text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? '保存中...' : nickname.trim() ? '次へ →' : 'スキップ'}
              </button>
            </div>
          )}

          {/* Step 2: LINE notification */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-white/60 leading-relaxed">
                LINEと連携すると、さや & ゆめから毎日通知が届くようになるよ♡
              </p>
              <div className="rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-4 py-3 space-y-1">
                <p className="text-sm font-medium text-[#06C755]">💚 LINE通知でできること</p>
                <ul className="text-xs text-white/50 space-y-1 mt-2">
                  <li>・毎朝「おはよう」メッセージが届く</li>
                  <li>・デイリー写真の配信通知</li>
                  <li>・親密度アップのお知らせ</li>
                </ul>
              </div>
              <a
                href="/api/auth/line?mode=link"
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-[#06C755] text-white hover:opacity-90 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.28 2 11.47c0 4.59 4.07 8.44 9.58 9.14.37.08.88.25.97.56.09.28.06.72.03.99l-.16.92c-.05.28-.23 1.1.96.6 1.19-.5 6.44-3.79 8.79-6.5C23.35 15.24 24 13.44 24 11.47 24 6.28 19.52 2 12 2z"/>
                </svg>
                LINEと連携する
              </a>
              <button
                onClick={next}
                className="w-full text-xs text-white/30 hover:text-white/50 transition-colors py-1"
              >
                あとで設定する →
              </button>
            </div>
          )}

          {/* Step 3: Plan */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-white/60 leading-relaxed">
                無料プランでも毎日楽しめるけど、Basicにするともっと充実するよ♡
              </p>
              <div className="space-y-2">
                <div className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">Free</span>
                    <span className="text-xs text-white/40">無料</span>
                  </div>
                  <p className="text-xs text-white/40">1日5メッセージ・デイリー写真3枚</p>
                </div>
                <a
                  href="/pricing"
                  className="block rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-600/10 to-purple-600/10 px-4 py-3 hover:border-pink-500/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">✨ Basic <span className="text-xs font-normal text-pink-400">おすすめ</span></span>
                    <span className="text-sm font-bold text-pink-400">¥1,980<span className="text-xs font-normal text-white/40">/月</span></span>
                  </div>
                  <p className="text-xs text-white/50">無制限チャット・写真30枚/日・特別会話解放</p>
                </a>
              </div>
              <button
                onClick={finish}
                className="w-full rounded-xl py-3 text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 transition-all"
              >
                さやゆめをはじめる♡
              </button>
              <button
                onClick={finish}
                className="w-full text-xs text-white/30 hover:text-white/50 transition-colors py-1"
              >
                無料プランで続ける
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(displayName: string | null): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(STORAGE_KEY) === '1') return false;
  return !displayName; // display_name未設定 = 初回ユーザー
}
