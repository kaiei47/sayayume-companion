// 料金プラン定義（クライアント/サーバー共用）
export const PLANS = {
  free: {
    name: 'Free',
    nameJa: 'Free',
    price: 0,
    priceLabel: '¥0',
    features: [
      'メッセージ無制限',
      'AI写真 1日3枚',
      '親密度 Lv3まで',
      'さや & ゆめ 両方',
    ],
    limits: {
      dailyMessages: -1, // unlimited
      imageGeneration: true,
      dailyImages: 3,
      maxIntimacyLevel: 3,
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
      'AI写真 1日30枚',
      '親密度 全Lv解放',
      '会話履歴永続保存',
    ],
    limits: {
      dailyMessages: -1,
      imageGeneration: true,
      dailyImages: 30,
      maxIntimacyLevel: 5,
      voiceMessages: false,
    },
  },
  premium: {
    name: 'Premium',
    nameJa: 'Premium',
    price: 2980,
    priceLabel: '¥2,980/mo',
    features: [
      'メッセージ無制限',
      'AI写真 無制限',
      '親密度 全Lv解放',
      'ボイスメッセージ',
      '限定コンテンツ',
    ],
    limits: {
      dailyMessages: -1,
      imageGeneration: true,
      dailyImages: -1, // unlimited
      maxIntimacyLevel: 5,
      voiceMessages: true,
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;
