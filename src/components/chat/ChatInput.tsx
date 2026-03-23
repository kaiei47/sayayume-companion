'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
  suggestions?: string[];
}

export default function ChatInput({ onSend, disabled, placeholder, suggestions }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI応答完了後に自動フォーカス
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    // テキストエリアの高さをリセット＆フォーカス維持
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中のEnterは無視（日本語入力の確定操作）
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="border-t border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      {/* 返信サジェストボタン */}
      {suggestions && suggestions.length > 0 && !disabled && (
        <div className="mx-auto max-w-2xl flex flex-wrap gap-2 mb-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSend(s)}
              className="text-sm px-3 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 hover:border-pink-500/50 transition-all active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="mx-auto max-w-2xl flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder || 'メッセージを入力...'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/30 disabled:opacity-50 transition-colors"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          size="icon"
          className="h-10 w-10 rounded-full flex-shrink-0 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 disabled:from-white/10 disabled:to-white/10 disabled:text-white/20 text-white transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
