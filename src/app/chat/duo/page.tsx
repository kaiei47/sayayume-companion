'use client';

import { Suspense } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatInput from '@/components/chat/ChatInput';
import { CHARACTERS } from '@/lib/characters';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const saya = CHARACTERS.saya;
const yume = CHARACTERS.yume;
const duo = CHARACTERS.duo;

interface DuoMessage {
  id: string;
  message_id?: string; // DBの元メッセージID（お気に入り用）
  role: 'user' | 'saya' | 'yume';
  content: string;
  image_url?: string | null;
  is_favorite?: boolean;
  created_at: string;
  isLevelUp?: boolean;
}

/** [SAYA]...[YUME]... 形式のテキストをパースして個別メッセージに分割 */
function parseDuoResponse(text: string): { saya: string; yume: string } {
  const sayaMatch = text.match(/\[SAYA\]\s*([\s\S]*?)(?=\[YUME\]|$)/i);
  const yumeMatch = text.match(/\[YUME\]\s*([\s\S]*?)(?=\[SAYA\]|$)/i);

  return {
    saya: sayaMatch?.[1]?.trim() || '',
    yume: yumeMatch?.[1]?.trim() || '',
  };
}

/** [IMAGE: ...] タグを除去 */
function cleanDisplayText(text: string): string {
  return text
    .replace(/\[IMAGE:\s*[^\]]*\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function DuoChatPageInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<DuoMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [intimacyInfo, setIntimacyInfo] = useState<Record<string, { level: number; progress: number; levelInfo: { nameJa: string; emoji: string; color: string } }>>({});
  const [levelUpNotice, setLevelUpNotice] = useState<{ from: number; to: number; nameJa: string; emoji: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const prevMessagesLength = useRef(0);
  const pendingToggles = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isLoadingHistory) {
      initialScrollDone.current = false;
      return;
    }
    const container = scrollRef.current;
    if (!container) return;

    if (!initialScrollDone.current && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
      setTimeout(() => { container.scrollTop = container.scrollHeight; }, 120);
      initialScrollDone.current = true;
      prevMessagesLength.current = messages.length;
    } else if (messages.length > prevMessagesLength.current || streamingContent) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevMessagesLength.current = messages.length;
    }
  }, [messages, streamingContent, isLoadingHistory]);

  // 認証 & プランチェック
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        setIsLoadingHistory(false);
        return;
      }
      setIsAuthenticated(true);
      const { data: dbUser } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
      if (!dbUser) {
        setIsLoadingHistory(false);
        return;
      }
      const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', dbUser.id).eq('status', 'active').single();
      if (sub) setUserPlan(sub.plan);

      // 親密度取得
      try {
        const res = await fetch('/api/intimacy');
        if (res.ok) {
          const data = await res.json();
          if (data.intimacy) {
            const info: Record<string, { level: number; progress: number; levelInfo: { nameJa: string; emoji: string; color: string } }> = {};
            for (const [charId, charData] of Object.entries(data.intimacy) as [string, { level: number; progress: number; levelInfo: { nameJa: string; emoji: string; color: string } }][]) {
              info[charId] = { level: charData.level, progress: charData.progress, levelInfo: charData.levelInfo };
            }
            setIntimacyInfo(info);
          }
        }
      } catch { /* ignore */ }
      // isLoadingHistoryはloadHistory()のfinallyでセットするため、ここでは設定しない
    }
    checkAuth();
  }, []);

  // 会話履歴ロード
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/conversations?character_id=duo');
        if (res.ok) {
          const data = await res.json();
          if (data.conversation && data.messages?.length > 0) {
            setConversationId(data.conversation.id);
            // 保存済みメッセージを復元（duo形式にパース）
            const restored: DuoMessage[] = [];
            for (const msg of data.messages) {
              if (msg.role === 'user') {
                restored.push({
                  id: msg.id,
                  role: 'user',
                  content: msg.content,
                  created_at: msg.created_at,
                });
              } else {
                // assistant メッセージを saya/yume に分割
                const parsed = parseDuoResponse(msg.content);
                if (parsed.saya) {
                  restored.push({
                    id: `${msg.id}-saya`,
                    message_id: msg.id,
                    role: 'saya',
                    content: parsed.saya,
                    image_url: msg.image_url,
                    is_favorite: msg.is_favorite ?? false,
                    created_at: msg.created_at,
                  });
                }
                if (parsed.yume) {
                  restored.push({
                    id: `${msg.id}-yume`,
                    role: 'yume',
                    content: parsed.yume,
                    created_at: msg.created_at,
                  });
                }
                // パースできなかった場合はさやとして表示
                if (!parsed.saya && !parsed.yume && msg.content) {
                  restored.push({
                    id: msg.id,
                    message_id: msg.id,
                    role: 'saya',
                    content: msg.content,
                    image_url: msg.image_url,
                    is_favorite: msg.is_favorite ?? false,
                    created_at: msg.created_at,
                  });
                }
              }
            }
            setMessages(restored);
          }
        }
      } catch {
        // ignore
      } finally {
        // 履歴ロード完了後にisLoadingHistoryをfalseにする（checkAuthより後に実行される保証はないため、
        // ここでセットすることでgreetingエフェクトが履歴ロード後に発火するよう保証する）
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, []);

  // ホームからのgreetingメッセージ（daily photo返信）をチャットに引き継ぐ
  const greetingInserted = useRef(false);
  useEffect(() => {
    if (!isLoadingHistory && !greetingInserted.current) {
      const greeting = searchParams.get('greeting');
      const greetingImageUrl = searchParams.get('image_url') ||
        (() => { try { const v = sessionStorage.getItem('pendingGreetingImageUrl'); sessionStorage.removeItem('pendingGreetingImageUrl'); return v; } catch { return null; } })();
      if (greeting) {
        greetingInserted.current = true;
        setMessages(prev => {
          return [...prev, {
            id: `greeting-${Date.now()}`,
            role: 'saya',
            content: greeting,
            image_url: greetingImageUrl || undefined,
            created_at: new Date().toISOString(),
          }];
        });
      }
    }
  }, [isLoadingHistory, searchParams]);

  const toggleFavorite = async (messageId: string, current: boolean) => {
    if (pendingToggles.current.has(messageId)) return;
    pendingToggles.current.add(messageId);
    setMessages(prev => prev.map(m =>
      (m.message_id === messageId || m.id === messageId) ? { ...m, is_favorite: !current } : m
    ));
    try {
      const res = await fetch('/api/images/favorite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, is_favorite: !current }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setMessages(prev => prev.map(m =>
        (m.message_id === messageId || m.id === messageId) ? { ...m, is_favorite: current } : m
      ));
    } finally {
      pendingToggles.current.delete(messageId);
    }
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoading) return;

      const userMessage: DuoMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent('');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            character_id: 'duo',
            message: content,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            const errorData = await response.json();
            setMessages((prev) => [...prev, {
              id: `limit-${Date.now()}`,
              role: 'saya',
              content: errorData.message || 'メッセージ制限に達しちゃった...♡',
              created_at: new Date().toISOString(),
            }]);
            setIsLoading(false);
            return;
          }
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';
        let currentEvent = '';
        let receivedImageUrl: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
              continue;
            }
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              try {
                const data = JSON.parse(jsonStr);
                if (data.conversation_id && !conversationId) {
                  setConversationId(data.conversation_id);
                }
                // image または done イベントからimage_urlを取得（短いURLのみ）
                if ((currentEvent === 'image' || currentEvent === 'done') && data.image_url) {
                  receivedImageUrl = data.image_url;
                }
                if (currentEvent === 'token' && data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                }
                if (currentEvent === 'clean_text' && data.content !== undefined) {
                  accumulated = data.content;
                  setStreamingContent(data.content);
                }
                if (currentEvent === 'generating_image') {
                  setGeneratingImage(true);
                }
                if (currentEvent === 'image_failed') {
                  setGeneratingImage(false);
                }
                // レベルアップ特別メッセージ
                if (currentEvent === 'level_up_message' && data.content) {
                  setMessages((prev) => [...prev, {
                    id: `levelup-${Date.now()}`,
                    role: 'saya' as const,
                    content: data.content,
                    created_at: new Date().toISOString(),
                    isLevelUp: true,
                  }]);
                }
                // 親密度イベント
                if (currentEvent === 'intimacy' && data.level) {
                  setIntimacyInfo(prev => ({
                    ...prev,
                    saya: { level: data.level, progress: data.progress || 0, levelInfo: data.levelInfo },
                    yume: { level: data.level, progress: data.progress || 0, levelInfo: data.levelInfo },
                  }));
                  if (data.levelChanged && data.level > data.previousLevel) {
                    setLevelUpNotice({
                      from: data.previousLevel,
                      to: data.level,
                      nameJa: data.levelInfo?.nameJa || '',
                      emoji: data.levelInfo?.emoji || '',
                    });
                    setTimeout(() => setLevelUpNotice(null), 5000);
                  }
                }
              } catch {
                // SSE parse error — ignore
              }
              currentEvent = '';
            }
          }
        }

        // ストリーミング完了 → パースして2人のメッセージに分割
        setGeneratingImage(false);
        if (accumulated) {
          const parsed = parseDuoResponse(accumulated);
          const now = new Date().toISOString();
          // Date.now()の衝突を避けるためにランダムサフィックスを追加
          const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const newMessages: DuoMessage[] = [];

          if (parsed.saya) {
            newMessages.push({
              id: `saya-${uid}`,
              role: 'saya',
              content: parsed.saya,
              created_at: now,
            });
          }
          if (parsed.yume) {
            newMessages.push({
              id: `yume-${uid}`,
              role: 'yume',
              content: parsed.yume,
              created_at: now,
            });
          }
          // パースできなかった場合
          if (newMessages.length === 0) {
            newMessages.push({
              id: `saya-${uid}`,
              role: 'saya',
              content: accumulated,
              created_at: now,
            });
          }

          // 画像URLがSSEから取得できた場合、さやのメッセージに添付
          if (receivedImageUrl && newMessages.length > 0) {
            const sayaMsg = newMessages.find(m => m.role === 'saya');
            if (sayaMsg) {
              sayaMsg.image_url = receivedImageUrl;
            } else {
              newMessages.push({
                id: `duo-img-${uid}`,
                role: 'saya',
                content: '',
                image_url: receivedImageUrl,
                created_at: now,
              });
            }
          }

          setMessages((prev) => [...prev, ...newMessages]);
          setStreamingContent('');
        }
      } catch (error) {
        console.error('Duo chat error:', error);
        setMessages((prev) => [...prev, {
          id: `error-${Date.now()}`,
          role: 'saya',
          content: 'ごめんね、エラーが起きちゃった...もう一回送ってみて？🥺',
          created_at: new Date().toISOString(),
        }]);
        setStreamingContent('');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, conversationId]
  );

  // 認証チェック中はローディング表示
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  // プレミアムじゃない場合
  if (isAuthenticated === false) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
        <h2 className="text-xl font-bold mb-2">ログインが必要です</h2>
        <p className="text-muted-foreground text-sm mb-4">さやゆめモードはログインユーザー限定です</p>
        <Link href="/login" className="rounded-xl bg-blue-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-blue-500">
          ログイン
        </Link>
      </div>
    );
  }

  if (!isLoadingHistory && userPlan !== 'premium' && userPlan !== 'vip') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
        <div className="space-y-4 max-w-sm">
          <div className="flex justify-center gap-3">
            <Avatar className="h-16 w-16 ring-2 ring-pink-500/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={saya.avatarUrl} alt="さや" />
              <AvatarFallback>さ</AvatarFallback>
            </Avatar>
            <Avatar className="h-16 w-16 ring-2 ring-blue-500/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={yume.avatarUrl} alt="ゆめ" />
              <AvatarFallback>ゆ</AvatarFallback>
            </Avatar>
          </div>
          <h2 className="text-xl font-bold">さやゆめモード</h2>
          <p className="text-muted-foreground text-sm">
            さやとゆめの2人と同時にチャットできる特別モード♡<br />
            Premiumプラン限定機能です。
          </p>
          <Link
            href="/pricing"
            className="inline-block rounded-xl bg-gradient-to-r from-pink-600 to-blue-600 text-white px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Premiumにアップグレード
          </Link>
          <div>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← トップに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* ヘッダー */}
      <header className="flex items-center gap-3 border-b border-border/50 bg-background/80 backdrop-blur-lg px-4 py-3">
        <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
          </svg>
        </a>
        <div className="flex items-center gap-2 flex-1">
          {/* 2人のアバターを重ねて表示 */}
          <div className="relative">
            <img src={saya.avatarUrl} alt="さや" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
            <img
              src={yume.avatarUrl}
              alt="ゆめ"
              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10 absolute -right-3 top-0"
            />
          </div>
          <div className="ml-3">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold">さや＆ゆめ</h1>
              {intimacyInfo.saya && intimacyInfo.saya.level > 1 && (
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r ${intimacyInfo.saya.levelInfo.color} text-white`}>
                  {intimacyInfo.saya.levelInfo.emoji} Lv{intimacyInfo.saya.level}
                </span>
              )}
            </div>
            <p className="text-[11px] text-green-400/80">2人ともオンライン</p>
          </div>
        </div>
        <span className="text-[10px] font-medium bg-gradient-to-r from-pink-600 to-blue-600 text-white px-2.5 py-1 rounded-full">
          PREMIUM
        </span>
      </header>

      {/* レベルアップ通知 */}
      {levelUpNotice && (
        <div className="absolute inset-x-0 top-20 z-50 flex justify-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-gradient-to-r from-pink-500/90 via-purple-500/90 to-blue-500/90 text-white rounded-2xl px-6 py-3 shadow-lg backdrop-blur-sm">
            <div className="text-center">
              <p className="text-lg font-bold">{levelUpNotice.emoji} Level UP!</p>
              <p className="text-sm">
                Lv{levelUpNotice.from} → Lv{levelUpNotice.to} 「{levelUpNotice.nameJa}」
              </p>
            </div>
          </div>
        </div>
      )}

      {/* メッセージエリア */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {/* ローディング */}
          {isLoadingHistory && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {/* ウェルカム */}
          {!isLoadingHistory && messages.length === 0 && !streamingContent && (
            <>
              <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center">
                <div className="flex gap-3 mb-4">
                  <Avatar className="h-16 w-16 ring-2 ring-pink-500/20 ring-offset-2 ring-offset-background">
                    <AvatarImage src={saya.avatarUrl} alt="さや" />
                    <AvatarFallback>さ</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-16 w-16 ring-2 ring-blue-500/20 ring-offset-2 ring-offset-background">
                    <AvatarImage src={yume.avatarUrl} alt="ゆめ" />
                    <AvatarFallback>ゆ</AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-lg font-semibold mb-0.5">さやゆめモード</h2>
                <p className="text-muted-foreground text-xs">双子と3人でチャット♡</p>
              </div>
              {/* さやの挨拶 */}
              <DuoBubble role="saya" content="やっほー♡ 2人揃っちゃったよ〜！✨" />
              {/* ゆめの挨拶 */}
              <DuoBubble role="yume" content="さやうるさい...。えっと、よろしくお願いします...♡" />
            </>
          )}

          {/* メッセージ一覧 */}
          {messages.map((msg) => (
            <DuoBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              image_url={msg.image_url}
              is_favorite={msg.is_favorite}
              message_id={msg.message_id}
              created_at={msg.created_at}
              onToggleFavorite={toggleFavorite}
            />
          ))}

          {/* ストリーミング中（まだパースしないで raw 表示） */}
          {streamingContent && (
            <div className="flex items-end gap-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={saya.avatarUrl} alt="さや" />
                <AvatarFallback>さ</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2 max-w-[78%]">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">
                  {cleanStreamingContent(streamingContent)}
                </p>
              </div>
            </div>
          )}

          {/* 撮影中インジケーター */}
          {generatingImage && (
            <div className="flex items-end gap-2">
              <div className="flex -space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={saya.avatarUrl} alt="さや" />
                  <AvatarFallback>さ</AvatarFallback>
                </Avatar>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={yume.avatarUrl} alt="ゆめ" />
                  <AvatarFallback>ゆ</AvatarFallback>
                </Avatar>
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="animate-pulse">📸</span>
                  <span>2ショット撮影中...</span>
                </div>
              </div>
            </div>
          )}

          {/* タイピング */}
          {isLoading && !streamingContent && !generatingImage && (
            <div className="flex items-end gap-2">
              <div className="flex -space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={saya.avatarUrl} alt="さや" />
                  <AvatarFallback>さ</AvatarFallback>
                </Avatar>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={yume.avatarUrl} alt="ゆめ" />
                  <AvatarFallback>ゆ</AvatarFallback>
                </Avatar>
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* 入力 */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder="さやとゆめにメッセージ..."
      />
    </div>
  );
}

/** ストリーミング中のコンテンツからタグを除去して表示 */
function cleanStreamingContent(text: string): string {
  return text
    .replace(/\[SAYA\]/gi, '💖 ')
    .replace(/\[YUME\]/gi, '\n💙 ')
    .replace(/\[IMAGE:\s*[^\]]*\]/g, '')
    .trim();
}

/** デュオチャットのメッセージバブル */
function DuoBubble({
  role,
  content,
  image_url,
  is_favorite,
  message_id,
  created_at,
  onToggleFavorite,
}: {
  role: 'user' | 'saya' | 'yume';
  content: string;
  image_url?: string | null;
  is_favorite?: boolean;
  message_id?: string;
  created_at?: string;
  onToggleFavorite?: (messageId: string, current: boolean) => void;
}) {
  const isUser = role === 'user';
  const isSaya = role === 'saya';
  const char = isSaya ? saya : yume;
  const cleaned = cleanDisplayText(content);

  // 画像もテキストもない場合は表示しない
  if (!cleaned && !image_url) return null;

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {!isUser && (
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={char.avatarUrl} alt={char.nameJa} />
          <AvatarFallback>{char.nameJa[0]}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        'flex flex-col gap-1',
        isUser ? 'items-end' : 'items-start',
        'max-w-[78%]'
      )}>
        {/* キャラ名ラベル（さや/ゆめ） */}
        {!isUser && (
          <span className={cn(
            'text-[10px] font-medium px-1',
            isSaya ? 'text-pink-400/70' : 'text-blue-400/70'
          )}>
            {char.nameJa}
          </span>
        )}

        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : isSaya
                ? 'bg-pink-500/10 border border-pink-500/20 rounded-bl-md'
                : 'bg-blue-500/10 border border-blue-500/20 rounded-bl-md'
          )}
        >
          {cleaned && <p className="whitespace-pre-wrap break-words">{cleaned}</p>}
          {image_url && (
            <div className={cn('relative group/img', cleaned ? 'mt-2' : '')}>
              <img
                src={image_url}
                alt="2ショット写真"
                className="rounded-xl max-w-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {onToggleFavorite && message_id && (
                <button
                  onClick={() => onToggleFavorite(message_id, is_favorite ?? false)}
                  className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-all hover:scale-110 active:scale-95"
                  aria-label={is_favorite ? 'お気に入りを解除' : 'お気に入りに追加'}
                >
                  <span className="text-base leading-none">{is_favorite ? '❤️' : '🤍'}</span>
                </button>
              )}
              {is_favorite && (
                <span className="absolute bottom-2 right-2 text-base leading-none pointer-events-none group-hover/img:opacity-0 transition-opacity">❤️</span>
              )}
            </div>
          )}
        </div>

        {created_at && (
          <span className="text-[10px] text-muted-foreground/40 px-1">
            {formatTime(created_at)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DuoChatPage() {
  return (
    <Suspense fallback={null}>
      <DuoChatPageInner />
    </Suspense>
  );
}
