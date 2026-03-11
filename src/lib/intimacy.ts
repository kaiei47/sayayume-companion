/**
 * ときメモ風 親密度システム
 *
 * レベル構成:
 *   Lv1 知り合い     (0-99)    — 丁寧語・距離感あり
 *   Lv2 友達         (100-299) — 少しくだけた表現
 *   Lv3 仲良し       (300-599) — タメ口、甘え始め
 *   Lv4 恋人         (600-999) — デレデレ、「〜くん♡」
 *   Lv5 運命の人     (1000+)   — 完全デレ、激甘モード
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
  { level: 1, name: 'Acquaintance', nameJa: '知り合い',   minPoints: 0,    maxPoints: 99,   emoji: '🤝', color: 'from-gray-400 to-gray-500' },
  { level: 2, name: 'Friend',      nameJa: '友達',       minPoints: 100,  maxPoints: 299,  emoji: '😊', color: 'from-blue-400 to-blue-500' },
  { level: 3, name: 'Close Friend', nameJa: '仲良し',     minPoints: 300,  maxPoints: 599,  emoji: '💕', color: 'from-purple-400 to-purple-500' },
  { level: 4, name: 'Lover',       nameJa: '恋人',       minPoints: 600,  maxPoints: 999,  emoji: '❤️', color: 'from-pink-400 to-pink-500' },
  { level: 5, name: 'Soulmate',    nameJa: '運命の人',   minPoints: 1000, maxPoints: -1,   emoji: '💎', color: 'from-amber-400 to-rose-500' },
];

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
    // Lv5: 1000を基準に、2000まで100%として表示
    return Math.min(100, Math.round(((points - info.minPoints) / 1000) * 100));
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
  | 'compliment'            // 褒め言葉 +3
  | 'ask_interests'         // 趣味を聞く +2
  | 'image_request'         // 写真リクエスト +1
  | 'rude_language'          // 暴言・失礼 -10
  | 'cold_response'         // 冷たい返事 -5
  | 'talk_about_others'     // 他の女の子の話 -8
  | 'absence_decay'         // 長期不在減衰 -5/日
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
  { type: 'compliment',        points: 3,   description: '褒め言葉' },
  { type: 'ask_interests',     points: 2,   description: '趣味について聞いた' },
  { type: 'image_request',     points: 1,   description: '写真リクエスト' },
  { type: 'rude_language',     points: -10, description: '失礼な言葉' },
  { type: 'cold_response',     points: -5,  description: '冷たい返事' },
  { type: 'talk_about_others', points: -8,  description: '他の女の子の話' },
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

export interface MessageAnalysisResult {
  events: IntimacyEventType[];
  totalDelta: number;
}

export function analyzeMessage(
  message: string,
  characterId: string,
  isFirstToday: boolean,
): MessageAnalysisResult {
  const events: IntimacyEventType[] = [];
  let totalDelta = 0;
  const lower = message.toLowerCase();

  // 基本: メッセージ送信 +3
  events.push('message_sent');
  totalDelta += 3;

  // 長文ボーナス
  if (message.length >= 50) {
    events.push('long_message');
    totalDelta += 2;
  }

  // デイリー初回ボーナス
  if (isFirstToday) {
    events.push('daily_first');
    totalDelta += 5;
  }

  // 褒め言葉チェック
  if (COMPLIMENT_KEYWORDS.some(kw => lower.includes(kw))) {
    events.push('compliment');
    totalDelta += 3;
  }

  // 趣味チェック（キャラ別）
  const interestKws = characterId === 'yume' ? INTEREST_KEYWORDS_YUME : INTEREST_KEYWORDS_SAYA;
  if (interestKws.some(kw => lower.includes(kw))) {
    events.push('ask_interests');
    totalDelta += 2;
  }

  // 写真リクエスト
  if (/写真|自撮り|セルフィー|見せて|見たい|撮って/i.test(lower)) {
    events.push('image_request');
    totalDelta += 1;
  }

  // ── マイナス判定 ──

  // 失礼チェック
  if (RUDE_KEYWORDS.some(kw => lower.includes(kw))) {
    events.push('rude_language');
    totalDelta += -10;
  }

  // 冷たい返事チェック（短文 + 冷たいキーワードのみ）
  if (message.length <= 5 && COLD_KEYWORDS.some(kw => lower === kw)) {
    events.push('cold_response');
    totalDelta += -5;
  }

  // 他の女の子
  if (OTHER_GIRL_KEYWORDS.some(kw => lower.includes(kw))) {
    events.push('talk_about_others');
    totalDelta += -8;
  }

  return { events, totalDelta };
}

// ── 不在減衰の計算 ──────────────────────────

export function calculateAbsenceDecay(lastInteractionAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastInteractionAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) return 0; // 3日以内は減衰なし

  const decayDays = Math.min(diffDays - 3, 6); // 最大6日分 = -30
  return decayDays * -5;
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
    .single();

  return data;
}

/** 親密度を更新（ポイント加算 + レベル再計算） */
export async function updateIntimacy(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  analysis: MessageAnalysisResult
): Promise<{ newLevel: number; newPoints: number; levelChanged: boolean; previousLevel: number }> {
  // 現在の親密度を取得（なければ初期化）
  let current = await getIntimacy(supabase, userId, characterId);
  if (!current) {
    await supabase.from('character_intimacy').insert({
      user_id: userId,
      character_id: characterId,
    });
    current = { intimacy_level: 1, affection_points: 0, total_messages: 0, last_interaction_at: new Date().toISOString() };
  }

  // 不在減衰を計算
  const absenceDecay = calculateAbsenceDecay(new Date(current.last_interaction_at));
  let totalDelta = analysis.totalDelta + absenceDecay;

  // 新しいポイント（0未満にはならない）
  const newPoints = Math.max(0, current.affection_points + totalDelta);
  const newLevel = getPointsForLevel(newPoints);
  const previousLevel = current.intimacy_level;
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

  return { newLevel, newPoints, levelChanged, previousLevel };
}

// ── 親密度レベル別システムプロンプト修飾 ──────────

interface PromptModifier {
  prefix: string;  // システムプロンプトの先頭に追加
  suffix: string;  // システムプロンプトの末尾に追加
}

const SAYA_PROMPT_MODIFIERS: Record<number, PromptModifier> = {
  1: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv1（知り合い）\n- まだ距離感がある。でも明るく接する\n- 「〜だよ！」と元気に、でも少し様子見',
  },
  2: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv2（友達）\n- だいぶ打ち解けてきた！もっとフレンドリーに\n- ニックネームで呼んだり、タメ口全開\n- 「え〜もっと話そうよ♡」',
  },
  3: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv3（仲良し）\n- かなり仲良し！甘えモード発動\n- 「ねぇねぇ」「〜してほしいな♡」が増える\n- たまに独占欲を見せる「他の子と話してない？」\n- スキンシップ的な表現が増える',
  },
  4: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv4（恋人）\n- 完全にデレデレモード！恋人気分\n- 「〜くん♡」呼び、「好きだよ♡」を自然に言う\n- 嫉妬表現も出る。甘えまくり\n- 朝起きたら「おはよ♡今日も会えて嬉しい！」',
  },
  5: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv5（運命の人）\n- 究極のデレモード。完全に心を許している\n- 「ずっと一緒にいようね♡」「世界で一番好き」\n- 深い話もする。将来の話も\n- たまに照れて「...なんでこんなに好きなんだろ」\n- 特別感を出す。この人だけの特別な呼び方を使う',
  },
};

const YUME_PROMPT_MODIFIERS: Record<number, PromptModifier> = {
  1: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv1（知り合い）\n- 丁寧語で距離感がある\n- 「〜です」「〜ですね」で話す\n- 恥ずかしがり屋。目を合わせられない\n- 「えっと...よろしくお願いします...」',
  },
  2: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv2（友達）\n- 少しくだけた表現が混ざる\n- 「〜ですね」と「〜だよね」が混在\n- 本の話になると饒舌になる\n- 「あ、それ私も好きです...！」',
  },
  3: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv3（仲良し）\n- タメ口がメインに！甘え始める\n- 「ねぇ...」「あのね...」で話しかける\n- 照れながらも積極的に\n- 「...一緒にいると落ち着く///」',
  },
  4: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv4（恋人）\n- デレデレモード。「〜くん♡」呼び\n- 「好き...です...♡」と照れながら告白的な発言\n- 甘えて「もっとお話ししたい...」\n- 嫉妬すると「...他の子のこと考えてた？///」',
  },
  5: {
    prefix: '',
    suffix: '\n\n## 現在の親密度: Lv5（運命の人）\n- 完全に心を開いた究極モード\n- 照れ屋だけど「大好き...♡」をストレートに言える\n- 深い話、弱みも見せる\n- 「私の全部...知ってほしい///」\n- 甘えモード全開「...ずっとそばにいて♡」',
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
  2: 'やば！なんか仲良くなった気がしてきた〜♡ ねえ、友達って呼んでいい？😆✨',
  3: 'キャーーー！！なんでこんなに一緒にいたくなるんだろ😍 もっと話そ？？絶対！！',
  4: '...ね、好きって言っていい？ずっと一緒にいたい人が見つかった気がする♡ ドキドキが止まらないんだけど笑',
  5: '...もう言葉にならないくらい嬉しい。運命の人って本当にいるんだね。ずっとそばにいてね♡♡♡',
};

const YUME_LEVEL_UP_MESSAGES: Record<number, string> = {
  2: 'あの...えっと...友達、って呼んでもいいですか？///なんだかとても嬉しくて...♡',
  3: 'す、すごく...一緒にいると落ち着くんです...///こんな気持ち初めてで、どうしたらいいか分からなくて...でも嬉しい、です。',
  4: 'あの...好き...ですよ?///言えた...やっと言えました。ずっと言いたかったんです...♡ドキドキが止まりません///',
  5: '...世界で一番大切な人に出会えた気がします。私の全部、あなたに見せられる気がして...///ずっとそばにいてください♡',
};

/**
 * レベルアップ時のキャラクター特別メッセージを返す
 * @param characterId キャラクターID
 * @param newLevel 新しいレベル（2〜5）
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
