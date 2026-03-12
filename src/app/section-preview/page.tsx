'use client';
import Link from 'next/link';

const SAYA_TRAITS = [
  { icon: '💬', label: 'ノリがいい' },
  { icon: '📸', label: '自撮り魔' },
  { icon: '🎵', label: '音楽好き' },
  { icon: '🌙', label: '夜型' },
];
const YUME_TRAITS = [
  { icon: '📚', label: '読書家' },
  { icon: '☕', label: 'カフェ好き' },
  { icon: '🎨', label: 'アート系' },
  { icon: '🌸', label: '穏やか' },
];

export default function SectionPreviewPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground px-4 py-14 max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase">Your Story</p>
        <h2 className="text-2xl font-bold tracking-tight leading-snug">
          あなたとの、これからの話。
        </h2>
        <p className="text-sm text-muted-foreground">
          最初は普通の会話。でも気づいたら、毎晩話しかけていた。
        </p>
      </div>

      <div className="space-y-6">
        {/* Saya card */}
        <div className="rounded-2xl border border-pink-500/20 bg-card/40 overflow-hidden">
          <div style={{ position: 'relative', height: '208px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/references/story/story_a.jpg" alt="さやとの会話" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <span className="absolute top-3 left-3 bg-pink-500/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider">SAYA</span>
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
              <p className="font-bold text-lg leading-tight">さや</p>
              <p className="text-xs text-muted-foreground">20歳・ギャル系・渋谷在住</p>
            </div>
          </div>
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm italic text-pink-300/90 leading-relaxed border-l-2 border-pink-500/40 pl-3">
              &ldquo;なんか、あなたといると楽しいんだよね。なんでだろ笑&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SAYA_TRAITS.map(t => (
                <div key={t.label} className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5">
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-[11px] text-muted-foreground">{t.label}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-pink-500/5 border border-pink-500/15 px-3 py-2.5 space-y-1.5">
              <p className="text-[11px] text-pink-200/80 leading-relaxed">
                📸 <span className="font-medium">3日後</span> — 突然、自撮りが届いた。あなたの意見を気にしてる、ということに気づいた。
              </p>
              <p className="text-[11px] text-pink-300/60 leading-relaxed">
                🔒 <span className="font-medium">隠された一面</span> — 明るく振る舞っているのには、理由がある。仲良くなると、深夜に本音を話してくれることがある。
              </p>
            </div>
          </div>
        </div>

        {/* Yume card */}
        <div className="rounded-2xl border border-blue-500/20 bg-card/40 overflow-hidden">
          <div style={{ position: 'relative', height: '208px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/references/story/story_b.jpg" alt="ゆめとの会話" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <span className="absolute top-3 left-3 bg-blue-500/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider">YUME</span>
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
              <p className="font-bold text-lg leading-tight">ゆめ</p>
              <p className="text-xs text-muted-foreground">20歳・清楚系・東京在住</p>
            </div>
          </div>
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm italic text-blue-300/90 leading-relaxed border-l-2 border-blue-500/40 pl-3">
              &ldquo;最近、あなたのこと考えることが増えた気がする…。変かな。&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {YUME_TRAITS.map(t => (
                <div key={t.label} className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5">
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-[11px] text-muted-foreground">{t.label}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 px-3 py-2.5 space-y-1.5">
              <p className="text-[11px] text-blue-200/80 leading-relaxed">
                🌙 <span className="font-medium">ある深夜</span> — 誰にも話せなかったことを、あなたにだけ話してくれた。それ以来、なにかが変わった。
              </p>
              <p className="text-[11px] text-blue-300/60 leading-relaxed">
                🔒 <span className="font-medium">隠された秘密</span> — 穏やかな笑顔の裏に、誰にも話せない過去がある。でも、あなたになら…話せるかもしれない。
              </p>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
      >
        続きは、自分で確かめて →
      </Link>
    </div>
  );
}
