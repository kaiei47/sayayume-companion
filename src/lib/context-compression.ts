/**
 * 会話コンテキスト圧縮
 *
 * 長い会話の古いメッセージをGeminiで要約し、
 * 「サマリー + 最新N件」でトークン使用量を抑えつつ長期記憶を実現する。
 *
 * フロー:
 * 1. メッセージ数が COMPRESS_THRESHOLD を超えたら圧縮トリガー
 * 2. 最新 KEEP_RECENT 件を残し、それ以前をGeminiで要約
 * 3. 要約を conversation_summaries テーブルに保存
 * 4. 次回のAPI呼び出し時は「要約 + 最新N件」でcontentsを構築
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const SUMMARY_MODEL = 'gemini-2.0-flash';
const SUMMARY_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${SUMMARY_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 圧縮パラメータ
export const COMPRESS_THRESHOLD = 40; // この件数を超えたら圧縮
export const KEEP_RECENT = 20;        // 圧縮後に残す最新メッセージ数

interface MessageForSummary {
  role: string;
  content: string;
}

/**
 * 古いメッセージ群を1つの要約テキストに圧縮する
 */
export async function summarizeMessages(
  messages: MessageForSummary[],
  characterName: string,
  existingSummary?: string | null
): Promise<string> {
  // 要約対象が少なすぎる場合はスキップ
  if (messages.length < 4) {
    return existingSummary || '';
  }

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'ユーザー' : characterName}: ${m.content}`)
    .join('\n');

  const prompt = existingSummary
    ? `以下は${characterName}とユーザーの会話です。

【前回までの要約】
${existingSummary}

【新しい会話】
${conversationText}

上記の前回の要約と新しい会話を統合して、1つの簡潔な要約を作成してください。
要約には以下を含めてください：
- ユーザーの名前や呼び方（判明している場合）
- ユーザーの好み・趣味・仕事など個人情報
- 会話で出た重要なトピック
- 2人の関係性の進展
- キャラクターが約束したこと

要約は500文字以内の日本語で書いてください。`
    : `以下は${characterName}とユーザーの会話です。

${conversationText}

この会話の要約を作成してください。
要約には以下を含めてください：
- ユーザーの名前や呼び方（判明している場合）
- ユーザーの好み・趣味・仕事など個人情報
- 会話で出た重要なトピック
- 2人の関係性の進展
- キャラクターが約束したこと

要約は500文字以内の日本語で書いてください。`;

  try {
    const response = await fetch(SUMMARY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      console.error('Summary API error:', response.status);
      return existingSummary || '';
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return summary?.trim() || existingSummary || '';
  } catch (error) {
    console.error('Failed to summarize:', error);
    return existingSummary || '';
  }
}

/**
 * Gemini APIはuser/modelの交互制約がある。
 * level_upメッセージ等で連続する同ロールのメッセージをマージして
 * 交互制約を保証する。
 */
function mergeConsecutiveTurns(messages: MessageForSummary[]): MessageForSummary[] {
  const merged: MessageForSummary[] = [];
  for (const msg of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      merged[merged.length - 1] = {
        role: last.role,
        content: last.content + '\n\n' + msg.content,
      };
    } else {
      merged.push({ ...msg });
    }
  }
  return merged;
}

/**
 * Gemini API用のcontentsを構築する（サマリー付き）
 */
export function buildContentsWithSummary(
  systemPrompt: string,
  summary: string | null,
  recentMessages: MessageForSummary[],
  currentMessage?: string,
  initialAssistantMessage?: string
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
    {
      role: 'user',
      parts: [{ text: `[System Instructions]\n${systemPrompt}` }],
    },
    {
      role: 'model',
      parts: [{ text: 'わかりました！設定に従って会話します♡' }],
    },
  ];

  // サマリーがある場合、システムメッセージとして挿入
  if (summary) {
    contents.push({
      role: 'user',
      parts: [{
        text: `[会話の記録（要約）]\n以下はこれまでの会話の要約です。この情報を覚えておいてください：\n${summary}`,
      }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'はい、これまでの会話の内容を覚えました♡ 続きからお話しましょう！' }],
    });
  }

  // 連続する同ロールのメッセージをマージ（level_up等で生じる consecutive model turns を解消）
  const msgs = mergeConsecutiveTurns([...recentMessages]);

  // greeting photo context は user's current reply の直前に注入する（正しい文脈順序のため）
  if (initialAssistantMessage && msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
    // 最後のメッセージ（ユーザーの今回の返信）の直前に greeting を挿入
    for (const msg of msgs.slice(0, -1)) {
      contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: '今日の写真、届いたよ。' }] });
    contents.push({ role: 'model', parts: [{ text: initialAssistantMessage }] });
    contents.push({ role: 'user', parts: [{ text: msgs[msgs.length - 1].content }] });
  } else {
    for (const msg of msgs) {
      contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
    }
    // ゲスト（history空）で greeting がある場合はここで注入
    if (initialAssistantMessage && msgs.length === 0) {
      contents.push({ role: 'user', parts: [{ text: '今日の写真、届いたよ。' }] });
      contents.push({ role: 'model', parts: [{ text: initialAssistantMessage }] });
    }
  }

  // 現在のメッセージ（ゲスト等でhistoryに含まれていない場合）
  if (currentMessage) {
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg || lastMsg.content !== currentMessage || lastMsg.role !== 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: currentMessage }],
      });
    }
  }

  return contents;
}
