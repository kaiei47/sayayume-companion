'use client';

/**
 * LogoFinal: アプリアイコン + 装飾SVGテキスト
 * textStyle: 'SAYA YUME' | 'Saya Yume' | 'SayaYume'
 * underline: true | false
 */

import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  textStyle?: 'SAYA YUME' | 'Saya Yume' | 'SayaYume';
  underline?: boolean;
}

const SZ = {
  sm: { icon: 24, h: 24, main: 13, sub: 6.5, gap: 6,  lineH: 1.5, textW: 108 },
  md: { icon: 32, h: 32, main: 17, sub: 8,   gap: 8,  lineH: 2,   textW: 140 },
  lg: { icon: 44, h: 44, main: 23, sub: 10,  gap: 10, lineH: 2.5, textW: 188 },
};

// テキストスタイル別のレタースペーシング
const LETTER_SPACING: Record<string, string> = {
  'SAYA YUME': '0.13em',
  'Saya Yume': '0.04em',
  'SayaYume':  '0.02em',
};

export default function LogoFinal({
  size = 'md',
  textStyle = 'SAYA YUME',
  underline = true,
}: LogoProps) {
  const s = SZ[size];
  // テキストスタイルが変わると gradient ID が衝突しないようにユニーク化
  const idKey = textStyle.replace(/\s/g, '');
  const id = `lf-${size}-${idKey}`;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* ── アプリアイコン（縁なし・円形クリップ） ── */}
      <div
        style={{
          width: s.icon,
          height: s.icon,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Image
          src="/icons/icon-192.png"
          width={s.icon}
          height={s.icon}
          alt=""
          aria-hidden="true"
          style={{ display: 'block' }}
        />
      </div>

      {/* ── テキスト（SVG） ── */}
      <svg
        width={s.textW}
        height={s.h}
        viewBox={`0 0 ${s.textW} ${s.h}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="sayayume"
        style={{ overflow: 'visible', flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#f472b6" />
            <stop offset="45%"  stopColor="#c084fc" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>

          <linearGradient id={`${id}-line`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#f43f5e" />
            <stop offset="48%"  stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <filter id={`${id}-glow`} x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`${id}-lglow`} x="-5%" y="-100%" width="110%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── メインテキスト + サブテキスト（垂直中央揃え） ──
             2行ブロック高さ = main capH + gap + sub capH を SVG 高さ中央に配置
             capH ≈ fontSize * 0.72、gap = 3px（固定）                          */}
        {(() => {
          const capMain  = s.main * 0.72;
          const capSub   = s.sub  * 0.72;
          const hasSub   = size !== 'sm';
          const gap      = 3;
          const blockH   = hasSub ? capMain + gap + capSub : capMain;
          const topY     = (s.h - blockH) / 2;
          const mainY    = topY + capMain;
          const subY     = mainY + gap + capSub;
          const lineY    = mainY + s.main * 0.16 + s.lineH;
          return (
            <>
              <text
                x="0"
                y={mainY}
                fontSize={s.main}
                fontWeight={900}
                letterSpacing={LETTER_SPACING[textStyle]}
                fill={`url(#${id}-grad)`}
                fontFamily='"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif'
                filter={`url(#${id}-glow)`}
              >
                {textStyle}
              </text>

              {underline && (
                <rect
                  x={0}
                  y={lineY}
                  width={s.textW * 0.96}
                  height={s.lineH}
                  rx={s.lineH / 2}
                  fill={`url(#${id}-line)`}
                  filter={`url(#${id}-lglow)`}
                />
              )}

              {hasSub && (
                <text
                  x="0.5"
                  y={subY}
                  fontSize={s.sub}
                  fontWeight={500}
                  letterSpacing="0.2em"
                  fill="#64748b"
                  fontFamily='"Inter", system-ui, sans-serif'
                >
                  AI ROMANCE SIM
                </text>
              )}
            </>
          );
        })()}
      </svg>
    </div>
  );
}
