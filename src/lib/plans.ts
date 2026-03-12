// 料金プラン定義（クライアント/サーバー共用）
export const PLANS = {
  free: {
    name: 'Free',
    nameJa: 'Free',
    price: 0,
    priceLabel: '¥0',
    features: [
      '1日5メッセージ',
      'テキストチャットのみ',
      '写真送信なし',
    ],
    limits: {
      dailyMessages: 5,
      imageGeneration: false,
      voiceMessages: false,
    },
  },
  basic: {
    name: 'Basic',
    nameJa: 'Basic',
    price: 1980,
    priceLabel: '¥1,980/mo',
    features: [
      'メッセージ無制限',
      'AI写真 1日20枚',
      '会話履歴保存',
      'さや & ゆめ 両方',
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
    nameJa: 'Premium',
    price: 4980,
    priceLabel: '¥4,980/mo',
    features: [
      'メッセージ無制限',
      'AI写真 1日50枚',
      'ボイスメッセージ',
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
