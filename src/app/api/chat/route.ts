import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCharacter } from '@/lib/characters';
import { CharacterId } from '@/types/database';
import { extractImageTags, buildImagePrompt, generateImage } from '@/lib/gemini-image';
import { uploadChatImage } from '@/lib/supabase/storage';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import {
  summarizeMessages,
  buildContentsWithSummary,
  COMPRESS_THRESHOLD,
  KEEP_RECENT,
} from '@/lib/context-compression';

// 画像生成を含むため60秒に延長
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

// プラン別の制限
const PLAN_LIMITS = {
  free: { dailyMessages: 5, imageGeneration: false },
  basic: { dailyMessages: -1, imageGeneration: true },
  premium: { dailyMessages: -1, imageGeneration: true },
  vip: { dailyMessages: -1, imageGeneration: true },
} as const;

interface ChatRequest {
  conversation_id: string | null;
  character_id: CharacterId;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    // IPベースのレート制限: 1分あたり30リクエスト
    const clientIp = getClientIp(req);
    const rateLimitResult = rateLimit(`chat:${clientIp}`, 30, 60_000);
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: 'rate_limit',
          message: 'リクエストが多すぎます。少し待ってからもう一度試してください。',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body: ChatRequest = await req.json();
    const { character_id, message } = body;

    const character = getCharacter(character_id);
    if (!character) {
      return new Response('Invalid character', { status: 400 });
    }

    // 認証ユーザーかゲストかで処理を分岐
    let conversation_id = body.conversation_id;
    let dbUserId: string | null = null;
    let history: { role: string; content: string }[] = [];
    let existingSummary: string | null = null;
    let userPlan: keyof typeof PLAN_LIMITS = 'free';

    if (user) {
      // 認証済みユーザー: DB保存あり
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (dbUser) {
        dbUserId = dbUser.id;

        // ユーザーのプランを取得
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', dbUser.id)
          .eq('status', 'active')
          .single();

        if (sub) {
          userPlan = sub.plan as keyof typeof PLAN_LIMITS;
        }

        // フリープランのメッセージ制限チェック
        const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
        if (limits.dailyMessages > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'user')
            .gte('created_at', today.toISOString())
            .in('conversation_id',
              (await supabase
                .from('conversations')
                .select('id')
                .eq('user_id', dbUser.id)
              ).data?.map(c => c.id) || []
            );

          if ((count || 0) >= limits.dailyMessages) {
            return new Response(
              JSON.stringify({
                error: 'daily_limit',
                message: `今日のメッセージ上限（${limits.dailyMessages}回）に達しました。プランをアップグレードすると無制限にチャットできます♡`,
                limit: limits.dailyMessages,
                used: count,
              }),
              { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        // 会話が無ければ新規作成
        if (!conversation_id) {
          const { data: conv } = await supabase
            .from('conversations')
            .insert({
              user_id: dbUserId,
              character_id,
              title: message.slice(0, 50),
              mood: 'neutral',
            })
            .select('id')
            .single();

          conversation_id = conv?.id || `guest-${Date.now()}`;
        }

        // ユーザーメッセージを保存
        await supabase.from('messages').insert({
          conversation_id,
          role: 'user',
          content: message,
          content_type: 'text',
        });

        // 既存の会話サマリーを取得
        const { data: summaryData } = await supabase
          .from('conversation_summaries')
          .select('summary')
          .eq('conversation_id', conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        existingSummary = summaryData?.summary || null;

        // 全メッセージ数を取得
        const { count: totalMsgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation_id);

        const totalMessages = totalMsgCount || 0;

        if (totalMessages > COMPRESS_THRESHOLD) {
          // 圧縮が必要: 全メッセージ取得→古いものを要約→最新KEEP_RECENT件だけ使う
          const { data: allMsgs } = await supabase
            .from('messages')
            .select('id, role, content')
            .eq('conversation_id', conversation_id)
            .order('created_at', { ascending: true });

          const all = allMsgs || [];
          const oldMessages = all.slice(0, all.length - KEEP_RECENT);
          const recentMessages = all.slice(-KEEP_RECENT);

          // バックグラウンドで要約を生成・保存（レスポンスを遅延させない）
          if (oldMessages.length > 0) {
            summarizeMessages(
              oldMessages.map(m => ({ role: m.role, content: m.content })),
              character.nameJa,
              existingSummary
            ).then(async (newSummary) => {
              if (newSummary) {
                // 既存のサマリーをupsert
                const { data: existing } = await supabase
                  .from('conversation_summaries')
                  .select('id')
                  .eq('conversation_id', conversation_id!)
                  .limit(1)
                  .single();

                if (existing) {
                  await supabase
                    .from('conversation_summaries')
                    .update({
                      summary: newSummary,
                      message_range_end: oldMessages[oldMessages.length - 1].id,
                    })
                    .eq('id', existing.id);
                } else {
                  await supabase
                    .from('conversation_summaries')
                    .insert({
                      conversation_id: conversation_id!,
                      summary: newSummary,
                      message_range_start: oldMessages[0].id,
                      message_range_end: oldMessages[oldMessages.length - 1].id,
                    });
                }
              }
            }).catch(err => console.error('Summary save failed:', err));
          }

          history = recentMessages.map(m => ({ role: m.role, content: m.content }));
        } else {
          // 圧縮不要: 全メッセージをそのまま使う
          const { data: msgs } = await supabase
            .from('messages')
            .select('role, content')
            .eq('conversation_id', conversation_id)
            .order('created_at', { ascending: true });

          history = msgs || [];
        }
      }
    }

    // ゲストの場合
    if (!conversation_id) {
      conversation_id = `guest-${Date.now()}`;
    }

    // Gemini API用のcontentsを構築（サマリー対応）
    const contents = buildContentsWithSummary(
      character.systemPrompt,
      existingSummary,
      history,
      // ゲストの場合はhistoryに現在のメッセージが含まれていない
      (history.length === 0 || history[history.length - 1]?.content !== message)
        ? message
        : undefined
    );

    // SSEストリーミングレスポンス
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `event: metadata\ndata: ${JSON.stringify({ conversation_id, character_id })}\n\n`
            )
          );

          const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                maxOutputTokens: 500,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ code: response.status, message: errorText })}\n\n`
              )
            );
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let fullResponse = '';
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
                  const data = JSON.parse(jsonStr);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    fullResponse += text;
                    controller.enqueue(
                      encoder.encode(
                        `event: token\ndata: ${JSON.stringify({ content: text })}\n\n`
                      )
                    );
                  }
                } catch {
                  // パースエラーは無視
                }
              }
            }
          }

          // [IMAGE: ...] タグを検出して画像生成
          let imageUrl: string | null = null;
          let savedContent = fullResponse;
          const { cleanText, imageDescriptions } = extractImageTags(fullResponse);
          const canGenerateImages = PLAN_LIMITS[userPlan]?.imageGeneration !== false;

          if (imageDescriptions.length > 0 && canGenerateImages) {
            savedContent = cleanText;

            controller.enqueue(
              encoder.encode(
                `event: clean_text\ndata: ${JSON.stringify({ content: cleanText })}\n\n`
              )
            );

            // 撮影中イベントを送信（フロントで表示）
            controller.enqueue(
              encoder.encode(
                `event: generating_image\ndata: ${JSON.stringify({ status: 'started' })}\n\n`
              )
            );

            // 画像生成（最初の1つだけ）— 参照画像付きで顔の一貫性を保つ
            const imgPrompt = buildImagePrompt(
              character.imagePromptBase,
              imageDescriptions[0],
              !!character.referenceImagePath
            );
            const result = await generateImage(imgPrompt, character.referenceImagePath);

            if (result) {
              // 認証ユーザー: Supabase Storageに保存して永続URL取得
              if (dbUserId && conversation_id && !conversation_id.startsWith('guest-')) {
                try {
                  const publicUrl = await uploadChatImage(supabase, result.base64, result.mimeType, conversation_id);
                  if (publicUrl) {
                    imageUrl = publicUrl;
                  }
                } catch (uploadErr) {
                  console.error('Storage upload failed, falling back to base64:', uploadErr);
                }
              }
              // ゲストまたはアップロード失敗: base64 data URLにフォールバック
              if (!imageUrl) {
                imageUrl = `data:${result.mimeType};base64,${result.base64}`;
              }

              controller.enqueue(
                encoder.encode(
                  `event: image\ndata: ${JSON.stringify({ image_url: imageUrl })}\n\n`
                )
              );
            } else {
              // 画像生成失敗（セーフティフィルター等）→ キャラっぽいフォールバックメッセージ
              const failMsg = '\n\nえ〜ん、その写真は怒られちゃった...😢 もうちょっと普通のやつなら撮れるかも！';
              savedContent += failMsg;
              controller.enqueue(
                encoder.encode(
                  `event: image_failed\ndata: ${JSON.stringify({ fallback_text: failMsg })}\n\n`
                )
              );
            }
          } else if (imageDescriptions.length > 0 && !canGenerateImages) {
            // フリープランで画像リクエスト → アップグレード案内
            savedContent = cleanText;
            const upgradeMsg = '\n\n写真を見るにはプランのアップグレードが必要だよ♡ ベーシックプランなら画像付きでチャットできるよ！';
            savedContent += upgradeMsg;
            controller.enqueue(
              encoder.encode(
                `event: clean_text\ndata: ${JSON.stringify({ content: savedContent })}\n\n`
              )
            );
          }

          // 認証ユーザーの場合: アシスタントメッセージをDB保存
          if (dbUserId && fullResponse && conversation_id && !conversation_id.startsWith('guest-')) {
            await supabase.from('messages').insert({
              conversation_id,
              role: 'assistant',
              content: savedContent,
              content_type: imageUrl ? 'image' : 'text',
              image_url: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : null,
              model_used: GEMINI_MODEL,
            });

            await supabase
              .from('conversations')
              .update({
                message_count: history.length + 2,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', conversation_id);
          }

          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({ conversation_id })}\n\n`
            )
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: String(error) })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
