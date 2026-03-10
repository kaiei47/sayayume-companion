'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChatMessages, { ChatMessage } from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { CHARACTERS } from '@/lib/characters';
import { CharacterId } from '@/types/database';

export default function ChatPage() {
  const params = useParams();
  const characterId = params.characterId as CharacterId;
  const character = CHARACTERS[characterId];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // 会話履歴をロード
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/conversations?character_id=${characterId}`);
        if (res.ok) {
          const data = await res.json();
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
          }
        }
      } catch {
        // 履歴ロード失敗は無視（ゲストの場合など）
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, [characterId]);

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
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              // イベントタイプを取得
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

                if (data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                }
              } catch {
                // パースエラーは無視
              }
            }
          }
        }

        // ストリーミング完了 → メッセージリストに追加
        if (accumulated) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: accumulated,
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
      }
    },
    [isLoading, conversationId, characterId]
  );

  if (!character) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>キャラクターが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ヘッダー */}
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <a href="/" className="text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
          </svg>
        </a>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
              {character.nameJa[0]}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">{character.nameJa}</h1>
            <p className="text-xs text-muted-foreground">オンライン</p>
          </div>
        </div>
      </header>

      {/* メッセージエリア */}
      <ChatMessages
        messages={messages}
        streamingContent={streamingContent}
        character={character}
        isLoading={isLoading}
        isLoadingHistory={isLoadingHistory}
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
