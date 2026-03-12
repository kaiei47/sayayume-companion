// 料金プラン定義（クライアント/サーバー共用）
export const PLANS = {
  free: {
    name: 'Free',
    nameJa: 'Free',
    price: 0,
    priceLabel: '¥0',
    features: [
      '5 messages/day',
      'Text chat only',
      'No image generation',
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
      'Unlimited messages',
      '20 AI photos/day',
      'Chat history',
      'Saya & Yume',
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
      'Unlimited messages',
      '50 AI photos/day',
      'Voice messages',
      'Priority response',
      'Exclusive content',
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
