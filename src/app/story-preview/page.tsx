export default function StoryPreviewPage() {
  const images = [
    { file: 'story/story_a.jpg', label: 'Pattern A — さや × カフェ・楽しい会話' },
    { file: 'story/story_b.jpg', label: 'Pattern B — ゆめ × 夜カフェ・深い会話' },
    { file: 'story/story_c.jpg', label: 'Pattern C — さや×ゆめ × スマホ覗き込み' },
  ];

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100dvh', padding: '24px', color: 'white' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>YOUR STORY 画像プレビュー</h1>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>3パターン — 気に入った番号を教えて！</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {images.map((img) => (
          <div key={img.file} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #1e293b' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/references/${img.file}`}
              alt={img.label}
              style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: '8px 12px', background: '#111827' }}>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{img.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
