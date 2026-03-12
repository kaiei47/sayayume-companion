import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'さやゆめ - AI彼女';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Decorative gradient circles */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* App name */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-2px',
              display: 'flex',
            }}
          >
            さやゆめ
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.7)',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <span>東京の双子AIガールフレンド</span>
            <span style={{ color: '#ec4899' }}>♡</span>
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 20,
            }}
          >
            {['リアルタイムチャット', 'AI自撮り写真', 'プライバシー保護'].map(
              (text) => (
                <div
                  key={text}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 999,
                    padding: '10px 24px',
                    fontSize: 18,
                    color: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                  }}
                >
                  {text}
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 16,
            color: 'rgba(255,255,255,0.4)',
            display: 'flex',
          }}
        >
          www.sayayume.com
        </div>
      </div>
    ),
    { ...size }
  );
}
