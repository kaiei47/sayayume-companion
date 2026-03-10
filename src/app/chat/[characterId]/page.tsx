'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import ChatMessages, { ChatMessage } from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { CHARACTERS } from '@/lib/characters';
import { CharacterId } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ChatPage() {
  const params = useParams();
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
  const [conversationList, setConversationList] = useState<Array<{
    id: string; title: string; message_count: number; last_message_at: string;
  }>>([]);
  const [intimacyLevel, setIntimacyLevel] = useState(1);
  const [intimacyProgress, setIntimacyProgress] = useState(0);
  const [intimacyInfo, setIntimacyInfo] = useState<{ nameJa: string; emoji: string; color: string } | null>(null);
  const [levelUpNotice, setLevelUpNotice] = useState<{ from: number; to: number; nameJa: string; emoji: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
      if (!user) return;
      const { data: dbUser } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
      if (!dbUser) return;
      const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', dbUser.id).eq('status', 'active').single();
      if (sub) setUserPlan(sub.plan);

      // 親密度取得
      try {
        const res = await fetch('/api/intimacy');
        if (res.ok) {
          const data = await res.json();
          const charIntimacy = data.intimacy?.[characterId];
          if (charIntimacy) {
            setIntimacyLevel(charIntimacy.level);
            setIntimacyProgress(charIntimacy.progress);
            setIntimacyInfo(charIntimacy.levelInfo);
          }
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
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.conversations) {
          setConversationList(data.conversations);
        }
        if (data.conversation && data.messages.length > 0) {
          setConversationId(data.conversation.id);
          setMessages(
            data.messages.map((msg: { id: string; role: string; content: string; image_url?: string; created_at: string }) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              image_url: msg.image_url,
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
        <p>キャラクターが見つかりません</p>
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
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold">{character.nameJa}</h1>
              {intimacyInfo && (
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r ${intimacyInfo.color} text-white`}>
                  {intimacyInfo.emoji} Lv{intimacyLevel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-green-400/80">オンライン</p>
              {intimacyInfo && (
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${intimacyInfo.color} transition-all duration-700`}
                      style={{ width: `${intimacyProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground/50">{intimacyInfo.nameJa}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* フリープランのアップグレードバッジ */}
        {userPlan === 'free' && (
          <Link
            href="/pricing"
            className="text-[10px] font-medium bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full hover:bg-blue-600/30 transition-colors"
          >
            PRO
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
                新しい会話を始める
              </button>
              {conversationList.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                    過去の会話
                  </div>
                  {conversationList.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${
                        conv.id === conversationId ? 'bg-muted/30 text-primary' : 'text-foreground'
                      }`}
                    >
                      <p className="truncate text-xs">{conv.title || '無題の会話'}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {conv.message_count}メッセージ · {formatMenuTime(conv.last_message_at)}
                      </p>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
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
      <ChatMessages
        messages={messages}
        streamingContent={streamingContent}
        character={character}
        isLoading={isLoading}
        isLoadingHistory={isLoadingHistory}
        isGeneratingImage={isGeneratingImage}
      />

      {/* 入力エリア */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={`${character.nameJa}にメッセージ...`}
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
  if (diffMin < 1) return '今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
