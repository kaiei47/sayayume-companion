'use client';

/**
 * LogoPatternA: ネオングローテキスト
 *
 * - "さや" ピンクglow + "ゆめ" ブルーglow
 * - アイコンなし・テキストのみ
 * - Tailwind + inline style（text-shadow は Tailwind 非対応のため inline）
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { fontSize: '1.1rem',  letterSpacing: '-0.02em', gap: '0.05em' },
  md: { fontSize: '1.4rem',  letterSpacing: '-0.03em', gap: '0.05em' },
  lg: { fontSize: '1.9rem',  letterSpacing: '-0.03em', gap: '0.05em' },
};

const SAYA_GLOW = [
  '0 0 4px  #ff5ca8',
  '0 0 10px #ff5ca8',
  '0 0 20px #ff2d78',
  '0 0 40px #ff2d7860',
].join(', ');

const YUME_GLOW = [
  '0 0 4px  #5ba8ff',
  '0 0 10px #5ba8ff',
  '0 0 20px #2d78ff',
  '0 0 40px #2d78ff60',
].join(', ');

export default function LogoPatternA({ size = 'md' }: LogoProps) {
  const { fontSize, letterSpacing } = SIZE_MAP[size];

  const base: React.CSSProperties = {
    fontSize,
    letterSpacing,
    fontWeight: 800,
    lineHeight: 1,
    userSelect: 'none',
    display: 'inline-block',
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.02em' }}>
      {/* さや — ピンクglow */}
      <span
        style={{
          ...base,
          color: '#ffb3d4',
          textShadow: SAYA_GLOW,
        }}
      >
        さや
      </span>

      {/* ゆめ — ブルーglow */}
      <span
        style={{
          ...base,
          color: '#b3d4ff',
          textShadow: YUME_GLOW,
        }}
      >
        ゆめ
      </span>
    </span>
  );
}
