// 料金プラン定義（クライアント/サーバー共用）
export const PLANS = {
  free: {
    name: 'Free',
    nameJa: 'フリー',
    price: 0,
    priceLabel: '¥0',
    features: [
      '1日5メッセージ',
      'テキストチャットのみ',
      '画像生成なし',
    ],
    limits: {
      dailyMessages: 5,
      imageGeneration: false,
      voiceMessages: false,
    },
  },
  basic: {
    name: 'Basic',
    nameJa: 'ベーシック',
    price: 1980,
    priceLabel: '¥1,980/月',
    features: [
      '無制限メッセージ',
      '画像生成（1日20枚）',
      '会話履歴の保存',
      '2キャラ（さや＆ゆめ）',
    ],
    limits: {
      dailyMessages: -1, // unlimited
      imageGeneration: true,
      dailyImages: 20,
      voiceMessages: false,
    },
  },
  premium: {
    name: 'Premium',
    nameJa: 'プレミアム',
    price: 4980,
    priceLabel: '¥4,980/月',
    features: [
      '無制限メッセージ',
      '画像生成（1日50枚）',
      '音声メッセージ',
      '優先レスポンス',
      '限定コンテンツ',
    ],
    limits: {
      dailyMessages: -1,
      imageGeneration: true,
      dailyImages: 50,
      voiceMessages: true,
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;
