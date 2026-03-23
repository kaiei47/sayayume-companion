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
      '会話履歴 永続保存',
      'LINEプッシュ通知（さや/ゆめから毎日）',
      'ストーリー ★1のみ',
    ],
    limits: {
      dailyMessages: -1, // unlimited
      imageGeneration: true,
      dailyImages: 3,
      maxIntimacyLevel: 3,
      voiceMessages: false,
      maxStoryDifficulty: 1,
      dailyStoryReplays: 1,
      intimacyDecayReduction: 0, // 0%
      showMissionHints: false,
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
      'さや & ゆめ 両方',
      '会話履歴 永続保存',
      'パーソナルメモリ（趣味・出来事を1ヶ月記憶）',
      'LINEプッシュ通知（さや/ゆめから毎日）',
      'ストーリー ★1〜3',
      'ミッション全表示',
    ],
    limits: {
      dailyMessages: -1,
      imageGeneration: true,
      dailyImages: 30,
      maxIntimacyLevel: 10,
      voiceMessages: false,
      maxStoryDifficulty: 3,
      dailyStoryReplays: 3,
      intimacyDecayReduction: 0, // 0%
      showMissionHints: false,
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
      'さやゆめモード',
      '会話履歴 永続保存',
      'パーソナルメモリ（趣味・出来事をずっと記憶）',
      'LINEプッシュ通知（さや/ゆめから毎日）',
      '全ストーリー解放',
      'ミッション全表示+ヒント',
      '親密度減衰 50%軽減',
      'ストーリー無制限リプレイ',
      'オリジナルアバター（準備中）',
    ],
    limits: {
      dailyMessages: -1,
      imageGeneration: true,
      dailyImages: -1, // unlimited
      maxIntimacyLevel: 10,
      voiceMessages: false,
      maxStoryDifficulty: 5,
      dailyStoryReplays: -1, // unlimited
      intimacyDecayReduction: 0.5, // 50%
      showMissionHints: true,
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;
