import Image from 'next/image';

interface SayayumeLogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** アイコンのみ（テキストなし） */
  iconOnly?: boolean;
}

const SIZE_MAP = {
  sm: { icon: 24, text: 'text-base', gap: 'gap-1.5' },
  md: { icon: 32, text: 'text-xl',   gap: 'gap-2'   },
  lg: { icon: 48, text: 'text-3xl',  gap: 'gap-3'   },
};

export default function SayayumeLogo({ size = 'md', iconOnly = false }: SayayumeLogoProps) {
  const { icon, text, gap } = SIZE_MAP[size];

  return (
    <div className={`flex items-center ${gap} select-none`}>
      {/* アプリアイコン */}
      <div className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: icon, height: icon }}>
        <Image
          src="/icons/icon-192.png"
          alt="さやゆめ"
          width={icon}
          height={icon}
          className="object-cover"
          priority
        />
      </div>

      {/* テキスト（ピンク→ブルーグラデ） */}
      {!iconOnly && (
        <span
          className={`font-bold tracking-tight leading-none ${text} bg-gradient-to-r from-pink-400 via-purple-300 to-blue-400 bg-clip-text text-transparent`}
        >
          さやゆめ
        </span>
      )}
    </div>
  );
}
