'use client';

import { LogoEn1, LogoEn2, LogoEn3, LogoEn4, LogoEn5 } from '@/components/logos/LogoEn';
import LogoFinal from '@/components/logos/LogoFinal';

const PATTERNS = [
  { id: 'A', label: 'アイコン + SAYA YUME（下線あり）',  node: <LogoFinal size="md" textStyle="SAYA YUME" underline={true}  />, highlight: true },
  { id: 'B', label: 'アイコン + Saya Yume（下線なし）',  node: <LogoFinal size="md" textStyle="Saya Yume" underline={false} />, highlight: true },
  { id: 'C', label: 'アイコン + SayaYume（下線なし）',   node: <LogoFinal size="md" textStyle="SayaYume"  underline={false} />, highlight: true },
  { id: '1', label: 'saya × yume  ネオングロー',         node: <LogoEn1 size="md" /> },
  { id: '2', label: 'saya ♡ yume  グラデハート区切り',   node: <LogoEn2 size="md" /> },
  { id: '3', label: 'sayayume  ワンワード グラデーション',node: <LogoEn3 size="md" /> },
  { id: '4', label: 'SAYA YUME  大文字 + アンダーライン',node: <LogoEn4 size="md" /> },
  { id: '5', label: 'saya · yume  ドット区切り イタリック',node: <LogoEn5 size="md" /> },
];

export default function LogoPreviewPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">ロゴパターン比較</h1>
        <p className="text-xs text-muted-foreground mt-1">ナビバーの実際のコンテキストで表示</p>
      </div>

      <div className="space-y-3">
        {PATTERNS.map(p => (
          <div
            key={p.id}
            className={`rounded-2xl border overflow-hidden ${
              (p as { highlight?: boolean }).highlight
                ? 'border-purple-500/60'
                : 'border-border/30'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-background/80 border-b border-border/20">
              {p.node}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Login</span>
                <span className="rounded-full bg-white text-black text-[11px] font-semibold px-3 py-1">Start Free</span>
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
