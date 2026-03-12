'use client';

import LogoPatternA from '@/components/logos/LogoPatternA';
import LogoPatternB from '@/components/logos/LogoPatternB';
import LogoPatternC from '@/components/logos/LogoPatternC';
import LogoPatternD from '@/components/logos/LogoPatternD';
import LogoPatternF from '@/components/logos/LogoPatternF';
import LogoPatternG from '@/components/logos/LogoPatternG';
import SayayumeLogo from '@/components/SayayumeLogo';

const PATTERNS = [
  { id: 'Current', label: '現在（アイコン画像 + グラデテキスト）', node: <SayayumeLogo size="md" /> },
  { id: 'A',       label: 'A: ネオングローテキスト（さや / ゆめ）',  node: <LogoPatternA size="md" /> },
  { id: 'B',       label: 'B: さや ♡ ゆめ（グラデハート区切り）',    node: <LogoPatternB size="md" /> },
  { id: 'C',       label: 'C: ∞ハートSVGアイコン + グラデテキスト',  node: <LogoPatternC size="md" /> },
  { id: 'D',       label: 'D: さや・ゆめ タイポグラフィック（アンダーライン）', node: <LogoPatternD size="md" /> },
  { id: 'F',       label: 'F: ツインハートSVGアイコン + 分割グラデ', node: <LogoPatternF size="md" /> },
  { id: 'G',       label: 'G: さや × ゆめ（ネオングロー × 区切り）',  node: <LogoPatternG size="md" /> },
];

export default function LogoPreviewPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold">ロゴパターン比較</h1>
        <p className="text-xs text-muted-foreground mt-1">ナビバーの実際のコンテキストで表示</p>
      </div>

      <div className="space-y-3">
        {PATTERNS.map(p => (
          <div key={p.id} className="rounded-2xl border border-border/30 overflow-hidden">
            {/* ナビバー再現 */}
            <div className="flex items-center justify-between px-4 py-3 bg-background/80 border-b border-border/20">
              {p.node}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">ログイン</span>
                <span className="rounded-full bg-white text-black text-[11px] font-semibold px-3 py-1">無料で始める</span>
              </div>
            </div>
            <div className="px-4 py-2 bg-card/20">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground/70">Pattern {p.id}</span> — {p.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
