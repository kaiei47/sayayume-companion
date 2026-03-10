'use client';

import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <ScrollArea className="flex-1 px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* 履歴ロード中 */}
        {isLoadingHistory && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex gap-1">
              <span className="animate-bounce text-muted-foreground">●</span>
              <span className="animate-bounce text-muted-foreground [animation-delay:0.1s]">●</span>
              <span className="animate-bounce text-muted-foreground [animation-delay:0.2s]">●</span>
            </div>
            <p className="text-muted-foreground text-xs mt-2">会話履歴を読み込み中...</p>
          </div>
        )}

        {/* ウェルカムメッセージ */}
        {!isLoadingHistory && messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarImage src={character.avatarUrl} alt={character.nameJa} />
              <AvatarFallback className="text-2xl">
                {character.nameJa[0]}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold mb-1">{character.nameJa}</h2>
            <p className="text-muted-foreground text-sm">{character.tagline}</p>
            <p className="text-muted-foreground text-xs mt-4">
              メッセージを送って会話を始めよう♡
            </p>
          </div>
        )}

        {/* メッセージ一覧 */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            character={character}
          />
        ))}

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
          />
        )}

        {/* ローディング */}
        {isLoading && !streamingContent && (
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={character.avatarUrl} alt={character.nameJa} />
              <AvatarFallback>{character.nameJa[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="animate-bounce text-muted-foreground">●</span>
                <span className="animate-bounce text-muted-foreground [animation-delay:0.1s]">●</span>
                <span className="animate-bounce text-muted-foreground [animation-delay:0.2s]">●</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
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
}: {
  message: ChatMessage;
  character: CharacterConfig;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={character.avatarUrl} alt={character.nameJa} />
          <AvatarFallback>{character.nameJa[0]}</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted rounded-bl-sm'
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
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      {/* タイムスタンプ */}
      <span className={cn(
        'text-[10px] text-muted-foreground/50 mt-1 px-1',
        isUser ? 'text-right' : 'text-left'
      )}>
        {formatTime(message.created_at)}
      </span>
    </div>
  );
}
