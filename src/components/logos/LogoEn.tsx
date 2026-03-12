'use client';

// English logo patterns for "sayayume"
// All patterns in one file for easy comparison

import React from 'react';

interface LogoProps { size?: 'sm' | 'md' | 'lg' }

const SZ = {
  sm: { main: 15, sub: 9,  dot: 8,  gap: 6  },
  md: { main: 19, sub: 11, dot: 10, gap: 8  },
  lg: { main: 28, sub: 14, dot: 14, gap: 12 },
};

// ── En-1: saya × yume  ネオングロー ──
export function LogoEn1({ size = 'md' }: LogoProps) {
  const s = SZ[size];
  const saya: React.CSSProperties = {
    fontSize: s.main, fontWeight: 800, lineHeight: 1,
    color: '#fda4af',
    textShadow: '0 0 6px #f43f5e, 0 0 16px #f43f5e88, 0 0 32px #f43f5e44',
    letterSpacing: '-0.01em',
  };
  const yume: React.CSSProperties = {
    fontSize: s.main, fontWeight: 800, lineHeight: 1,
    color: '#93c5fd',
    textShadow: '0 0 6px #3b82f6, 0 0 16px #3b82f688, 0 0 32px #3b82f644',
    letterSpacing: '-0.01em',
  };
  const sep: React.CSSProperties = {
    fontSize: s.dot, fontWeight: 300, lineHeight: 1,
    color: 'rgba(255,255,255,0.22)', alignSelf: 'center',
  };
  return (
    <span style={{ display:'inline-flex', alignItems:'baseline', gap: s.gap, userSelect:'none' }}>
      <span style={saya}>saya</span>
      <span style={sep}>×</span>
      <span style={yume}>yume</span>
    </span>
  );
}

// ── En-2: saya ♡ yume  ハート区切り ──
export function LogoEn2({ size = 'md' }: LogoProps) {
  const s = SZ[size];
  const saya: React.CSSProperties = {
    fontSize: s.main, fontWeight: 800, lineHeight: 1,
    color: '#fda4af',
    textShadow: '0 0 8px #f43f5eaa',
    letterSpacing: '-0.01em',
  };
  const yume: React.CSSProperties = {
    fontSize: s.main, fontWeight: 800, lineHeight: 1,
    color: '#93c5fd',
    textShadow: '0 0 8px #3b82f6aa',
    letterSpacing: '-0.01em',
  };
  const heartSize = Math.round(s.main * 0.75);
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap: s.gap * 0.6, userSelect:'none' }}>
      <span style={saya}>saya</span>
      <svg width={heartSize} height={heartSize} viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, filter:'drop-shadow(0 0 4px #c026d3aa)' }}>
        <defs>
          <linearGradient id="hg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e"/>
            <stop offset="50%" stopColor="#c026d3"/>
            <stop offset="100%" stopColor="#3b82f6"/>
          </linearGradient>
        </defs>
        <path d="M12 21C12 21 3 15.5 3 9.5C3 6.46 5.46 4 8.5 4C10.24 4 11.8 4.87 12.75 6.2C13.7 4.87 15.26 4 17 4C20.04 4 22.5 6.46 22.5 9.5C22.5 15.5 12 21 12 21Z" fill="url(#hg2)"/>
      </svg>
      <span style={yume}>yume</span>
    </span>
  );
}

// ── En-3: sayayume  ワンワード グラデーション ──
export function LogoEn3({ size = 'md' }: LogoProps) {
  const s = SZ[size];
  return (
    <span style={{
      display:'inline-block', userSelect:'none',
      fontSize: s.main, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em',
      background: 'linear-gradient(90deg, #f472b6 0%, #c084fc 45%, #60a5fa 100%)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    }}>
      sayayume
    </span>
  );
}

// ── En-4: SAYA YUME  大文字 + アンダーライン ──
export function LogoEn4({ size = 'md' }: LogoProps) {
  const s = SZ[size];
  return (
    <span style={{ display:'inline-flex', flexDirection:'column', userSelect:'none', gap: 2 }}>
      <span style={{ display:'inline-flex', alignItems:'baseline', gap: s.gap * 0.5 }}>
        <span style={{
          fontSize: s.main, fontWeight: 900, lineHeight: 1, letterSpacing: '0.12em',
          background: 'linear-gradient(90deg, #f472b6, #c084fc)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>SAYA</span>
        <span style={{
          fontSize: s.main, fontWeight: 900, lineHeight: 1, letterSpacing: '0.12em',
          background: 'linear-gradient(90deg, #c084fc, #60a5fa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>YUME</span>
      </span>
      {/* グラデアンダーライン */}
      <span style={{
        display:'block', height: 2, borderRadius: 1,
        background: 'linear-gradient(90deg, #f472b6, #c084fc, #60a5fa)',
        boxShadow: '0 0 6px #c084fc88',
      }}/>
    </span>
  );
}

// ── En-5: saya·yume  ドット区切り + italic ──
export function LogoEn5({ size = 'md' }: LogoProps) {
  const s = SZ[size];
  return (
    <span style={{ display:'inline-flex', alignItems:'baseline', gap: s.gap * 0.4, userSelect:'none' }}>
      <span style={{
        fontSize: s.main, fontWeight: 700, fontStyle: 'italic', lineHeight: 1, letterSpacing: '-0.01em',
        background: 'linear-gradient(135deg, #fb7185, #f472b6)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>saya</span>
      <span style={{ fontSize: s.sub, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>·</span>
      <span style={{
        fontSize: s.main, fontWeight: 700, fontStyle: 'italic', lineHeight: 1, letterSpacing: '-0.01em',
        background: 'linear-gradient(135deg, #818cf8, #38bdf8)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>yume</span>
    </span>
  );
}
