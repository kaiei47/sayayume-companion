'use client';

// ロゴプレビューページ — /logo-preview で確認
// エージェント結果を含む全パターンを並べて表示

import SayayumeLogo from '@/components/SayayumeLogo';
import LogoPatternF from '@/components/logos/LogoPatternF';
import LogoPatternG from '@/components/logos/LogoPatternG';

const PATTERNS = [
  {
    id: 'Current',
    label: '現在 (アイコン + グラデテキスト)',
    component: <SayayumeLogo size="md" />,
  },
  {
    id: 'F',
    label: 'F: SVGハートアイコン + 分割グラデ',
    component: <LogoPatternF size="md" />,
  },
  {
    id: 'G',
    label: 'G: ネオングロー さや×ゆめ',
    component: <LogoPatternG size="md" />,
  },
];

export default function LogoPreviewPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground p-8">
      <h1 className="text-2xl font-bold mb-8">ロゴパターン比較</h1>

      {/* ナビバー風プレビュー */}
      <section className="space-y-4 mb-12">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">ナビバー（実際のコンテキスト）</h2>
        {PATTERNS.map(p => (
          <div key={p.id} className="rounded-2xl border border-border/30 bg-card/30 overflow-hidden">
            {/* ナビバー風ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/20">
              {p.component}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">ログイン</span>
                <span className="rounded-full bg-white text-black text-xs font-semibold px-4 py-1.5">無料で始める</span>
              </div>
            </div>
            {/* ラベル */}
            <div className="px-4 py-2.5">
              <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">Pattern {p.id}</span> — {p.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* サイズ比較 */}
      <section className="space-y-4 mb-12">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">サイズバリエーション（Pattern F & G）</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['sm', 'md', 'lg'] as const).map(s => (
            <div key={s} className="rounded-2xl border border-border/30 bg-card/30 p-4 space-y-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{s}</p>
              <LogoPatternF size={s} />
              <LogoPatternG size={s} />
            </div>
          ))}
        </div>
      </section>

      {/* 背景違いプレビュー */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">背景バリエーション</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { bg: 'bg-background', label: '純黒（現在）' },
            { bg: 'bg-zinc-900', label: 'ダークグレー' },
            { bg: 'bg-gradient-to-r from-pink-950/50 to-blue-950/50', label: 'グラデ背景' },
            { bg: 'bg-white', label: 'ライト（将来用）' },
          ].map(({ bg, label }) => (
            <div key={label} className={`rounded-2xl p-4 space-y-3 ${bg} border border-border/20`}>
              <p className="text-[9px] text-muted-foreground/60 uppercase">{label}</p>
              <LogoPatternG size="sm" />
              <LogoPatternF size="sm" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
