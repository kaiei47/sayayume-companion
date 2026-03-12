/**
 * LogoPatternE: ピルバッジ型ロゴ
 *
 * ピンク→ブルーのグラデーションボーダーを持つ
 * 角丸バッジに "さやゆめ" / "SAYA YUME" を配置。
 * プレミアム感・コンパクト設計。
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: {
    svgW: 110,
    svgH: 30,
    rx: 15,
    borderW: 1.5,
    mainSize: '13px',
    subSize: '6.5px',
    fontWeight: 800,
    innerPad: 3,
  },
  md: {
    svgW: 136,
    svgH: 38,
    rx: 19,
    borderW: 2,
    mainSize: '16px',
    subSize: '8px',
    fontWeight: 800,
    innerPad: 4,
  },
  lg: {
    svgW: 196,
    svgH: 54,
    rx: 27,
    borderW: 2.5,
    mainSize: '23px',
    subSize: '11px',
    fontWeight: 900,
    innerPad: 5,
  },
};

export default function LogoPatternE({ size = 'md' }: LogoProps) {
  const cfg = SIZE_MAP[size];
  const id = `pe-${size}`;

  const { svgW, svgH, rx, borderW, mainSize, subSize, fontWeight, innerPad } = cfg;

  // 内側の角丸矩形（ボーダー分縮小）
  const innerX = borderW + innerPad;
  const innerY = borderW + innerPad;
  const innerW = svgW - (borderW + innerPad) * 2;
  const innerH = svgH - (borderW + innerPad) * 2;
  const innerRx = rx - borderW - innerPad * 0.5;

  // テキスト中央配置
  const cx = svgW / 2;
  const mainY = svgH * 0.57;
  const subY = svgH * 0.85;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="さやゆめ"
      style={{ userSelect: 'none', flexShrink: 0, overflow: 'visible' }}
    >
      <defs>
        {/* ボーダーグラデ: ピンク→紫→ブルー */}
        <linearGradient id={`${id}-border`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f472b6" />
          <stop offset="45%"  stopColor="#a855f7" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* 背景グラデ（ダーク + 微かなグロー） */}
        <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#1a0a1a" />
          <stop offset="50%"  stopColor="#0d0d1a" />
          <stop offset="100%" stopColor="#080d1a" />
        </linearGradient>

        {/* さや テキスト: ピンク */}
        <linearGradient id={`${id}-saya`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#fda4af" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>

        {/* ゆめ テキスト: ブルー */}
        <linearGradient id={`${id}-yume`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>

        {/* 区切り ・ */}
        <radialGradient id={`${id}-sep`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#e879f9" />
          <stop offset="100%" stopColor="#818cf8" />
        </radialGradient>

        {/* ネオングロー（テキスト用） */}
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ボーダーグロー */}
        <filter id={`${id}-border-glow`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* クリップ（内側） */}
        <clipPath id={`${id}-clip`}>
          <rect x={innerX} y={innerY} width={innerW} height={innerH} rx={innerRx} />
        </clipPath>
      </defs>

      {/* ── グラデーションボーダー（外枠） ── */}
      <rect
        x={borderW / 2}
        y={borderW / 2}
        width={svgW - borderW}
        height={svgH - borderW}
        rx={rx - borderW / 2}
        fill="none"
        stroke={`url(#${id}-border)`}
        strokeWidth={borderW}
        filter={`url(#${id}-border-glow)`}
      />

      {/* ── ダーク背景（内側） ── */}
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        rx={innerRx}
        fill={`url(#${id}-bg)`}
      />

      {/* 背景内側の微かなネオンオーバーレイ（左ピンク、右ブルー） */}
      <defs>
        <radialGradient id={`${id}-left-glow`} cx="15%" cy="50%" r="40%">
          <stop offset="0%"   stopColor="#f472b6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-right-glow`} cx="85%" cy="50%" r="40%">
          <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect
        x={innerX} y={innerY} width={innerW} height={innerH}
        rx={innerRx} fill={`url(#${id}-left-glow)`}
        clipPath={`url(#${id}-clip)`}
      />
      <rect
        x={innerX} y={innerY} width={innerW} height={innerH}
        rx={innerRx} fill={`url(#${id}-right-glow)`}
        clipPath={`url(#${id}-clip)`}
      />

      {/* ── メインテキスト: "さや" ・ "ゆめ" ── */}
      {/* 左半: さや */}
      <text
        x={cx - svgW * 0.04}
        y={mainY}
        fontSize={mainSize}
        fontWeight={fontWeight}
        letterSpacing="0.08em"
        fill={`url(#${id}-saya)`}
        fontFamily='"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'
        textAnchor="end"
        filter={`url(#${id}-glow)`}
        style={{ fontFeatureSettings: '"palt"' }}
      >
        さや
      </text>

      {/* 中央セパレータ ・ */}
      <circle
        cx={cx}
        cy={mainY - parseFloat(mainSize) * 0.3}
        r={borderW + 0.5}
        fill={`url(#${id}-sep)`}
        filter={`url(#${id}-glow)`}
      />

      {/* 右半: ゆめ */}
      <text
        x={cx + svgW * 0.04}
        y={mainY}
        fontSize={mainSize}
        fontWeight={fontWeight}
        letterSpacing="0.08em"
        fill={`url(#${id}-yume)`}
        fontFamily='"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'
        textAnchor="start"
        filter={`url(#${id}-glow)`}
        style={{ fontFeatureSettings: '"palt"' }}
      >
        ゆめ
      </text>

      {/* ── サブテキスト: "AI COMPANION" ── */}
      <text
        x={cx}
        y={subY}
        fontSize={subSize}
        fontWeight={500}
        letterSpacing="0.22em"
        fill="#64748b"
        fontFamily='"Inter", "SF Pro Display", sans-serif'
        textAnchor="middle"
      >
        AI COMPANION
      </text>
    </svg>
  );
}
