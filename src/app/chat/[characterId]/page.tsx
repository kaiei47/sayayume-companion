'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ChatMessages, { ChatMessage } from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { CHARACTERS } from '@/lib/characters';
import { CharacterId } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

// キャラクター別 秘密のロック情報（親密度レベルゲート）
const CHARACTER_SECRETS: Record<string, Array<{ level: number; hint: string }>> = {
  saya: [
    { level: 3, hint: 'なんでギャルになったのか、本当の理由がある...' },
    { level: 4, hint: 'お父さんのこと、あなただけには話せるかもしれない' },
    { level: 5, hint: 'ゆめとの間の秘密、全部話せる日が来るかもしれない' },
  ],
  yume: [
    { level: 3, hint: 'ピアノが弾けなくなった、本当の理由は...' },
    { level: 4, hint: 'あの頃のこと、あなたになら話せる気がして...' },
    { level: 5, hint: 'さやとの間にある秘密を、全部話せる日が来るかも' },
  ],
  duo: [
    { level: 3, hint: '2人が「双子」と言っている、本当の理由...' },
    { level: 4, hint: 'さやとゆめの間にある、言葉にならない何か' },
    { level: 5, hint: '家族の秘密。2人にとっての真実とは' },
  ],
};

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const characterId = params.characterId as CharacterId;
  const character = CHARACTERS[characterId];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [conversationList, setConversationList] = useState<Array<{
    id: string; title: string; message_count: number; last_message_at: string;
  }>>([]);
  const [intimacyLevel, setIntimacyLevel] = useState(1);
  const [intimacyProgress, setIntimacyProgress] = useState(0);
  const [intimacyPoints, setIntimacyPoints] = useState(0);
  const [pointsToNext, setPointsToNext] = useState(100);
  const [intimacyInfo, setIntimacyInfo] = useState<{ nameJa: string; emoji: string; color: string } | null>(null);
  const [levelUpNotice, setLevelUpNotice] = useState<{ from: number; to: number; nameJa: string; emoji: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [dailyMissions, setDailyMissions] = useState<Array<{ id: string; label: string; icon: string; points: number; completed: boolean }>>([]);
  const [showMissions, setShowMissions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingToggles = useRef<Set<string>>(new Set());

  // メニュー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setStreamingContent('');
    setShowMenu(false);
  }, []);

  // ユーザーのプランと親密度を取得
  useEffect(() => {
    async function loadUserData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsGuest(true); return; }
      const { data: dbUser } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
      if (!dbUser) return;
      const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', dbUser.id).eq('status', 'active').single();
      if (sub) setUserPlan(sub.plan);

      // 親密度 + ストリーク + デイリーミッション取得
      try {
        const res = await fetch('/api/intimacy');
        if (res.ok) {
          const data = await res.json();
          const charIntimacy = data.intimacy?.[characterId];
          if (charIntimacy) {
            setIntimacyLevel(charIntimacy.level);
            setIntimacyProgress(charIntimacy.progress);
            setIntimacyPoints(charIntimacy.points || 0);
            setPointsToNext(charIntimacy.pointsToNext ?? 100);
            setIntimacyInfo(charIntimacy.levelInfo);
          }
          if (data.streak) setStreak(data.streak.count || 0);
          if (data.dailyMissions) setDailyMissions(data.dailyMissions);
        }
      } catch {
        // 無視
      }
    }
    loadUserData();
  }, [characterId]);

  // 会話履歴をロード
  const loadConversation = useCallback(async (convId?: string) => {
    setIsLoadingHistory(true);
    try {
      const url = convId
        ? `/api/conversations?character_id=${characterId}&conversation_id=${convId}`
        : `/api/conversations?character_id=${characterId}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.conversations) {
          setConversationList(data.conversations);
        }
        if (data.conversation && data.messages.length > 0) {
          setConversationId(data.conversation.id);
          setMessages(
            data.messages.map((msg: { id: string; role: string; content: string; image_url?: string; is_favorite?: boolean; created_at: string }) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              image_url: msg.image_url,
              is_favorite: msg.is_favorite ?? false,
              created_at: msg.created_at,
            }))
          );
        } else if (!convId) {
          // 会話がない場合（初回）
          setConversationId(null);
          setMessages([]);
        }
      }
    } catch {
      // 履歴ロード失敗は無視（ゲストの場合など）
    } finally {
      setIsLoadingHistory(false);
      setShowMenu(false);
    }
  }, [characterId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // ホームのgreetingメッセージをチャット画面に引き継ぐ
  useEffect(() => {
    if (!isLoadingHistory && messages.length === 0) {
      const greeting = searchParams.get('greeting');
      if (greeting) {
        setMessages([{
          id: `greeting-${Date.now()}`,
          role: 'assistant',
          content: greeting,
          created_at: new Date().toISOString(),
        }]);
      }
    }
  }, [isLoadingHistory, searchParams]);

  const toggleFavorite = async (messageId: string, current: boolean) => {
    if (pendingToggles.current.has(messageId)) return;
    pendingToggles.current.add(messageId);
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, is_favorite: !current } : m
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
        m.id === messageId ? { ...m, is_favorite: current } : m
      ));
    } finally {
      pendingToggles.current.delete(messageId);
    }
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoading) return;

      // ユーザーメッセージを即座に表示
      const userMessage: ChatMessage = {
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
            character_id: characterId,
            message: content,
          }),
        });

        if (!response.ok) {
          // メッセージ制限チェック
          if (response.status === 429) {
            const errorData = await response.json();
            const limitMessage: ChatMessage = {
              id: `limit-${Date.now()}`,
              role: 'assistant',
              content: errorData.message || '今日のメッセージ上限に達しました。プランをアップグレードしてね♡',
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, limitMessage]);
            setIsLoading(false);
            return;
          }
          // 会話が見つからない場合: IDをリセットして次回自動再作成
          if (response.status === 404) {
            setConversationId(null);
          }
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';
        let cleanedText = '';
        let imageUrlFromStream: string | null = null;

        let currentEvent = '';
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

                if (currentEvent === 'token' && data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                }

                if (currentEvent === 'clean_text' && data.content !== undefined) {
                  cleanedText = data.content;
                  setStreamingContent(data.content);
                }

                if (currentEvent === 'generating_image') {
                  setIsGeneratingImage(true);
                }

                // 親密度イベント
                if (currentEvent === 'intimacy' && data.level) {
                  setIntimacyLevel(data.level);
                  setIntimacyProgress(data.progress || 0);
                  if (data.levelInfo) setIntimacyInfo(data.levelInfo);
                  if (data.levelChanged && data.level > data.previousLevel) {
                    setLevelUpNotice({
                      from: data.previousLevel,
                      to: data.level,
                      nameJa: data.levelInfo?.nameJa || '',
                      emoji: data.levelInfo?.emoji || '',
                    });
                    // 5秒後に自動で消す
                    setTimeout(() => setLevelUpNotice(null), 5000);
                  }
                }

                // image または done イベントからimage_urlを取得（短いURLのみ）
                if ((currentEvent === 'image' || currentEvent === 'done') && data.image_url) {
                  imageUrlFromStream = data.image_url;
                  setIsGeneratingImage(false);
                }

                if (currentEvent === 'image_failed' && data.fallback_text) {
                  cleanedText = (cleanedText || accumulated) + data.fallback_text;
                  setStreamingContent(cleanedText);
                  setIsGeneratingImage(false);
                }

                // レベルアップ特別メッセージ
                if (currentEvent === 'level_up_message' && data.content) {
                  const levelUpMessage: ChatMessage = {
                    id: `levelup-${Date.now()}`,
                    role: 'assistant',
                    content: data.content,
                    created_at: new Date().toISOString(),
                    isLevelUp: true,
                  };
                  setMessages((prev) => [...prev, levelUpMessage]);
                }
              } catch {
                // パースエラーは無視
              }
              currentEvent = '';
            }
          }
        }

        // ストリーミング完了 → メッセージリストに追加
        if (accumulated) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: cleanedText || accumulated,
            image_url: imageUrlFromStream,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent('');
        }
      } catch (error) {
        console.error('Chat error:', error);
        // エラーメッセージを表示
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'ごめんね、エラーが起きちゃった...もう一回送ってみて？🥺',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setStreamingContent('');
      } finally {
        setIsLoading(false);
        setIsGeneratingImage(false);
      }
    },
    [isLoading, conversationId, characterId]
  );

  if (!character) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p>Character not found</p>
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
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <img
              src={character.avatarUrl}
              alt={character.nameJa}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold">{character.nameJa}</h1>
              {intimacyInfo && (
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r ${intimacyInfo.color} text-white`}>
                  {intimacyInfo.emoji} Lv{intimacyLevel}
                </span>
              )}
            </div>
            {intimacyInfo && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-20 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${intimacyInfo.color} transition-all duration-700`}
                    style={{ width: `${intimacyProgress}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground/60">
                  {intimacyLevel < 5
                    ? `あと${pointsToNext}pt → Lv${intimacyLevel + 1}`
                    : `${intimacyPoints}pt 💎`}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* ストリーク表示 */}
        {streak > 0 && (
          <button
            onClick={() => setShowMissions(!showMissions)}
            className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full hover:bg-orange-500/20 transition-colors"
          >
            🔥{streak}
          </button>
        )}
        {/* ゲスト・フリープランのバッジ */}
        {isGuest ? (
          <Link
            href="/login"
            className="text-[10px] font-medium bg-muted/50 text-muted-foreground px-2 py-1 rounded-full hover:bg-muted transition-colors border border-border/40"
          >
            GUEST
          </Link>
        ) : userPlan === 'free' && (
          <Link
            href="/pricing"
            className="text-[10px] font-medium bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full hover:bg-blue-600/30 transition-colors"
          >
            FREE
          </Link>
        )}
        {/* メニューボタン */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border/50 bg-popover shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
              <button
                onClick={startNewChat}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 border-b border-border/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                </svg>
                New conversation
              </button>
              {conversationList.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                    Previous chats
                  </div>
                  {conversationList.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${
                        conv.id === conversationId ? 'bg-muted/30 text-primary' : 'text-foreground'
                      }`}
                    >
                      <p className="truncate text-xs">{conv.title || 'Untitled chat'}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {conv.message_count} msgs · {formatMenuTime(conv.last_message_at)}
                      </p>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* デイリーミッション */}
      {showMissions && dailyMissions.length > 0 && (
        <div className="border-b border-border/30 bg-card/50 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">今日のミッション</p>
            <p className="text-[10px] text-muted-foreground/60">
              {dailyMissions.filter(m => m.completed).length}/{dailyMissions.length} 完了
            </p>
          </div>
          <div className="space-y-1.5">
            {dailyMissions.map(mission => (
              <div key={mission.id} className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${
                  mission.completed ? 'bg-green-500' : 'bg-muted/40 border border-border/50'
                }`}>
                  {mission.completed ? '✓' : ''}
                </div>
                <span className={`text-xs ${mission.completed ? 'line-through text-muted-foreground/40' : 'text-foreground/80'}`}>
                  {mission.icon} {mission.label}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/50">+{mission.points}pt</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <ChatMessages
        messages={messages}
        streamingContent={streamingContent}
        character={character}
        isLoading={isLoading}
        isLoadingHistory={isLoadingHistory}
        isGeneratingImage={isGeneratingImage}
        onToggleFavorite={toggleFavorite}
      />

      {/* 秘密のロックUI: 次のレベルで解放されるストーリーヒント */}
      {messages.length > 0 && intimacyLevel < 5 && (() => {
        const secrets = CHARACTER_SECRETS[characterId] || [];
        const nextSecret = secrets.find(s => s.level === intimacyLevel + 1);
        if (!nextSecret) return null;
        return (
          <div className="border-t border-border/20 bg-card/10 px-4 py-2 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap flex-shrink-0">Next unlock</span>
            <div className="flex items-center gap-1.5 bg-muted/20 rounded-full px-2.5 py-1 min-w-0 flex-1">
              <span className="text-[11px] flex-shrink-0">🔒</span>
              <span className="text-[10px] text-muted-foreground/40 blur-[2px] select-none truncate">
                {nextSecret.hint}
              </span>
              <span className="ml-auto text-[9px] bg-primary/15 text-primary/60 rounded-full px-1.5 py-0.5 flex-shrink-0">
                Lv{nextSecret.level}
              </span>
            </div>
          </div>
        );
      })()}

      {/* ゲスト向け登録促進バナー */}
      {isGuest && messages.length >= 2 && (
        <div className="border-t border-border/20 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-blue-500/5 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground leading-tight">
            💾 会話履歴を残したい？<br />
            <span className="text-[10px] text-muted-foreground/60">無料登録で毎日3枚の写真＋履歴保存</span>
          </p>
          <Link
            href="/login"
            className="flex-shrink-0 text-[11px] font-semibold bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            無料登録 →
          </Link>
        </div>
      )}

      {/* 入力エリア */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={`Message ${character.nameJa}...`}
      />
    </div>
  );
}

function formatMenuTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
