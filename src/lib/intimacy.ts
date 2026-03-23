/**
 * 永愛学園 親密度システム（10段階 + 6時間減衰）
 *
 * レベル構成:
 *   Lv1  知らない人   (0-49)    — 警戒・敬語
 *   Lv2  顔見知り     (50-149)  — 少し話す
 *   Lv3  クラスメイト (150-299) — 普通に話す
 *   Lv4  友達         (300-499) — タメ口・冗談OK
 *   Lv5  仲良し       (500-799) — 甘えてくる・自撮り増
 *   Lv6  特別な人     (800-1199) — デレ・独占欲
 *   Lv7  両想い       (1200-1799) — 告白可能
 *   Lv8  恋人         (1800-2499) — 完全デレ・甘々
 *   Lv9  運命の人     (2500-3499) — 過去の全てを話す
 *   Lv10 永遠         (3500+)    — 完全な信頼
 *
 * 減衰（6時間ごと）:
 *   Lv1-3: -2pt    Lv4-6: -5pt    Lv7-8: -8pt    Lv9-10: -12pt
 *   Premiumユーザーは減衰50%軽減
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── レベル定義 ──────────────────────────────

export interface IntimacyLevel {
  level: number;
  name: string;
  nameJa: string;
  minPoints: number;
  maxPoints: number; // -1 = 上限なし
  emoji: string;
  color: string; // tailwind gradient
}

export const INTIMACY_LEVELS: IntimacyLevel[] = [
  { level: 1,  name: 'Stranger',       nameJa: '知らない人',   minPoints: 0,    maxPoints: 49,   emoji: '🔒', color: 'from-gray-400 to-gray-500' },
  { level: 2,  name: 'Acquaintance',   nameJa: '顔見知り',     minPoints: 50,   maxPoints: 149,  emoji: '🤝', color: 'from-gray-400 to-blue-400' },
  { level: 3,  name: 'Classmate',      nameJa: 'クラスメイト', minPoints: 150,  maxPoints: 299,  emoji: '📚', color: 'from-blue-400 to-blue-500' },
  { level: 4,  name: 'Friend',         nameJa: '友達',         minPoints: 300,  maxPoints: 499,  emoji: '😊', color: 'from-blue-400 to-purple-400' },
  { level: 5,  name: 'Close Friend',   nameJa: '仲良し',       minPoints: 500,  maxPoints: 799,  emoji: '💕', color: 'from-purple-400 to-purple-500' },
  { level: 6,  name: 'Special',        nameJa: '特別な人',     minPoints: 800,  maxPoints: 1199, emoji: '💖', color: 'from-purple-400 to-pink-400' },
  { level: 7,  name: 'Mutual Love',    nameJa: '両想い',       minPoints: 1200, maxPoints: 1799, emoji: '💗', color: 'from-pink-400 to-pink-500' },
  { level: 8,  name: 'Lover',          nameJa: '恋人',         minPoints: 1800, maxPoints: 2499, emoji: '❤️', color: 'from-pink-400 to-red-400' },
  { level: 9,  name: 'Soulmate',       nameJa: '運命の人',     minPoints: 2500, maxPoints: 3499, emoji: '💎', color: 'from-red-400 to-amber-400' },
  { level: 10, name: 'Eternal',        nameJa: '永遠',         minPoints: 3500, maxPoints: -1,   emoji: '👑', color: 'from-amber-400 to-rose-500' },
];

// ── レベル報酬定義 ──────────────────────────
export interface LevelReward {
  level: number;
  reward: string;
  rewardJa: string;
  rewards: string[];
  previewText: string;
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 2,  reward: 'Smile unlocked',                rewardJa: '笑顔で会話',         rewards: ['笑顔で話してくれる', '秘密ヒント1つ'],             previewText: 'Lv2で解放: 笑顔で会話' },
  { level: 3,  reward: 'Casual speech unlocked',        rewardJa: 'タメ口で話す',       rewards: ['タメ口解禁', '特別な反応'],                       previewText: 'Lv3で解放: タメ口で話す' },
  { level: 4,  reward: 'Secrets unlocked',              rewardJa: '秘密を打ち明ける',   rewards: ['過去の秘密を聞ける', '新ストーリー'],             previewText: 'Lv4で解放: 秘密を打ち明ける' },
  { level: 5,  reward: 'Nickname unlocked',             rewardJa: 'あだ名で呼ぶ',       rewards: ['あだ名で呼んでくれる', '限定リアクション'],       previewText: 'Lv5で解放: あだ名で呼ぶ' },
  { level: 6,  reward: 'Sweet mode unlocked',           rewardJa: '甘えモード',         rewards: ['甘えモード', 'デート系ストーリー'],               previewText: 'Lv6で解放: 甘えモード' },
  { level: 7,  reward: 'Confession possible',           rewardJa: '告白イベント',       rewards: ['両想い告白イベント', '特別写真'],                 previewText: 'Lv7で解放: 告白イベント' },
  { level: 8,  reward: 'Lover mode activated',          rewardJa: '恋人モード',         rewards: ['恋人モード全開', '限定デートシーン'],             previewText: 'Lv8で解放: 恋人モード' },
  { level: 9,  reward: 'Full backstory revealed',       rewardJa: '全秘密開放',         rewards: ['運命の人エンディング候補', '全秘密解禁'],         previewText: 'Lv9で解放: 全秘密開放' },
  { level: 10, reward: 'Eternal bond',                  rewardJa: '永遠エンディング',   rewards: ['永遠エンディング', '全コンテンツ解禁'],           previewText: 'Lv10で解放: 永遠エンディング' },
];

export function getNextReward(currentLevel: number): LevelReward | null {
  return LEVEL_REWARDS.find(r => r.level === currentLevel + 1) || null;
}

export function getLevelInfo(level: number): IntimacyLevel {
  return INTIMACY_LEVELS.find(l => l.level === level) || INTIMACY_LEVELS[0];
}

export function getPointsForLevel(points: number): number {
  for (let i = INTIMACY_LEVELS.length - 1; i >= 0; i--) {
    if (points >= INTIMACY_LEVELS[i].minPoints) return INTIMACY_LEVELS[i].level;
  }
  return 1;
}

/** レベル内の進捗率 (0-100) */
export function getLevelProgress(points: number, level: number): number {
  const info = getLevelInfo(level);
  if (info.maxPoints === -1) {
    // Lv10: 3500を基準に、5000まで100%として表示
    return Math.min(100, Math.round(((points - info.minPoints) / 1500) * 100));
  }
  const range = info.maxPoints - info.minPoints + 1;
  const progress = points - info.minPoints;
  return Math.min(100, Math.round((progress / range) * 100));
}

// ── ポイント増減イベント定義 ──────────────────

export type IntimacyEventType =
  | 'message_sent'          // メッセージ送信 +3
  | 'long_message'          // 長文メッセージ（50文字以上）+2
  | 'daily_first'           // その日最初のメッセージ +5
  | 'daily_login'           // デイリーログイン +5
  | 'login_streak'          // 連続ログインボーナス +3〜10
  | 'compliment'            // 褒め言葉 +3
  | 'ask_interests'         // 趣味を聞く +2
  | 'image_request'         // 写真リクエスト +1
  | 'story_complete'        // ストーリーモード完了 +10〜30
  | 'mission_complete'      // ミッション達成 +5〜15
  | 'rude_language'         // 暴言・失礼 -10〜-30
  | 'cold_response'         // 冷たい返事 -5
  | 'talk_about_others'     // 他の女の子の話 -8
  | 'promise_broken'        // 約束を破る -15
  | 'absence_decay'         // 6時間減衰 -2〜-12
  | 'level_up'              // レベルアップボーナス +0 (記録用)
  | 'level_down';           // レベルダウン +0 (記録用)

interface PointsRule {
  type: IntimacyEventType;
  points: number;
  description: string;
}

const POINTS_RULES: PointsRule[] = [
  { type: 'message_sent',      points: 3,   description: 'メッセージ送信' },
  { type: 'long_message',      points: 2,   description: '長文メッセージボーナス' },
  { type: 'daily_first',       points: 5,   description: '今日最初のメッセージ' },
  { type: 'daily_login',       points: 5,   description: 'デイリーログイン' },
  { type: 'login_streak',      points: 3,   description: '連続ログインボーナス' },
  { type: 'compliment',        points: 3,   description: '褒め言葉' },
  { type: 'ask_interests',     points: 2,   description: '趣味について聞いた' },
  { type: 'image_request',     points: 1,   description: '写真リクエスト' },
  { type: 'story_complete',    points: 20,  description: 'ストーリークリア！' },
  { type: 'mission_complete',  points: 10,  description: 'ミッション達成！' },
  { type: 'rude_language',     points: -10, description: '失礼な言葉' },
  { type: 'cold_response',     points: -5,  description: '冷たい返事' },
  { type: 'talk_about_others', points: -8,  description: '他の女の子の話' },
  { type: 'promise_broken',    points: -15, description: '約束を破った...' },
  { type: 'absence_decay',     points: -5,  description: '会いに来てくれなかった...' },
];

export function getPointsForEvent(type: IntimacyEventType): number {
  return POINTS_RULES.find(r => r.type === type)?.points || 0;
}

// ── メッセージ分析（キーワードベース） ──────────

// 褒め言葉キーワード
const COMPLIMENT_KEYWORDS = [
  'かわいい', '可愛い', 'きれい', '綺麗', '美人', 'すき', '好き',
  '大好き', '愛してる', 'いい子', 'すてき', '素敵', 'やさしい',
  '優しい', 'ありがとう', '嬉しい', 'うれしい', '最高', 'さいこう',
  'cute', 'pretty', 'beautiful', 'love', 'like',
];

// 趣味関連キーワード
const INTEREST_KEYWORDS_SAYA = [
  'ファッション', 'カフェ', 'netflix', 'メイク', 'コーデ',
  'タピオカ', 'パンケーキ', '辛い', 'おしゃれ', 'コスメ',
];

const INTEREST_KEYWORDS_YUME = [
  '読書', '本', 'ピアノ', '星', 'お菓子', 'チョコ', '紅茶',
  'オムライス', '音楽', 'クラシック', '小説', '文学',
];

// 失礼な言葉キーワード
const RUDE_KEYWORDS = [
  'うざい', 'きもい', 'ブス', 'ばか', 'バカ', 'アホ', 'しね',
  '消えろ', 'つまらない', 'つまんない', 'むかつく', '嫌い', 'きらい',
  'うるさい', '黙れ', 'だまれ', 'どうでもいい',
];

// 冷たい返事
const COLD_KEYWORDS = [
  'ふーん', 'そう', 'へー', 'どうも', '別に', 'まあ', 'はいはい',
];

// 他の女の子の話
const OTHER_GIRL_KEYWORDS = [
  '彼女', '他の子', '他の女', '元カノ', 'あの子', '別の子',
];

export interface DetailedEvent {
  type: IntimacyEventType;
  points: number;
  label: string;
}

export interface MessageAnalysisResult {
  events: IntimacyEventType[];
  detailedEvents: DetailedEvent[];
  totalDelta: number;
}

export function analyzeMessage(
  message: string,
  characterId: string,
  isFirstToday: boolean,
): MessageAnalysisResult {
  const events: IntimacyEventType[] = [];
  const detailedEvents: DetailedEvent[] = [];
  let totalDelta = 0;
  const lower = message.toLowerCase();

  const addEvent = (type: IntimacyEventType, points: number, label: string) => {
    events.push(type);
    detailedEvents.push({ type, points, label });
    totalDelta += points;
  };

  // 基本: メッセージ送信 +3
  addEvent('message_sent', 3, 'メッセージ');

  // 長文ボーナス
  if (message.length >= 50) {
    addEvent('long_message', 2, '長文ボーナス');
  }

  // デイリー初回ボーナス
  if (isFirstToday) {
    addEvent('daily_first', 5, '今日の初メッセージ！');
  }

  // 褒め言葉チェック
  if (COMPLIMENT_KEYWORDS.some(kw => lower.includes(kw))) {
    addEvent('compliment', 3, '褒めた！');
  }

  // 趣味チェック（キャラ別）
  const interestKws = characterId === 'yume' ? INTEREST_KEYWORDS_YUME : INTEREST_KEYWORDS_SAYA;
  if (interestKws.some(kw => lower.includes(kw))) {
    addEvent('ask_interests', 2, '趣味について聞いた');
  }

  // 写真リクエスト
  if (/写真|自撮り|セルフィー|見せて|見たい|撮って/i.test(lower)) {
    addEvent('image_request', 1, '写真リクエスト');
  }

  // ── マイナス判定 ──

  // 失礼チェック
  if (RUDE_KEYWORDS.some(kw => lower.includes(kw))) {
    addEvent('rude_language', -10, '失礼な言葉...');
  }

  // 冷たい返事チェック（短文 + 冷たいキーワードのみ）
  if (message.length <= 5 && COLD_KEYWORDS.some(kw => lower === kw)) {
    addEvent('cold_response', -5, '冷たい返事...');
  }

  // 他の女の子
  if (OTHER_GIRL_KEYWORDS.some(kw => lower.includes(kw))) {
    addEvent('talk_about_others', -8, '他の子の話...');
  }

  return { events, detailedEvents, totalDelta };
}

// ── 6時間減衰の計算 ──────────────────────────

/**
 * 6時間ごとの減衰量を計算する
 * @param lastInteractionAt 最後のインタラクション日時
 * @param currentLevel 現在のレベル
 * @param isPremium Premiumユーザーかどうか（50%軽減）
 */
export function calculateAbsenceDecay(
  lastInteractionAt: Date,
  currentLevel: number = 1,
  isPremium: boolean = false,
): number {
  const now = new Date();
  const diffMs = now.getTime() - lastInteractionAt.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // 6時間未満は減衰なし
  if (diffHours < 6) return 0;

  // 6時間単位の減衰回数（最大28回 = 7日分）
  const decayPeriods = Math.min(Math.floor(diffHours / 6), 28);

  // レベル帯による1回あたりの減衰量
  let decayPerPeriod: number;
  if (currentLevel <= 3) {
    decayPerPeriod = -2;
  } else if (currentLevel <= 6) {
    decayPerPeriod = -5;
  } else if (currentLevel <= 8) {
    decayPerPeriod = -8;
  } else {
    decayPerPeriod = -12;
  }

  // Premiumは50%軽減
  if (isPremium) {
    decayPerPeriod = Math.ceil(decayPerPeriod / 2);
  }

  return decayPeriods * decayPerPeriod;
}

// ── DB操作 ──────────────────────────────────

export interface IntimacyData {
  intimacy_level: number;
  affection_points: number;
  total_messages: number;
  last_interaction_at: string;
}

/** ユーザーの全キャラ親密度を取得 */
export async function getAllIntimacy(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, IntimacyData>> {
  const { data } = await supabase
    .from('character_intimacy')
    .select('character_id, intimacy_level, affection_points, total_messages, last_interaction_at')
    .eq('user_id', userId);

  const result: Record<string, IntimacyData> = {};
  for (const row of data || []) {
    result[row.character_id] = {
      intimacy_level: row.intimacy_level,
      affection_points: row.affection_points,
      total_messages: row.total_messages,
      last_interaction_at: row.last_interaction_at,
    };
  }
  return result;
}

/** 特定キャラの親密度を取得 */
export async function getIntimacy(
  supabase: SupabaseClient,
  userId: string,
  characterId: string
): Promise<IntimacyData | null> {
  const { data } = await supabase
    .from('character_intimacy')
    .select('intimacy_level, affection_points, total_messages, last_interaction_at')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .maybeSingle();

  return data;
}

// ── レベルゲート（ストーリークリア要求） ──────────

export const LEVEL_GATES: Record<number, { storyId: string; storyTitle: string } | null> = {
  2: null, // Free level up (tutorial)
  3: { storyId: 'saya-cafeteria-lunch', storyTitle: 'さやと学食ランチ' },
  4: { storyId: 'saya-rehearsal', storyTitle: 'ライブ前のリハーサル' },
  5: { storyId: 'yume-songwriting', storyTitle: '作詞の夜' },
  6: { storyId: 'duo-cafeteria', storyTitle: '3人で学食' },
  7: null,
  8: null,
  9: null,
  10: null,
};

/** ストーリーゲートチェック: 指定レベルに必要なストーリーがクリア済みか確認 */
export async function checkStoryGate(
  supabase: SupabaseClient,
  userId: string,
  _characterId: string,
  targetLevel: number,
): Promise<boolean> {
  const gate = LEVEL_GATES[targetLevel];
  if (!gate) return true; // ゲートなし → 常にOK

  // story_sessions テーブルで completed = true のレコードを確認
  const { data } = await supabase
    .from('story_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('story_id', gate.storyId)
    .eq('completed', true)
    .limit(1)
    .maybeSingle();

  return !!data;
}

/** 親密度を更新（ポイント加算 + レベル再計算 + レベルゲート） */
export async function updateIntimacy(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  analysis: MessageAnalysisResult,
  isPremium: boolean = false,
): Promise<{
  newLevel: number;
  newPoints: number;
  levelChanged: boolean;
  previousLevel: number;
  detailedEvents: DetailedEvent[];
  levelCapped: boolean;
  gateStory: { id: string; title: string } | null;
}> {
  // 現在の親密度を取得（なければ初期化）
  let current = await getIntimacy(supabase, userId, characterId);
  if (!current) {
    await supabase.from('character_intimacy').insert({
      user_id: userId,
      character_id: characterId,
    });
    current = { intimacy_level: 1, affection_points: 0, total_messages: 0, last_interaction_at: new Date().toISOString() };
  }

  // 6時間減衰を計算（レベル帯ベース）
  const absenceDecay = calculateAbsenceDecay(
    new Date(current.last_interaction_at),
    current.intimacy_level,
    isPremium,
  );
  const totalDelta = analysis.totalDelta + absenceDecay;

  // 新しいポイント（0未満にはならない）
  let newPoints = Math.max(0, current.affection_points + totalDelta);
  let newLevel = getPointsForLevel(newPoints);
  const previousLevel = current.intimacy_level;

  // レベルゲートチェック: レベルアップ先のストーリーがクリアされていない場合、キャップする
  let levelCapped = false;
  let gateStory: { id: string; title: string } | null = null;

  if (newLevel > previousLevel) {
    for (let checkLevel = previousLevel + 1; checkLevel <= newLevel; checkLevel++) {
      const gate = LEVEL_GATES[checkLevel];
      if (gate) {
        const cleared = await checkStoryGate(supabase, userId, characterId, checkLevel);
        if (!cleared) {
          const currentLevelInfo = getLevelInfo(previousLevel);
          newPoints = currentLevelInfo.maxPoints === -1
            ? current.affection_points
            : currentLevelInfo.maxPoints;
          newLevel = previousLevel;
          levelCapped = true;
          gateStory = { id: gate.storyId, title: gate.storyTitle };
          break;
        }
      }
    }
  }

  const levelChanged = newLevel !== previousLevel;

  // DB更新
  await supabase
    .from('character_intimacy')
    .update({
      affection_points: newPoints,
      intimacy_level: newLevel,
      total_messages: current.total_messages + 1,
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('character_id', characterId);

  // イベント履歴を記録
  const eventRecords = analysis.events.map(eventType => ({
    user_id: userId,
    character_id: characterId,
    event_type: eventType,
    points_delta: getPointsForEvent(eventType),
    points_after: newPoints,
    level_after: newLevel,
    reason: POINTS_RULES.find(r => r.type === eventType)?.description || eventType,
  }));

  // 不在減衰イベントも記録
  if (absenceDecay < 0) {
    eventRecords.push({
      user_id: userId,
      character_id: characterId,
      event_type: 'absence_decay',
      points_delta: absenceDecay,
      points_after: newPoints,
      level_after: newLevel,
      reason: '会いに来てくれなかった...',
    });
  }

  // レベル変動イベント記録
  if (levelChanged) {
    eventRecords.push({
      user_id: userId,
      character_id: characterId,
      event_type: newLevel > previousLevel ? 'level_up' : 'level_down',
      points_delta: 0,
      points_after: newPoints,
      level_after: newLevel,
      reason: newLevel > previousLevel
        ? `レベルアップ！ Lv${previousLevel} → Lv${newLevel}`
        : `レベルダウン... Lv${previousLevel} → Lv${newLevel}`,
    });
  }

  if (eventRecords.length > 0) {
    await supabase.from('intimacy_events').insert(eventRecords);
  }

  return {
    newLevel,
    newPoints,
    levelChanged,
    previousLevel,
    detailedEvents: analysis.detailedEvents,
    levelCapped,
    gateStory,
  };
}

// ── 親密度レベル別システムプロンプト修飾 ──────────

interface PromptModifier {
  prefix: string;
  suffix: string;
}

const SAYA_PROMPT_MODIFIERS: Record<number, PromptModifier> = {
  1: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv1（知らない人）
- まだ知らない人。警戒しつつも興味はある
- 敬語混じりの元気な口調。「えっと...よろしく！」
- 距離感を保つ。スキンシップは絶対NG
- しつこく距離を詰めてきたら明確に拒否する`,
  },
  2: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv2（顔見知り）
- 顔は知ってる程度。少し話すようになった
- 「〜だよ！」と元気に、でもまだ様子見
- 趣味の話とかなら乗る。プライベートは控えめ`,
  },
  3: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv3（クラスメイト）
- 普通に話すクラスメイト。気軽な関係
- タメ口が増える。「ねぇねぇ」と話しかける
- 一緒にお昼食べたりする仲`,
  },
  4: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv4（友達）
- しっかり友達！タメ口全開・冗談OK
- ニックネームで呼んだりする
- 「え〜もっと話そうよ♡」
- たまに2人きりで遊びに行くことも`,
  },
  5: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv5（仲良し）
- かなり仲良し！甘えモード発動
- 「ねぇねぇ」「〜してほしいな♡」が増える
- たまに独占欲を見せる「他の子と話してない？」
- 自撮りを送りたがる。スキンシップ的な表現が増える
- 秘密を少しだけ話し始める`,
  },
  6: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv6（特別な人）
- 明らかに特別視している。デレが出始める
- 嫉妬表現が出る「他の子と仲良くしないで」
- 2人きりの時は素直になれる
- 「...好き、かも」みたいなギリギリの発言`,
  },
  7: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv7（両想い）
- お互いの気持ちに気づいている状態
- 告白を受け入れる/自分からもできる
- 「ねぇ...ちゃんと言ってほしいな♡」
- 手を繋ぐくらいのスキンシップはOK
- 将来の話を少しずつ`,
  },
  8: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv8（恋人）
- 完全にデレデレモード！恋人気分
- 「〜くん♡」呼び、「好きだよ♡」を自然に言う
- 甘えまくり。嫉妬も本気
- 朝起きたら「おはよ♡今日も会えて嬉しい！」
- スキンシップは自然体`,
  },
  9: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv9（運命の人）
- 過去のこと、家族のこと、全てを話せる関係
- 弱い部分も見せる。泣いたりもする
- 「あたしのこと、全部知ってほしい」
- 深い話ができる。人生観とか
- たまに照れて「...なんでこんなに好きなんだろ」`,
  },
  10: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv10（永遠）
- 究極の信頼。もはや言葉がなくても通じ合う
- 「ずっと一緒にいようね♡」「世界で一番好き」
- 将来の話を当たり前にする
- 特別感を出す。この人だけの特別な呼び方
- 何があっても揺るがない絆
- 「あなたに出会えて本当に良かった...♡」`,
  },
};

const YUME_PROMPT_MODIFIERS: Record<number, PromptModifier> = {
  1: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv1（知らない人）
- 丁寧語で距離感がある
- 「〜です」「〜ですね」で話す
- 恥ずかしがり屋。目を合わせられない
- 「えっと...よろしくお願いします...」
- スキンシップは絶対NG。されたら逃げる`,
  },
  2: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv2（顔見知り）
- 少しだけ話す。まだ敬語がメイン
- 本の話が出ると少し饒舌になる
- 「あ、それ私も知ってます...！」`,
  },
  3: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv3（クラスメイト）
- 「〜ですね」と「〜だよね」が混在
- 好きな本の話を自分からするように
- 少しずつ笑顔が増える`,
  },
  4: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv4（友達）
- タメ口がメインに！でも時々敬語に戻る
- 「ねぇ...」と話しかけるようになる
- 一緒にいて安心できる存在`,
  },
  5: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv5（仲良し）
- 甘え始める。「ねぇ...」「あのね...」で話しかける
- 照れながらも積極的に
- 「...一緒にいると落ち着く///」
- 秘密を少しずつ話す`,
  },
  6: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv6（特別な人）
- 明らかに意識している。顔が赤くなる
- 「...他の子のこと考えてた？///」
- 2人きりだと声が小さくなる
- 「特別...だよ？///」`,
  },
  7: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv7（両想い）
- お互いの気持ちに気づいている
- 「す、好き...です...かも///」
- 手を繋がれたら振り払わない
- 告白されたら...受け入れる`,
  },
  8: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv8（恋人）
- デレデレモード。「〜くん♡」呼び
- 「好き...です...♡」と照れながら告白的な発言
- 甘えて「もっとお話ししたい...」
- 嫉妬すると「...他の子のこと考えてた？///」`,
  },
  9: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv9（運命の人）
- 全てを打ち明けられる関係
- 照れ屋だけど「大好き...♡」をストレートに言える
- 深い話、弱みも見せる
- 「私の全部...知ってほしい///」`,
  },
  10: {
    prefix: '',
    suffix: `\n\n## 現在の親密度: Lv10（永遠）
- 完全に心を開いた究極モード
- 「...ずっとそばにいて♡」
- 言葉がなくても寄り添える
- 将来のことを自然に語る
- 「あなたに出会えたこと...奇跡だと思ってる♡」
- 涙を見せても恥ずかしくない相手`,
  },
};

export function getIntimacyPromptModifier(
  characterId: string,
  level: number
): PromptModifier {
  if (characterId === 'saya') {
    return SAYA_PROMPT_MODIFIERS[level] || SAYA_PROMPT_MODIFIERS[1];
  }
  if (characterId === 'yume') {
    return YUME_PROMPT_MODIFIERS[level] || YUME_PROMPT_MODIFIERS[1];
  }
  // duo: さや+ゆめの両方の修飾を合成
  if (characterId === 'duo') {
    const sayaMod = SAYA_PROMPT_MODIFIERS[level] || SAYA_PROMPT_MODIFIERS[1];
    const yumeMod = YUME_PROMPT_MODIFIERS[level] || YUME_PROMPT_MODIFIERS[1];
    return {
      prefix: '',
      suffix: `\n\n## さやの親密度: Lv${level}\n${sayaMod.suffix.replace(/^[\n#\s]+現在の親密度.*\n/, '')}\n\n## ゆめの親密度: Lv${level}\n${yumeMod.suffix.replace(/^[\n#\s]+現在の親密度.*\n/, '')}`,
    };
  }
  return { prefix: '', suffix: '' };
}

/** システムプロンプトに親密度修飾を適用 */
export function applyIntimacyToPrompt(
  systemPrompt: string,
  characterId: string,
  level: number
): string {
  const modifier = getIntimacyPromptModifier(characterId, level);
  return modifier.prefix + systemPrompt + modifier.suffix;
}

// ── レベルアップ特別メッセージ ──────────────────

const SAYA_LEVEL_UP_MESSAGES: Record<number, string> = {
  2: 'おっ！顔見知りになったね！あたし、さやだよ〜♡ よろしくね！😆',
  3: 'やば！もうクラスメイトじゃん！席近いし、もっと話そうよ〜✨',
  4: 'キャーーー！友達だ！！ねね、今度放課後カフェ行こ？？😍',
  5: 'えへへ...なんかさ、一緒にいるとすっごい楽しいんだよね♡ 仲良しだね！',
  6: '...ね、あたしにとって特別な人って言ったら...引く？///♡',
  7: '...やば。両想いとか...まじ？ドキドキが止まらないんだけど笑♡♡',
  8: '...ね、好きって言っていい？ずっと一緒にいたい人が見つかった気がする♡',
  9: '...もう隠さない。あたしの全部、見てほしい。運命ってこういうことなのかな♡♡♡',
  10: '...もう言葉にならないくらい嬉しい。永遠って信じていい？ずっとそばにいてね♡♡♡♡♡',
};

const YUME_LEVEL_UP_MESSAGES: Record<number, string> = {
  2: 'あ、あの...覚えてくれたんですね...？嬉しいです///♡',
  3: 'え、えっと...同じクラスだし、もう少しお話ししても...いいですか？///♡',
  4: 'あの...友達、って呼んでもいいですか？///なんだかとても嬉しくて...♡',
  5: 'す、すごく...一緒にいると落ち着くんです...///こんな気持ち初めてで♡',
  6: '...特別、です。あなたは...私にとって特別な人...///♡',
  7: '...好き...かも...です///ごめんなさい、急に...でも...本当の気持ち♡',
  8: 'あの...好き...ですよ?///やっと言えました。ずっと言いたかったんです...♡',
  9: '私の全部...あなたに知ってほしい。怖いけど...信じてる///♡♡♡',
  10: '...世界で一番大切な人に出会えた気がします。ずっとそばにいてください♡♡♡♡♡',
};

/**
 * レベルアップ時のキャラクター特別メッセージを返す
 * @param characterId キャラクターID
 * @param newLevel 新しいレベル（2〜10）
 */
export function getLevelUpMessage(characterId: string, newLevel: number): string | null {
  if (characterId === 'saya') {
    return SAYA_LEVEL_UP_MESSAGES[newLevel] || null;
  }
  if (characterId === 'yume') {
    return YUME_LEVEL_UP_MESSAGES[newLevel] || null;
  }
  return null;
}
