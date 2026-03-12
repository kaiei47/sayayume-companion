'use client';

/**
 * SayayumeLogo — サービスロゴコンポーネント
 * アプリアイコン + "SayaYume" グラデーションSVGテキスト + "AI GIRLFRIEND" サブテキスト
 */

import LogoFinal from '@/components/logos/LogoFinal';

interface SayayumeLogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** 後方互換: 無視される */
  pattern?: string;
  /** 後方互換: 無視される */
  iconOnly?: boolean;
}

export default function SayayumeLogo({ size = 'md' }: SayayumeLogoProps) {
  return <LogoFinal size={size} textStyle="SayaYume" underline={false} />;
}
