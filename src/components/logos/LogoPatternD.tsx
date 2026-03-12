/**
 * LogoPatternD: タイポグラフィック日本語ロゴ
 *
 * "さや" (ピンク) ・ "ゆめ" (ブルー) を
 * 中央のネオンドット区切りで繋いだ横書きロゴ。
 * グラデーションアンダーライン付き。
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: {
    wrapperHeight: 36,
    mainSize: '17px',
    subSize: '8px',
    dotR: 2.5,
    underlineH: 2,
    fontWeight: 800,
    letterSpacing: '0.06em',
  },
  md: {
    wrapperHeight: 44,
    mainSize: '21px',
    subSize: '9px',
    dotR: 3,
    underlineH: 2.5,
    fontWeight: 800,
    letterSpacing: '0.06em',
  },
  lg: {
    wrapperHeight: 60,
    mainSize: '30px',
    subSize: '12px',
    dotR: 4.5,
    underlineH: 3.5,
    fontWeight: 900,
    letterSpacing: '0.07em',
  },
};

export default function LogoPatternD({ size = 'md' }: LogoProps) {
  const cfg = SIZE_MAP[size];
  const id = `pd-${size}`;

  // SVG座標計算（完全SVG実装）
  const svgW = cfg.wrapperHeight * 4.2;
  const svgH = cfg.wrapperHeight;
  const baseline = svgH * 0.68;
  const sayaX = svgW * 0.04;
  const dotX = svgW * 0.5;
  const yumeX = svgW * 0.56;
  const underlineY = svgH * 0.88;
  const underlineH = cfg.underlineH;

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
        {/* さや側: ピンク */}
        <linearGradient id={`${id}-saya`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#fb7185" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>

        {/* ゆめ側: ブルー */}
        <linearGradient id={`${id}-yume`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* アンダーライン: フル幅グラデ */}
        <linearGradient id={`${id}-line`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#fb7185" />
          <stop offset="48%"  stopColor="#c084fc" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* ドット: 中央グラデ */}
        <radialGradient id={`${id}-dot`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#e879f9" />
          <stop offset="100%" stopColor="#818cf8" />
        </radialGradient>

        {/* ネオングロー */}
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* アンダーライングロー */}
        <filter id={`${id}-line-glow`} x="-5%" y="-100%" width="110%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── "さや" テキスト ── */}
      <text
        x={sayaX}
        y={baseline}
        fontSize={cfg.mainSize}
        fontWeight={cfg.fontWeight}
        letterSpacing={cfg.letterSpacing}
        fill={`url(#${id}-saya)`}
        fontFamily='"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'
        filter={`url(#${id}-glow)`}
        style={{ fontFeatureSettings: '"palt"' }}
      >
        さや
      </text>

      {/* ── 中央区切りドット（ネオン） ── */}
      <circle
        cx={dotX}
        cy={baseline - parseFloat(cfg.mainSize) * 0.28}
        r={cfg.dotR}
        fill={`url(#${id}-dot)`}
        filter={`url(#${id}-glow)`}
      />

      {/* ── "ゆめ" テキスト ── */}
      <text
        x={yumeX}
        y={baseline}
        fontSize={cfg.mainSize}
        fontWeight={cfg.fontWeight}
        letterSpacing={cfg.letterSpacing}
        fill={`url(#${id}-yume)`}
        fontFamily='"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'
        filter={`url(#${id}-glow)`}
        style={{ fontFeatureSettings: '"palt"' }}
      >
        ゆめ
      </text>

      {/* ── グラデーションアンダーライン ── */}
      <rect
        x={sayaX}
        y={underlineY}
        width={svgW * 0.92}
        height={underlineH}
        rx={underlineH / 2}
        fill={`url(#${id}-line)`}
        filter={`url(#${id}-line-glow)`}
      />

      {/* ── サブテキスト "AI Companion" ── */}
      <text
        x={svgW * 0.04}
        y={svgH * 0.98}
        fontSize={cfg.subSize}
        fontWeight={500}
        letterSpacing="0.18em"
        fill="#94a3b8"
        fontFamily='"Inter", "SF Pro Display", sans-serif'
        textAnchor="start"
      >
        AI COMPANION
      </text>
    </svg>
  );
}
