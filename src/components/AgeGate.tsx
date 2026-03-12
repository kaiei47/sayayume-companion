'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SayayumeLogo from '@/components/SayayumeLogo';

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const pathname = usePathname();

  // 法務ページはAgeGate不要（Stripe審査・クローラー対応）
  const isLegalPage = pathname?.startsWith('/legal');

  useEffect(() => {
    if (isLegalPage) return;
    const stored = localStorage.getItem('age-verified');
    setVerified(stored === 'true');
  }, [isLegalPage]);

  const handleConfirm = () => {
    localStorage.setItem('age-verified', 'true');
    setVerified(true);
  };

  // 法務ページはゲートなしで表示
  if (isLegalPage) return <>{children}</>;

  // ロード中は何も表示しない（フラッシュ防止）
  if (verified === null) return null;

  if (verified) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <SayayumeLogo size="lg" />
          <p className="text-muted-foreground text-sm">AI彼女</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-4">
          <div className="text-4xl">🔞</div>
          <h2 className="text-lg font-semibold">年齢確認</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            このサービスは18歳以上を対象としています。
            AI生成コンテンツが含まれます。
          </p>

          <button
            onClick={handleConfirm}
            className="w-full rounded-xl bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            18歳以上です — 入場する
          </button>

          <a
            href="https://www.google.com"
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            18歳未満です — 退出する
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          入場することで利用規約に同意したものとみなします
        </p>
      </div>
    </div>
  );
}
