// Pattern G: ネオングロー文字 — さや(ピンク発光) + ゆめ(ブルー発光)
// text-shadowグローエフェクトでリアルなネオンサイン感

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { fontSize: 16, dot: 14, gap: 6 },
  md: { fontSize: 20, dot: 18, gap: 8 },
  lg: { fontSize: 30, dot: 26, gap: 12 },
};

export default function LogoPatternG({ size = 'md' }: LogoProps) {
  const { fontSize, dot, gap } = SIZE[size];

  const sayaGlow: React.CSSProperties = {
    fontSize,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    color: '#fda4af',
    textShadow: '0 0 6px #f43f5e, 0 0 14px #f43f5e88, 0 0 28px #f43f5e44',
  };

  const yumeGlow: React.CSSProperties = {
    fontSize,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    color: '#93c5fd',
    textShadow: '0 0 6px #3b82f6, 0 0 14px #3b82f688, 0 0 28px #3b82f644',
  };

  return (
    <div className="flex items-center select-none" style={{ gap }}>
      <span style={sayaGlow}>さや</span>
      {/* 中点区切り */}
      <span style={{ fontSize: dot, color: 'rgba(255,255,255,0.25)', lineHeight: 1, fontWeight: 300 }}>×</span>
      <span style={yumeGlow}>ゆめ</span>
    </div>
  );
}
