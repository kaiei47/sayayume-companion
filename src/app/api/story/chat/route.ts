import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getCharacter, CHARACTERS } from '@/lib/characters';
import { getStory, buildStorySystemPrompt } from '@/lib/stories';
import { applyIntimacyToPrompt, getIntimacy, updateIntimacy, analyzeMessage, getLevelInfo, getLevelProgress } from '@/lib/intimacy';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { saveStoryMemory } from '@/lib/user-memory';
import { extractImageTags, buildImagePrompt, generateImage } from '@/lib/gemini-image';
import { isNSFWDescription } from '@/lib/runware-image';
import { generateImageReplicate } from '@/lib/replicate-image';
import { uploadChatImage } from '@/lib/supabase/storage';

const PLAN_LIMITS = {
  guest:   { imageGeneration: true, dailyImages: 3  },
  free:    { imageGeneration: true, dailyImages: 3  },
  basic:   { imageGeneration: true, dailyImages: 30 },
  premium: { imageGeneration: true, dailyImages: -1 },
  vip:     { imageGeneration: true, dailyImages: -1 },
} as const;

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

// ミッション判定用（非ストリーミング）
const GEMINI_JUDGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface StoryChatRequest {
  session_id: string;
  message: string;
}

/**
 * POST /api/story/chat - ストーリーモード用チャット（SSE + ミッション判定）
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateLimitResult = rateLimit(`story:${clientIp}`, 20, 60_000);
    if (!rateLimitResult.success) {
      return new Response(JSON.stringify({ error: 'rate_limit' }), { status: 429 });
    }

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const adminDb = getSupabaseAdmin();

    const { data: dbUser } = await adminDb
      .from('users')
      .select('id, display_name')
      .eq('auth_id', user.id)
      .single();
    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'user_not_found' }), { status: 404 });
    }

    // ユーザープラン取得
    let userPlan: keyof typeof PLAN_LIMITS = 'free';
    try {
      const { data: sub } = await adminDb
        .from('subscriptions')
        .select('plan')
        .eq('user_id', dbUser.id)
        .eq('status', 'active')
        .single();
      if (sub?.plan) userPlan = sub.plan as keyof typeof PLAN_LIMITS;
    } catch { /* フォールバック: free */ }

    let body: StoryChatRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
    }

    const { session_id, message } = body;

    // セッション取得
    const { data: session } = await adminDb
      .from('story_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', dbUser.id)
      .single();

    if (!session || session.status !== 'in_progress') {
      return new Response(JSON.stringify({ error: 'session_not_found' }), { status: 404 });
    }

    const story = getStory(session.story_id);
    if (!story) {
      return new Response(JSON.stringify({ error: 'story_not_found' }), { status: 404 });
    }

    const character = getCharacter(story.character);
    if (!character) {
      return new Response(JSON.stringify({ error: 'character_not_found' }), { status: 404 });
    }

    // 親密度取得
    const targetCharId = story.character === 'duo' ? 'saya' : story.character;
    const intimacyData = await getIntimacy(adminDb, dbUser.id, targetCharId);
    const intimacyLevel = intimacyData?.intimacy_level || 1;

    // 会話履歴を取得
    const conversationHistory = (session.conversation_history || []) as Array<{ role: string; content: string }>;

    // ストーリー用システムプロンプト構築
    const completedMissions = (session.completed_missions || []) as string[];
    const userName = dbUser.display_name || 'ゲストさん';

    const storyPrompt = buildStorySystemPrompt(
      character.systemPrompt,
      story,
      intimacyLevel,
      userName,
      completedMissions,
    );

    const intimacyPrompt = applyIntimacyToPrompt(storyPrompt, story.character, intimacyLevel);

    // Gemini API用contents構築
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // システムプロンプト + 履歴
    if (conversationHistory.length === 0) {
      // 最初のメッセージ: システムプロンプト→ユーザーメッセージ
      contents.push(
        { role: 'user', parts: [{ text: intimacyPrompt + '\n\n---\n\n' + message }] },
      );
    } else {
      // 履歴あり
      contents.push(
        { role: 'user', parts: [{ text: intimacyPrompt + '\n\n---\n\n' + conversationHistory[0].content }] },
      );
      for (let i = 1; i < conversationHistory.length; i++) {
        const msg = conversationHistory[i];
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
      contents.push({ role: 'user', parts: [{ text: message }] });
    }

    // SSEストリーミング
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // メタデータ送信
          controller.enqueue(
            encoder.encode(`event: metadata\ndata: ${JSON.stringify({
              session_id,
              story_id: story.id,
              character_id: story.character,
              completedMissions,
            })}\n\n`)
          );

          // Gemini API呼び出し
          const geminiRes = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 1024,
                topP: 0.95,
              },
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              ],
            }),
          });

          if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error('Gemini API error:', errText);
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'ai_error' })}\n\n`));
            controller.close();
            return;
          }

          // SSE パース
          let fullResponse = '';
          const reader = geminiRes.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    fullResponse += text;
                    controller.enqueue(
                      encoder.encode(`event: token\ndata: ${JSON.stringify({ text })}\n\n`)
                    );
                  }
                } catch {
                  // JSON parse error, skip
                }
              }
            }
          }

          // [IMAGE:] タグを処理して画像生成
          const { cleanText, imageDescriptions } = extractImageTags(fullResponse);
          let savedContent = fullResponse;

          if (imageDescriptions.length > 0) {
            const planLimits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;

            // 当日の画像枚数チェック
            let dailyImageCount = 0;
            if (planLimits.dailyImages > 0) {
              const todayJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
              todayJST.setUTCHours(0, 0, 0, 0);
              const todayStartUTC = new Date(todayJST.getTime() - 9 * 60 * 60 * 1000).toISOString();
              const convIds = (await adminDb.from('conversations').select('id').eq('user_id', dbUser.id)).data?.map(c => c.id) || [];
              if (convIds.length > 0) {
                const { count } = await adminDb
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('role', 'assistant')
                  .eq('content_type', 'image')
                  .gte('created_at', todayStartUTC)
                  .in('conversation_id', convIds);
                dailyImageCount = count || 0;
              }
            }

            const canGenerate = planLimits.dailyImages === -1 || dailyImageCount < planLimits.dailyImages;

            if (canGenerate) {
              savedContent = cleanText;
              controller.enqueue(encoder.encode(`event: clean_text\ndata: ${JSON.stringify({ content: cleanText })}\n\n`));
              controller.enqueue(encoder.encode(`event: generating_image\ndata: ${JSON.stringify({ status: 'started' })}\n\n`));

              const imgDescription = imageDescriptions[0];
              const charConfig = CHARACTERS[story.character === 'duo' ? 'saya' : story.character];
              const useReplicate = (story.character === 'saya' || story.character === 'yume') && isNSFWDescription(imgDescription);

              let result;
              if (useReplicate) {
                result = await generateImageReplicate(imgDescription, story.character === 'duo' ? 'saya' : story.character);
                if (!result) {
                  const imgPrompt = buildImagePrompt(charConfig.imagePromptBase, imgDescription, !!charConfig.referenceImagePath);
                  result = await generateImage(imgPrompt, charConfig.referenceImagePath);
                }
              } else {
                const imgPrompt = buildImagePrompt(charConfig.imagePromptBase, imgDescription, !!charConfig.referenceImagePath);
                result = await generateImage(imgPrompt, charConfig.referenceImagePath);
              }

              if (result) {
                try {
                  const publicUrl = await uploadChatImage(adminDb, result.base64, result.mimeType, `story-${session_id}`);
                  if (publicUrl) {
                    controller.enqueue(encoder.encode(`event: image\ndata: ${JSON.stringify({ image_url: publicUrl })}\n\n`));
                  }
                } catch { /* upload失敗は無視 */ }
              }
            }
          }

          // 会話履歴を更新
          const newHistory = [
            ...conversationHistory,
            { role: 'user', content: message },
            { role: 'model', content: savedContent },
          ];

          // 親密度更新（メッセージ分析）
          const analysis = analyzeMessage(message, targetCharId, false);
          const intimacyResult = await updateIntimacy(adminDb, dbUser.id, targetCharId, analysis);

          // ミッション判定（未達成ミッションのみ）
          const uncompletedMissions = story.missions.filter(m => !completedMissions.includes(m.id));
          const newlyCompleted: string[] = [];

          if (uncompletedMissions.length > 0 && newHistory.length >= 2) {
            // 直近の会話（最大10往復）をミッション判定に使う
            const recentHistory = newHistory.slice(-20).map(
              (m: { role: string; content: string }) => `${m.role === 'user' ? 'ユーザー' : 'キャラクター'}: ${m.content}`
            ).join('\n');

            // 全未達成ミッションを一括判定（API呼び出し1回で済む）
            const judgePrompt = uncompletedMissions.map((m, i) =>
              `ミッション${i + 1}: 「${m.description}」\n判定基準: ${m.detectPrompt}`
            ).join('\n\n');

            try {
              const judgeRes = await fetch(GEMINI_JUDGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    role: 'user',
                    parts: [{
                      text: `以下の会話ログを読み、各ミッションが達成されたか判定してください。

【会話ログ】
${recentHistory}

【ミッション判定】
${judgePrompt}

回答形式（各ミッションについて1行ずつ、YES or NO のみ）:
ミッション1: YES/NO
ミッション2: YES/NO
...`,
                    }],
                  }],
                  generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
                }),
              });

              if (judgeRes.ok) {
                const judgeData = await judgeRes.json();
                const judgeText = judgeData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const judgeLines = judgeText.split('\n').filter((l: string) => l.includes('YES') || l.includes('NO'));

                for (let i = 0; i < Math.min(judgeLines.length, uncompletedMissions.length); i++) {
                  if (judgeLines[i].includes('YES')) {
                    newlyCompleted.push(uncompletedMissions[i].id);
                  }
                }
              }
            } catch (judgeErr) {
              console.error('Mission judge error:', judgeErr);
              // ミッション判定の失敗はチャットをブロックしない
            }
          }

          // 新たに達成されたミッションを記録
          const allCompleted = [...completedMissions, ...newlyCompleted];
          const allMissionsCleared = allCompleted.length === story.missions.length;

          // ミッション達成の親密度加算
          let missionIntimacyBonus = 0;
          for (const missionId of newlyCompleted) {
            const mission = story.missions.find(m => m.id === missionId);
            if (mission) {
              missionIntimacyBonus += mission.reward.intimacy;
            }
          }

          // ストーリー完了ボーナス + メモリ保存
          if (allMissionsCleared && session.status === 'in_progress') {
            missionIntimacyBonus += story.completionReward.intimacy;

            // fire-and-forget: ストーリー体験をパーソナルメモリに保存
            saveStoryMemory(
              adminDb,
              dbUser.id,
              targetCharId,
              story.title,
              newHistory,
            ).catch(err => console.error('Story memory save failed:', err));
          }

          // セッション更新（intimacyゲートチェックより先にstatusをcompletedにする必要がある）
          await adminDb
            .from('story_sessions')
            .update({
              completed_missions: allCompleted,
              conversation_history: newHistory,
              status: allMissionsCleared ? 'completed' : 'in_progress',
              updated_at: new Date().toISOString(),
            })
            .eq('id', session_id);

          // ミッションボーナスを適用（セッション更新後にゲートチェックが正しく動く）
          if (missionIntimacyBonus > 0) {
            const storyEventType = allMissionsCleared ? 'story_complete' as const : 'mission_complete' as const;
            const storyEventLabel = allMissionsCleared ? 'ストーリークリア！' : 'ミッション達成！';
            await updateIntimacy(adminDb, dbUser.id, targetCharId, {
              events: [storyEventType],
              detailedEvents: [{ type: storyEventType, points: missionIntimacyBonus, label: storyEventLabel }],
              totalDelta: missionIntimacyBonus,
            });
          }

          // ミッション達成情報を送信
          if (newlyCompleted.length > 0) {
            controller.enqueue(
              encoder.encode(`event: mission_complete\ndata: ${JSON.stringify({
                completed: newlyCompleted,
                allCompleted,
                allMissionsCleared,
                storyTitle: allMissionsCleared ? story.completionReward.title : null,
                intimacyBonus: missionIntimacyBonus,
              })}\n\n`)
            );
          }

          // 親密度情報送信
          const levelInfo = getLevelInfo(intimacyResult.newLevel);
          const progress = getLevelProgress(intimacyResult.newPoints, intimacyResult.newLevel);
          controller.enqueue(
            encoder.encode(`event: intimacy\ndata: ${JSON.stringify({
              level: intimacyResult.newLevel,
              points: intimacyResult.newPoints,
              progress,
              levelInfo,
              levelChanged: intimacyResult.levelChanged,
            })}\n\n`)
          );

          // 完了イベント
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
          controller.close();

        } catch (streamErr) {
          console.error('Story chat stream error:', streamErr);
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: String(streamErr) })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Story chat error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
}
