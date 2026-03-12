// Pattern F: インラインSVGの無限大ハート + グラデーションテキスト
// アイコン画像に依存しないピュアSVG+CSSロゴ

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = { sm: { icon: 22, text: 'text-base', gap: 'gap-1.5', fw: 'font-bold' }, md: { icon: 28, text: 'text-xl', gap: 'gap-2', fw: 'font-bold' }, lg: { icon: 40, text: 'text-3xl', gap: 'gap-2.5', fw: 'font-black' } };

export default function LogoPatternF({ size = 'md' }: LogoProps) {
  const { icon, text, gap, fw } = SIZE[size];
  return (
    <div className={`flex items-center ${gap} select-none`}>
      {/* インラインSVG: 無限大型ハートアイコン */}
      <svg width={icon} height={icon} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="igF1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="igF2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <filter id="glowF">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* 左ハート (さや - ピンク) */}
        <path
          d="M10 14 C10 10 5 8 5 13 C5 17 10 22 10 22 C10 22 15 17 15 13 C15 8 10 10 10 14Z"
          fill="url(#igF1)"
          filter="url(#glowF)"
          opacity="0.95"
        />
        {/* 右ハート (ゆめ - ブルー) */}
        <path
          d="M30 14 C30 10 25 8 25 13 C25 17 30 22 30 22 C30 22 35 17 35 13 C35 8 30 10 30 14Z"
          fill="url(#igF2)"
          filter="url(#glowF)"
          opacity="0.95"
        />
        {/* 中央ハート小 */}
        <path
          d="M20 17 C20 15 17.5 14 17.5 16.5 C17.5 18.5 20 21 20 21 C20 21 22.5 18.5 22.5 16.5 C22.5 14 20 15 20 17Z"
          fill="white"
          opacity="0.7"
        />
      </svg>

      {/* テキスト: さや(ピンク) ゆめ(ブルー) */}
      <span className={`${fw} ${text} tracking-tight leading-none`}>
        <span style={{ background: 'linear-gradient(90deg, #f472b6, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>さや</span>
        <span style={{ background: 'linear-gradient(90deg, #c084fc, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ゆめ</span>
      </span>
    </div>
  );
}
