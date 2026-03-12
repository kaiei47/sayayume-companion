/**
 * LogoPatternC: インラインSVGアイコン + グラデーションテキスト
 *
 * ピンク×ブルーグラデーションの無限大ハートアイコン（∞ × ♡ の融合）+
 * "さやゆめ" グラデーションテキスト
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { iconSize: 28, fontSize: '15px', gap: 6, letterSpacing: '0.04em', fontWeight: 700 },
  md: { iconSize: 36, fontSize: '19px', gap: 8, letterSpacing: '0.04em', fontWeight: 700 },
  lg: { iconSize: 52, fontSize: '27px', gap: 11, letterSpacing: '0.04em', fontWeight: 800 },
};

export default function LogoPatternC({ size = 'md' }: LogoProps) {
  const { iconSize, fontSize, gap, letterSpacing, fontWeight } = SIZE_MAP[size];
  const id = `pc-grad-${size}`;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* ── SVG アイコン: ∞ ハート二重融合 ── */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* ピンク → ブルー グラデーション */}
          <linearGradient id={`${id}-main`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#f472b6" />
            <stop offset="50%"  stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          {/* グロー用フィルター */}
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* 薄背景グロー */}
          <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#f472b6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 背景サークル（薄グロー） */}
        <circle cx="18" cy="18" r="17" fill={`url(#${id}-bg)`} />

        {/* ── メインモチーフ: 無限大ハート ──
            左側: ピンクハート（さや）
            右側: ブルーハート（ゆめ）
            中央で交差、∞ ループ構造 */}
        <g filter={`url(#${id}-glow)`}>
          {/* 左ハート (さや / ピンク寄り) */}
          <path
            d="M11 15.5
               C11 13.0 8 11.5 6.5 13.5
               C5 15.5 6.5 17.5 9 19.5
               L13 22.5
               L13 22.5
               C13 22.5 12.5 21.5 12 20.5
               C10 18.5 10.5 17 11 15.5Z"
            fill={`url(#${id}-main)`}
            opacity="0.9"
          />
          {/* 右ハート (ゆめ / ブルー寄り) */}
          <path
            d="M25 15.5
               C25 13.0 28 11.5 29.5 13.5
               C31 15.5 29.5 17.5 27 19.5
               L23 22.5
               L23 22.5
               C23 22.5 23.5 21.5 24 20.5
               C26 18.5 25.5 17 25 15.5Z"
            fill={`url(#${id}-main)`}
            opacity="0.9"
          />
          {/* 中央ハート本体（大） */}
          <path
            d="M18 26
               C18 26 6 19 6 13
               C6 9.5 9 8 11.5 8
               C14 8 16 9.5 18 12
               C20 9.5 22 8 24.5 8
               C27 8 30 9.5 30 13
               C30 19 18 26 18 26Z"
            fill={`url(#${id}-main)`}
          />
          {/* 内側の小さな星（中央アクセント） */}
          <path
            d="M18 12.5 L18.6 14.2 L20.4 14.2 L19 15.2 L19.5 17 L18 16 L16.5 17 L17 15.2 L15.6 14.2 L17.4 14.2Z"
            fill="white"
            opacity="0.85"
          />
        </g>
      </svg>

      {/* ── テキスト: さやゆめ グラデーション ── */}
      <svg
        height={iconSize}
        viewBox={`0 0 ${Math.round(iconSize * 2.6)} ${iconSize}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="さやゆめ"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`${id}-text`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#f9a8d4" />
            <stop offset="45%"  stopColor="#c084fc" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
        </defs>
        <text
          x="0"
          y={iconSize * 0.78}
          fontSize={fontSize}
          fontWeight={fontWeight}
          letterSpacing={letterSpacing}
          fill={`url(#${id}-text)`}
          fontFamily='"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'
          style={{ fontFeatureSettings: '"palt"' }}
        >
          さやゆめ
        </text>
      </svg>
    </div>
  );
}
