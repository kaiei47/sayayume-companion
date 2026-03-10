'use client';

import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CharacterConfig } from '@/lib/characters';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string | null;
  created_at: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  streamingContent: string;
  character: CharacterConfig;
  isLoading: boolean;
  isLoadingHistory?: boolean;
}

export default function ChatMessages({
  messages,
  streamingContent,
  character,
  isLoading,
  isLoadingHistory = false,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-3">
        {/* 履歴ロード中 */}
        {isLoadingHistory && (
          <div className="flex flex-col items-center justify-center py-12">
            <TypingDots />
            <p className="text-muted-foreground text-xs mt-2">会話履歴を読み込み中...</p>
          </div>
        )}

        {/* ウェルカムメッセージ */}
        {!isLoadingHistory && messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-5">
              <Avatar className="h-24 w-24 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarImage src={character.avatarUrl} alt={character.nameJa} />
                <AvatarFallback className="text-2xl">
                  {character.nameJa[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <h2 className="text-xl font-semibold mb-1">{character.nameJa}</h2>
            <p className="text-muted-foreground text-sm">{character.tagline}</p>
            <p className="text-muted-foreground/60 text-xs mt-6">
              メッセージを送って会話を始めよう
            </p>
          </div>
        )}

        {/* メッセージ一覧 */}
        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1];
          const isConsecutive = prevMsg && prevMsg.role === msg.role;
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              character={character}
              isConsecutive={isConsecutive}
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
          />
        )}

        {/* タイピングインジケータ */}
        {isLoading && !streamingContent && (
          <div className="flex items-end gap-2">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage src={character.avatarUrl} alt={character.nameJa} />
              <AvatarFallback>{character.nameJa[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <TypingDots />
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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

function MessageBubble({
  message,
  character,
  isConsecutive,
}: {
  message: ChatMessage;
  character: CharacterConfig;
  isConsecutive?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isConsecutive ? 'mt-0.5' : 'mt-3'
      )}
    >
      {/* アバター（連続メッセージなら非表示でスペース確保） */}
      {!isUser && (
        <Avatar className={cn('h-7 w-7 flex-shrink-0', isConsecutive && 'invisible')}>
          <AvatarImage src={character.avatarUrl} alt={character.nameJa} />
          <AvatarFallback>{character.nameJa[0]}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        'flex flex-col gap-0.5',
        isUser ? 'items-end' : 'items-start',
        'max-w-[78%]'
      )}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          {/* 画像があれば表示 */}
          {message.image_url && (
            <img
              src={message.image_url}
              alt="Generated"
              className="rounded-lg mb-2 max-w-full"
            />
          )}
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        {/* タイムスタンプ（連続メッセージ以外で表示） */}
        {!isConsecutive && (
          <span className="text-[10px] text-muted-foreground/40 px-1">
            {formatTime(message.created_at)}
          </span>
        )}
      </div>
    </div>
  );
}
