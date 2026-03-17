'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CharacterConfig } from '@/lib/characters';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string | null;
  is_favorite?: boolean;
  created_at: string;
  isLevelUp?: boolean;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  streamingContent: string;
  character: CharacterConfig;
  isLoading: boolean;
  isLoadingHistory?: boolean;
  isGeneratingImage?: boolean;
  onToggleFavorite?: (messageId: string, current: boolean) => void;
}

export default function ChatMessages({
  messages,
  streamingContent,
  character,
  isLoading,
  isLoadingHistory = false,
  isGeneratingImage = false,
  onToggleFavorite,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    if (isLoadingHistory) {
      initialScrollDone.current = false;
      return;
    }

    const container = scrollRef.current;
    if (!container) return;

    if (!initialScrollDone.current && messages.length > 0) {
      // 履歴ロード完了時: アニメーションなしで即座に最下部へ
      container.scrollTop = container.scrollHeight;
      // 画像レンダリング後のズレを補正
      setTimeout(() => { container.scrollTop = container.scrollHeight; }, 120);
      initialScrollDone.current = true;
      prevMessagesLength.current = messages.length;
    } else if (messages.length > prevMessagesLength.current || streamingContent) {
      // 新しいメッセージ追加時のみ smooth スクロール
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevMessagesLength.current = messages.length;
    }
  }, [messages, streamingContent, isLoadingHistory]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-3">
        {/* 履歴ロード中 — スケルトンUI */}
        {isLoadingHistory && (
          <div className="space-y-4 animate-pulse pt-4">
            <div className="flex items-end gap-2">
              <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
              <div className="h-10 w-52 rounded-2xl rounded-bl-md bg-muted" />
            </div>
            <div className="flex justify-end">
              <div className="h-8 w-32 rounded-2xl rounded-br-md bg-muted/50" />
            </div>
            <div className="flex items-end gap-2">
              <div className="h-10 w-10 rounded-full bg-muted invisible flex-shrink-0" />
              <div className="h-16 w-64 rounded-2xl rounded-bl-md bg-muted" />
            </div>
            <div className="flex justify-end">
              <div className="h-8 w-44 rounded-2xl rounded-br-md bg-muted/50" />
            </div>
            <div className="flex items-end gap-2">
              <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
              <div className="h-8 w-40 rounded-2xl rounded-bl-md bg-muted" />
            </div>
          </div>
        )}

        {/* ウェルカムメッセージ */}
        {!isLoadingHistory && messages.length === 0 && !streamingContent && (
          <>
            <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center">
              <div className="relative mb-4">
                <Avatar className="h-20 w-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={character.avatarUrl} alt={character.nameJa} className="object-cover object-center" />
                  <AvatarFallback className="text-2xl">
                    {character.nameJa[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <h2 className="text-lg font-semibold mb-0.5">{character.nameJa}</h2>
              <p className="text-muted-foreground text-xs">{character.tagline}</p>
            </div>
            {/* キャラの挨拶吹き出し */}
            <div className="flex items-end gap-2 mt-2">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={character.avatarUrl} alt={character.nameJa} className="object-cover object-center" />
                <AvatarFallback>{character.nameJa[0]}</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2 max-w-[78%]">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {character.welcomeMessage}
                </p>
              </div>
            </div>
          </>
        )}

        {/* メッセージ一覧 */}
        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1];
          const nextMsg = messages[i + 1];
          const isConsecutive = prevMsg && prevMsg.role === msg.role;
          const isLastInGroup = !nextMsg || nextMsg.role !== msg.role;
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              character={character}
              isConsecutive={isConsecutive}
              isLastInGroup={isLastInGroup}
              onToggleFavorite={onToggleFavorite}
            />
          );
        })}

        {/* ストリーミング中のメッセージ */}
        {streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              created_at: new Date().toISOString(),
            }}
            character={character}
            isConsecutive={messages.length > 0 && messages[messages.length - 1].role === 'assistant'}
            isLastInGroup
          />
        )}

        {/* タイピングインジケータ */}
        {isLoading && !streamingContent && !isGeneratingImage && (
          <div className="flex items-end gap-2">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={character.avatarUrl} alt={character.nameJa} className="object-cover object-center" />
              <AvatarFallback>{character.nameJa[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <TypingDots />
            </div>
          </div>
        )}

        {/* 撮影中インジケータ */}
        {isGeneratingImage && (
          <div className="flex items-end gap-2">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={character.avatarUrl} alt={character.nameJa} className="object-cover object-center" />
              <AvatarFallback>{character.nameJa[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 animate-pulse text-pink-400">
                  <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
                  <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                </svg>
                <span className="animate-pulse">Taking a selfie...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

// [IMAGE: ...] タグや余分な空白をテキスト表示から除去
function cleanDisplayText(text: string): string {
  return text
    .replace(/\[IMAGE:\s*[^\]]*\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
          <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      <img
        src={src}
        alt="Full size"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function MessageBubble({
  message,
  character,
  isConsecutive,
  isLastInGroup,
  onToggleFavorite,
}: {
  message: ChatMessage;
  character: CharacterConfig;
  isConsecutive?: boolean;
  isLastInGroup?: boolean;
  onToggleFavorite?: (messageId: string, current: boolean) => void;
}) {
  const isUser = message.role === 'user';
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      {viewerOpen && message.image_url && (
        <ImageViewer src={message.image_url} onClose={() => setViewerOpen(false)} />
      )}
      <div
        className={cn(
          'flex items-end gap-2',
          isUser ? 'flex-row-reverse' : 'flex-row',
          isConsecutive ? 'mt-0.5' : 'mt-3'
        )}
      >
        {/* アバター（連続メッセージなら非表示でスペース確保） */}
        {!isUser && (
          <Avatar className={cn('h-9 w-9 flex-shrink-0', isConsecutive && 'invisible')}>
            <AvatarImage src={character.avatarUrl} alt={character.nameJa} className="object-cover object-center" />
            <AvatarFallback>{character.nameJa[0]}</AvatarFallback>
          </Avatar>
        )}

        <div className={cn(
          'flex flex-col gap-1',
          isUser ? 'items-end' : 'items-start',
          'max-w-[78%]'
        )}>
          {/* テキストバブル */}
          {message.content && (
            <div
              className={cn(
                'rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed',
                isUser
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : message.isLevelUp
                    ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 border border-pink-500/30 rounded-bl-md'
                    : 'bg-muted rounded-bl-md'
              )}
            >
              {message.isLevelUp && (
                <p className="text-[10px] font-semibold text-pink-400/80 mb-1 flex items-center gap-1">
                  <span>✨</span> Special Message
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">
                {cleanDisplayText(message.content)}
              </p>
            </div>
          )}

          {/* 画像（バブルとは別に表示） */}
          {message.image_url && (
            <div className="relative group/img">
              <div
                className="cursor-pointer overflow-hidden rounded-2xl"
                onClick={() => setViewerOpen(true)}
              >
                <img
                  src={message.image_url}
                  alt="Photo"
                  className="max-w-[240px] rounded-2xl object-cover transition-transform hover:scale-[1.02]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              {/* ハートボタン（画像hover時に表示） */}
              {onToggleFavorite && message.id !== 'streaming' && (
                <button
                  onClick={() => onToggleFavorite(message.id, message.is_favorite ?? false)}
                  className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-all hover:scale-110 active:scale-95"
                  aria-label={message.is_favorite ? 'お気に入りを解除' : 'お気に入りに追加'}
                >
                  <span className="text-base leading-none">
                    {message.is_favorite ? '❤️' : '🤍'}
                  </span>
                </button>
              )}
              {/* お気に入り済みの常時インジケーター */}
              {message.is_favorite && (
                <span className="absolute bottom-2 right-2 text-base leading-none pointer-events-none group-hover/img:opacity-0 transition-opacity">❤️</span>
              )}
            </div>
          )}

          {/* タイムスタンプ + 既読（グループの最後のメッセージのみ） */}
          {isLastInGroup && (
            <div className={cn(
              'flex items-center gap-1 px-1',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}>
              <span className="text-[10px] text-muted-foreground/40">
                {formatTime(message.created_at)}
              </span>
              {isUser && (
                <span className="text-[10px] text-blue-400/60">Read</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
