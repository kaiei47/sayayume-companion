'use client';

/**
 * LogoPatternB: デュアルカラー分割 + SVGハート区切り
 *
 * - "さや" ピンク / ハート(∞グラデ) / "ゆめ" ブルー
 * - 各文字に個別glow
 * - ハートはピンク→ブルーのSVGグラデーション（CSS only）
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { fontSize: '1.1rem', iconSize: 12 },
  md: { fontSize: '1.4rem', iconSize: 16 },
  lg: { fontSize: '1.9rem', iconSize: 22 },
};

const SAYA_GLOW = [
  '0 0 6px  #ff5ca8cc',
  '0 0 14px #ff2d7880',
].join(', ');

const YUME_GLOW = [
  '0 0 6px  #5ba8ffcc',
  '0 0 14px #2d78ff80',
].join(', ');

const HEART_GLOW = [
  '0 0 6px  #c456ffcc',
  '0 0 14px #8b2dff60',
].join(', ');

/** ハートSVG: ピンク→パープル→ブルーのグラデ */
function HeartIcon({ size }: { size: number }) {
  const id = 'heart-grad-b';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        filter: `drop-shadow(0 0 3px #c456ffcc) drop-shadow(0 0 7px #8b2dff60)`,
        flexShrink: 0,
      }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ff5ca8" />
          <stop offset="50%"  stopColor="#c456ff" />
          <stop offset="100%" stopColor="#5ba8ff" />
        </linearGradient>
      </defs>
      {/* heart path */}
      <path
        d="M12 21.593C11.633 21.346 3 15.854 3 9.5
           C3 6.462 5.462 4 8.5 4
           c1.743 0 3.296.87 4.25 2.204
           C13.704 4.87 15.257 4 17 4
           c3.038 0 5.5 2.462 5.5 5.5
           C22.5 15.854 14.367 21.346 12 21.593Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export default function LogoPatternB({ size = 'md' }: LogoProps) {
  const { fontSize, iconSize } = SIZE_MAP[size];

  const base: React.CSSProperties = {
    fontSize,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1,
    userSelect: 'none',
    display: 'inline-block',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.18em',
      }}
    >
      {/* さや */}
      <span
        style={{
          ...base,
          color: '#ffb3d4',
          textShadow: SAYA_GLOW,
        }}
      >
        さや
      </span>

      {/* ハート区切り */}
      <HeartIcon size={iconSize} />

      {/* ゆめ */}
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
