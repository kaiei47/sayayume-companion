'use client';

/**
 * SayayumeLogo — デフォルトロゴコンポーネント（後方互換ラッパー）
 *
 * パターンA（ネオングローテキスト）をデフォルトで使用。
 * pattern="B" を指定するとデュアルカラー＋ハートロゴに切り替わる。
 */

import LogoPatternA from '@/components/logos/LogoPatternA';
import LogoPatternB from '@/components/logos/LogoPatternB';

interface SayayumeLogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** パターン選択: 'A' = ネオングロー（デフォルト）, 'B' = デュアルカラー＋ハート */
  pattern?: 'A' | 'B';
  /** 後方互換: 無視される（アイコンは廃止）*/
  iconOnly?: boolean;
}

export default function SayayumeLogo({
  size = 'md',
  pattern = 'A',
}: SayayumeLogoProps) {
  if (pattern === 'B') {
    return <LogoPatternB size={size} />;
  }
  return <LogoPatternA size={size} />;
}
