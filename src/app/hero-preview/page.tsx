export default function HeroPreviewPage() {
  const images = [
    { file: 'hero2/saya_7.jpg', label: 'さや 7 — 黒タートル・正面・自然光  QC:PASS' },
    { file: 'hero2/saya_8.jpg', label: 'さや 8 — バーガンディブラウス・正面  QC:PASS' },
    { file: 'hero2/saya_9.jpg', label: 'さや 9 — クリームオフショル・正面  QC:PASS' },
    { file: 'hero2/yume_1.jpg', label: 'ゆめ 1 — 白ブラウス・正面 ✅確定' },
  ];

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100dvh', padding: '24px', color: 'white' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>ヒーロー画像プレビュー</h1>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>さや×ゆめ 各3パターン — 気に入った番号を教えて！</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {images.map((img) => (
          <div key={img.file} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #1e293b' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/references/${img.file}`}
              alt={img.label}
              style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
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
