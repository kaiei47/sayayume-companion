/**
 * クロスセッションユーザーメモリシステム
 *
 * - 会話から自動抽出してDBに永続保存
 * - 次回チャット開始時にシステムプロンプトへ注入
 * - emotional_weight 順で上位件数を優先注入
 * - fire-and-forget で呼び出してレイテンシに影響させない
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
// 抽出タスクは軽いので Flash-Lite でコスト最適化（Flash の約 50% のコスト）
const EXTRACT_MODEL = 'gemini-2.0-flash-lite';
const EXTRACT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EXTRACT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 1会話で注入する記憶の最大件数（トークン節約）
const MAX_INJECT_MEMORIES = 6;

// episodeカテゴリの最大保持件数（古い悩みをローテーション）
const MAX_EPISODE_COUNT = 10;

export interface UserMemory {
  id: string;
  character_id: string;
  category: 'profile' | 'preference' | 'episode' | 'relationship';
  key: string;
  value: string;
  emotional_weight: number;
  needs_followup: boolean;
  follow_up_date: string | null;
  last_referenced_at: string | null;
  updated_at: string;
}

interface ExtractedMemory {
  category: 'profile' | 'preference' | 'episode' | 'relationship';
  key: string;
  value: string;
  confidence: number;
  emotional_weight: number;
  needs_followup: boolean;
}

interface MessageForExtract {
  role: string;
  content: string;
}

/**
 * 会話メッセージからユーザー情報を抽出する（Gemini Flash-Lite）
 */
export async function extractMemoriesFromMessages(
  messages: MessageForExtract[],
  characterName: string
): Promise<ExtractedMemory[]> {
  if (messages.length < 2) return [];

  const conversationText = messages
    .slice(-20) // 直近20件のみ対象
    .map(m => `${m.role === 'user' ? 'ユーザー' : characterName}: ${m.content}`)
    .join('\n');

  const prompt = `会話を分析して、ユーザーに関する事実情報をJSONで返してください。

【会話】
${conversationText}

【カテゴリ定義】
- profile: 名前・誕生日・職業・出身地・家族構成
- preference: 趣味・好きな食べ物・好きなコンテンツ・嫌いなもの
- episode: 最近の出来事・悩み・嬉しかったこと・感情的なエピソード
- relationship: 2人の間の約束・特別な呼び方・共有の思い出

【emotional_weight 基準】
- 10: 深い悩み・感情的な告白（「辛い」「泣いた」等）
- 8: 仕事の問題・体調不良・重要なイベントの結果
- 6: 趣味・好きなもの
- 3: 基本属性（職業・出身等）

【出力形式（JSON配列のみ・他の文字列は含めない）】
[
  {
    "category": "profile",
    "key": "job",
    "value": "システムエンジニア（100文字以内）",
    "confidence": 5,
    "emotional_weight": 3,
    "needs_followup": false
  }
]

【ルール】
- ユーザーが明言した事実のみ。推測・曖昧情報はスキップ
- episodeのkeyは "recent_worry_${Date.now()}" のようにタイムスタンプを付与（追記扱い）
- 感情的な発話（辛い・嬉しい・悩んでる・怒った）はemotional_weight=8以上
- needs_followup=trueは「まだ解決していない悩み・未確認の出来事」のみ
- 抽出できる情報がない場合は空配列 []
- JSON以外の文字列は絶対に含めない`;

  try {
    const res = await fetch(EXTRACT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
      }),
    });

    if (!res.ok) {
      console.error('[Memory] Extract API error:', res.status);
      return [];
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    // JSONブロックの抽出（```json ... ``` 形式にも対応）
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const extracted: ExtractedMemory[] = JSON.parse(jsonMatch[0]);
    return Array.isArray(extracted) ? extracted : [];
  } catch (err) {
    console.error('[Memory] Extraction failed:', err);
    return [];
  }
}

/**
 * 抽出した記憶をDBに保存（upsert）
 * - profile/preference/relationship: 同keyは上書き
 * - episode: keyにタイムスタンプが含まれるため追記。MAX_EPISODE_COUNT超えたら古いものを削除
 */
export async function saveMemoriesToDB(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  memories: ExtractedMemory[],
  conversationId?: string
): Promise<void> {
  if (!memories.length) return;

  // global（全キャラ共通）として保存する対象
  // profile/preference は global に、episode/relationship はキャラ固有に保存
  const toUpsert = memories.map(m => ({
    user_id: userId,
    character_id: m.category === 'episode' || m.category === 'relationship'
      ? characterId
      : 'global',
    category: m.category,
    key: m.key,
    value: m.value,
    emotional_weight: m.emotional_weight,
    needs_followup: m.needs_followup,
    follow_up_date: m.needs_followup
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3日後
      : null,
    confidence: m.confidence,
    source_conversation_id: conversationId || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('user_memories')
    .upsert(toUpsert, { onConflict: 'user_id,character_id,key', ignoreDuplicates: false });

  if (error) {
    console.error('[Memory] Save failed:', error.message);
    return;
  }

  // episodeのローテーション: MAX_EPISODE_COUNT件を超えたら古いものを削除
  const episodeCount = toUpsert.filter(m => m.category === 'episode').length;
  if (episodeCount > 0) {
    const { data: allEpisodes } = await supabase
      .from('user_memories')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('category', 'episode')
      .order('updated_at', { ascending: true });

    if (allEpisodes && allEpisodes.length > MAX_EPISODE_COUNT) {
      const toDelete = allEpisodes
        .slice(0, allEpisodes.length - MAX_EPISODE_COUNT)
        .map(m => m.id);

      await supabase.from('user_memories').delete().in('id', toDelete);
    }
  }
}

/**
 * ユーザーの記憶を取得（global + キャラ固有の両方）
 * - free: 取得しない（同一セッションのみ）
 * - basic: 30日以内のみ
 * - premium/vip: 無期限
 */
export async function getUserMemories(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  plan: 'free' | 'basic' | 'premium' | 'vip' = 'free'
): Promise<UserMemory[]> {
  // Freeプランはクロスセッション記憶なし
  if (plan === 'free') return [];

  let query = supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .in('character_id', ['global', characterId])
    .gte('confidence', 2)
    .order('emotional_weight', { ascending: false })
    .limit(30);

  // Basicは30日以内のみ
  if (plan === 'basic') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('updated_at', thirtyDaysAgo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Memory] Fetch failed:', error.message);
    return [];
  }

  return (data as UserMemory[]) || [];
}

/**
 * 記憶をシステムプロンプト用テキストに変換
 * - emotional_weight 上位 MAX_INJECT_MEMORIES 件に絞る
 * - needs_followup=true のものを優先
 * - 直近24時間以内に引用済みのものはスキップ（連続引用防止）
 */
export function buildMemoryContext(memories: UserMemory[]): string {
  if (!memories.length) return '';

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // フィルタリング: 24時間以内に引用済みは除外
  const eligible = memories.filter(m => {
    if (!m.last_referenced_at) return true;
    return new Date(m.last_referenced_at).getTime() < oneDayAgo;
  });

  // needs_followup を優先、次に emotional_weight 順
  const sorted = [...eligible].sort((a, b) => {
    if (a.needs_followup && !b.needs_followup) return -1;
    if (!a.needs_followup && b.needs_followup) return 1;
    return b.emotional_weight - a.emotional_weight;
  });

  const top = sorted.slice(0, MAX_INJECT_MEMORIES);
  if (!top.length) return '';

  const lines = top.map(m => {
    const followupHint = m.needs_followup ? '（→次回の会話で必ず確認すること）' : '';
    return `- ${m.value}${followupHint}`;
  });

  return `

## ユーザーについて覚えていること（自然に活かす・一覧を読んでる感を出さない）
${lines.join('\n')}

【引用ルール】
- 1会話で最大2件まで引用する
- 「〜って言ってたよね」「覚えてるよ笑」「ずっと気になってた」「心配してた」を使う
- 「フォローアップ必須」の項目は会話の自然な流れで1回確認する
- 新しい情報が出たら「それ初めて聞いた！」と反応して深掘りする`;
}

/**
 * fire-and-forget で会話から記憶を抽出してDBに保存するメインエントリポイント
 * chat/route.ts から呼び出す（awaitしない）
 * - free: 保存しない（同一セッションのみ）
 * - basic/premium/vip: 保存する
 */
export async function extractAndSaveMemories(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  messages: MessageForExtract[],
  characterName: string,
  conversationId?: string,
  plan: 'free' | 'basic' | 'premium' | 'vip' = 'free'
): Promise<void> {
  // Freeプランはクロスセッション記憶を保存しない
  if (plan === 'free') return;

  try {
    const extracted = await extractMemoriesFromMessages(messages, characterName);
    if (extracted.length > 0) {
      await saveMemoriesToDB(supabase, userId, characterId, extracted, conversationId);
      console.log(`[Memory] Extracted ${extracted.length} memories for user ${userId} (plan: ${plan})`);
    }
  } catch (err) {
    console.error('[Memory] extractAndSaveMemories failed:', err);
  }
}

/**
 * ストーリー完了時にepisodeをパーソナルメモリに保存
 * AIに体験を要約させて自然な思い出として記録する
 */
export async function saveStoryMemory(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  storyTitle: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<void> {
  try {
    // AIに体験を要約させる
    const recentHistory = conversationHistory.slice(-20).map(
      m => `${m.role === 'user' ? 'ユーザー' : 'キャラクター'}: ${m.content}`
    ).join('\n');

    const res = await fetch(EXTRACT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `以下のストーリーモードの会話ログから、2人の思い出を30文字以内で簡潔に要約してください。
キャラクターが後で「あの時の〜」と言及できるような形で。

ストーリー名: ${storyTitle}

会話ログ:
${recentHistory}

回答形式（要約のみ。説明不要）:`,
          }],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
      }),
    });

    let summary = `${storyTitle}をクリアした`;
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) summary = text;
    }

    // episodeとしてDBに保存
    await saveMemoriesToDB(supabase, userId, characterId, [{
      category: 'episode',
      key: `story_${Date.now()}`,
      value: summary,
      confidence: 10,
      emotional_weight: 8,
      needs_followup: true, // 次回チャットで「あの時の〜」と言及させる
    }]);

    console.log(`[Memory] Story memory saved: "${summary}" for user ${userId}`);
  } catch (err) {
    console.error('[Memory] saveStoryMemory failed:', err);
  }
}
