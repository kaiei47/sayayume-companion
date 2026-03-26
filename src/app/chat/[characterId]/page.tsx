'use client';

import { Suspense } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ChatMessages, { ChatMessage } from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import ExpPopup, { ExpEvent } from '@/components/chat/ExpPopup';
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

function ChatPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [streakToast, setStreakToast] = useState<string | null>(null);
  const [dailyMissions, setDailyMissions] = useState<Array<{ id: string; label: string; icon: string; points: number; completed: boolean }>>([]);
  const [showMissions, setShowMissions] = useState(false);
  const [expEvents, setExpEvents] = useState<ExpEvent[]>([]);
  const [levelCapped, setLevelCapped] = useState(false);
  const [gateStory, setGateStory] = useState<{ id: string; title: string } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lineLinked, setLineLinked] = useState<boolean | null>(null);
  const [typingDelay, setTypingDelay] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingToggles = useRef<Set<string>>(new Set());
  const pendingGreetingRef = useRef<string | null>(null); // greeting text to save as initial AI msg

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
      if (!user) {
        const isFromLine = searchParams.get('openExternalBrowser') === '1';
        if (isFromLine) {
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setIsGuest(true);
        return;
      }
      const { data: dbUser } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
      if (!dbUser) return;
      const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', dbUser.id).eq('status', 'active').single();
      if (sub) setUserPlan(sub.plan);

      // LINE連携チェック
      const { data: lineUser } = await supabase.from('line_users').select('id').eq('user_id', dbUser.id).maybeSingle();
      setLineLinked(!!lineUser);

      // 親密度 + ストリーク + デイリーミッション取得（localStorage即時復元 + API更新）
      try {
        // キャッシュから即座に復元（ちらつき防止）
        const cached = localStorage.getItem(`intimacy_${characterId}`);
        if (cached) {
          try {
            const c = JSON.parse(cached);
            if (c.level) setIntimacyLevel(c.level);
            if (c.progress !== undefined) setIntimacyProgress(c.progress);
            if (c.points !== undefined) setIntimacyPoints(c.points);
            if (c.pointsToNext !== undefined) setPointsToNext(c.pointsToNext);
            if (c.levelInfo) setIntimacyInfo(c.levelInfo);
          } catch { /* ignore parse errors */ }
        }

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
            // 次回ロード用にキャッシュ
            localStorage.setItem(`intimacy_${characterId}`, JSON.stringify({
              level: charIntimacy.level,
              progress: charIntimacy.progress,
              points: charIntimacy.points || 0,
              pointsToNext: charIntimacy.pointsToNext ?? 100,
              levelInfo: charIntimacy.levelInfo,
            }));
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
  const greetingInserted = useRef(false);
  useEffect(() => {
    if (!isLoadingHistory && !greetingInserted.current) {
      const greeting = searchParams.get('greeting');
      const greetingImageUrl = searchParams.get('image_url') ||
        (() => { try { const v = sessionStorage.getItem('pendingGreetingImageUrl'); sessionStorage.removeItem('pendingGreetingImageUrl'); return v; } catch { return null; } })();
      if (greeting) {
        greetingInserted.current = true;
        // 新規・既存どちらでも greeting を保存（返信時にAIへの文脈として渡す）
        pendingGreetingRef.current = greeting;
        setMessages(prev => {
          return [...prev, {
            id: `greeting-${Date.now()}`,
            role: 'assistant',
            content: greeting,
            image_url: greetingImageUrl || undefined,
            created_at: new Date().toISOString(),
          }];
        });
        const initialSuggestions = character.id === 'saya'
          ? ['やっほー！', '写真見せて♡', '今日何してたの？']
          : character.id === 'yume'
          ? ['こんにちは...', '好きな曲は？', '写真見せてほしいな']
          : ['ふたりとも！', 'どんなユニットなの？', '写真見せて♡'];
        setSuggestions(initialSuggestions);
      } else if (messages.length === 0) {
        // greetingなし・履歴なし（初回アクセス）でもサジェスト表示
        const initialSuggestions = character.id === 'saya'
          ? ['やっほー！', '写真見せて♡', '今日何してたの？']
          : character.id === 'yume'
          ? ['こんにちは...', '好きな曲は？', '写真見せてほしいな']
          : ['ふたりとも！', 'どんなユニットなの？', '写真見せて♡'];
        setSuggestions(initialSuggestions);
      }
    }
  }, [isLoadingHistory, searchParams, conversationId]);

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
      setSuggestions([]);
      // タイピング遅延演出（1〜3秒ランダム）
      const delay = 1000 + Math.random() * 2000;
      setTypingDelay(true);
      setTimeout(() => setTypingDelay(false), delay);

      try {
        // greeting があれば（新規・既存会話問わず）initial_assistant_message として渡す
        const initialMsg = pendingGreetingRef.current;
        if (initialMsg) pendingGreetingRef.current = null;

        // ゲストの場合: DBに履歴がないのでクライアント側のmessagesをそのまま送る（最新20件）
        const guestHistory = isGuest
          ? messages.slice(-20).map((m) => ({ role: m.role, content: m.content }))
          : undefined;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            character_id: characterId,
            message: content,
            ...(initialMsg ? { initial_assistant_message: initialMsg } : {}),
            ...(guestHistory ? { guest_history: guestHistory } : {}),
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
                  if (data.points !== undefined) setIntimacyPoints(data.points);
                  if (data.levelInfo) setIntimacyInfo(data.levelInfo);
                  // localStorage更新（次回ロード時のちらつき防止）
                  try {
                    localStorage.setItem(`intimacy_${characterId}`, JSON.stringify({
                      level: data.level,
                      progress: data.progress || 0,
                      points: data.points || 0,
                      pointsToNext: data.pointsToNext,
                      levelInfo: data.levelInfo,
                    }));
                  } catch { /* ignore */ }
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
                  // EXPポップアップ: events配列があればトリガー
                  if (data.events && Array.isArray(data.events) && data.events.length > 0) {
                    setExpEvents(data.events);
                    // 3秒後にクリア（次回用）
                    setTimeout(() => setExpEvents([]), 3000);
                  }
                  // レベルキャップ情報
                  if (data.levelCapped) {
                    setLevelCapped(true);
                    setGateStory(data.gateStory || null);
                  } else {
                    setLevelCapped(false);
                    setGateStory(null);
                  }
                  // デイリーミッション再フェッチ（達成状況を最新化）
                  fetch('/api/intimacy').then(r => r.json()).then(d => {
                    if (d.dailyMissions) setDailyMissions(d.dailyMissions);
                  }).catch(() => {});
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

                // ストリークイベント
                if (currentEvent === 'streak' && data.currentStreak) {
                  setStreak(data.currentStreak);
                  if (data.isFirstToday && data.reward) {
                    setStreakToast(`🔥 ${data.currentStreak}日連続！ ${data.reward}`);
                    setTimeout(() => setStreakToast(null), 4000);
                  }
                }

                // 返信サジェスト
                if (currentEvent === 'suggestions' && data.suggestions) {
                  setSuggestions(data.suggestions);
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

        // メモリ抽出: SSEストリーム外で独立実行（Vercel関数のライフサイクルに依存しない）
        if (conversationId) {
          fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: characterId, conversation_id: conversationId }),
          }).catch(() => {});
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
    <div className="flex h-dvh flex-col bg-gradient-to-b from-[#0a0a1a] to-[#0d0818]">
      {/* ヘッダー */}
      <header className="flex items-center gap-3 border-b border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3">
        <a href="/" className="text-white/40 hover:text-white/80 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
          </svg>
        </a>
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <img
              src={character.avatarUrl}
              alt={character.nameJa}
              className={`h-10 w-10 rounded-full object-cover ring-2 ${
                characterId === 'saya' ? 'ring-pink-500/60' : characterId === 'yume' ? 'ring-blue-400/60' : 'ring-purple-500/60'
              }`}
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#0a0a1a]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white">{character.nameJa}</h1>
              {intimacyInfo && (
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r ${intimacyInfo.color} text-white`}>
                  {intimacyInfo.emoji} Lv{intimacyLevel}
                </span>
              )}
            </div>
            {intimacyInfo && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[10px] text-white/30">{intimacyInfo.nameJa}</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${intimacyInfo.color} transition-all duration-700`}
                      style={{ width: `${intimacyProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-white/30">
                    {intimacyLevel < 5
                      ? `${pointsToNext}pt`
                      : `${intimacyPoints}pt`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* 絆ボタン（ストリーク + 絆の記録を開く） */}
        <button
          onClick={() => setShowMissions(!showMissions)}
          className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full hover:bg-orange-500/20 transition-colors border border-orange-500/20"
        >
          {streak > 0 ? `🔥${streak}` : '♡'}
        </button>
        {/* ゲスト・フリープランのバッジ */}
        {isGuest ? (
          <Link
            href="/login"
            className="text-[10px] font-medium bg-white/5 text-white/40 px-2 py-1 rounded-full hover:bg-white/10 transition-colors border border-white/10"
          >
            GUEST
          </Link>
        ) : userPlan === 'free' && (
          <Link
            href="/pricing"
            className="text-[10px] font-medium bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full hover:bg-blue-600/30 transition-colors border border-blue-500/20"
          >
            FREE
          </Link>
        )}
        {/* メニューボタン */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-white/40 hover:text-white/80 transition-colors rounded-full hover:bg-white/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-2xl border border-white/10 bg-[#0d0818]/95 backdrop-blur-xl shadow-2xl py-1 z-50 max-h-80 overflow-y-auto">
              <button
                onClick={startNewChat}
                className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2 border-b border-white/5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                </svg>
                New conversation
              </button>
              {conversationList.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] text-white/20 uppercase tracking-wider">
                    Previous chats
                  </div>
                  {conversationList.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors rounded-lg mx-1 ${
                        conv.id === conversationId ? 'bg-white/5 text-pink-400' : 'text-white/60'
                      }`}
                      style={{ width: 'calc(100% - 0.5rem)' }}
                    >
                      <p className="truncate text-xs">{conv.title || 'Untitled chat'}</p>
                      <p className="text-[10px] text-white/20 mt-0.5">
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

      {/* デイリーミッション + 絆の記録 */}
      {showMissions && (
        <div className="border-b border-white/5 bg-white/5 backdrop-blur-sm px-4 py-3 animate-in slide-in-from-top-2 duration-200">
          {dailyMissions.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Today&apos;s Missions</p>
                <p className="text-[10px] text-white/20">
                  {dailyMissions.filter(m => m.completed).length}/{dailyMissions.length}
                </p>
              </div>
              <div className="space-y-1.5 mb-3">
                {dailyMissions.map(mission => (
                  <div key={mission.id} className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${
                      mission.completed ? 'bg-green-500 text-white' : 'bg-white/5 border border-white/10'
                    }`}>
                      {mission.completed ? '✓' : ''}
                    </div>
                    <span className={`text-xs ${mission.completed ? 'line-through text-white/20' : 'text-white/60'}`}>
                      {mission.icon} {mission.label}
                    </span>
                    <span className="ml-auto text-[10px] text-white/20">+{mission.points}pt</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* 絆の記録 */}
          <div className={dailyMissions.length > 0 ? 'border-t border-white/5 pt-3' : ''}>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">絆の記録</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">連続ログイン</span>
                <span className="text-xs font-semibold text-orange-400">🔥 {streak}日</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">やり取り総数</span>
                <span className="text-xs font-semibold text-white/60">
                  💬 {conversationList.reduce((sum, c) => sum + c.message_count, 0)}通
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">会話の数</span>
                <span className="text-xs font-semibold text-white/60">
                  📖 {conversationList.length}回
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">絆レベル</span>
                <span className="text-xs font-semibold text-pink-400">
                  {intimacyInfo ? `${intimacyInfo.emoji} Lv${intimacyLevel} ${intimacyInfo.nameJa}` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* レベルアップ通知 — フルスクリーンオーバーレイ */}
      {levelUpNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-center animate-in zoom-in-95 duration-500">
            <p className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              LEVEL UP!
            </p>
            <p className="text-xl font-semibold text-white mb-1">
              Lv{levelUpNotice.from} → Lv{levelUpNotice.to}
            </p>
            <p className="text-lg text-white/70">
              「{levelUpNotice.nameJa}」
            </p>
            <p className="text-sm text-white/40 mt-2">
              新しい関係が始まる...
            </p>
          </div>
        </div>
      )}

      {/* ストリークトースト */}
      {streakToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300">
          <div className="bg-gradient-to-r from-orange-600/90 to-amber-600/90 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg border border-orange-400/30">
            {streakToast}
          </div>
        </div>
      )}

      {/* EXPポップアップ */}
      <ExpPopup events={expEvents} />

      {/* メッセージエリア */}
      <ChatMessages
        messages={messages}
        streamingContent={streamingContent}
        character={character}
        isLoading={isLoading}
        isLoadingHistory={isLoadingHistory}
        isGeneratingImage={isGeneratingImage}
        typingDelay={typingDelay}
        onToggleFavorite={toggleFavorite}
      />

      {/* レベルキャップゲート: ストーリークリアが必要 */}
      {levelCapped && gateStory && (
        <Link
          href="/story"
          className="border-t border-amber-500/20 bg-amber-500/5 backdrop-blur-sm px-4 py-3 flex items-center gap-3 hover:bg-amber-500/10 transition-all animate-pulse"
        >
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <span className="text-sm">⚡</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-amber-400">
              EXP MAX! ストーリーをクリアして次のレベルへ
            </p>
            <p className="text-[10px] text-white/30 truncate">
              「{gateStory.title}」
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="text-[11px] font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full">
              Play →
            </span>
          </div>
        </Link>
      )}

      {/* 秘密のロックUI: 次のレベルで解放されるストーリーヒント */}
      {messages.length > 0 && intimacyLevel < 5 && (() => {
        const secrets = CHARACTER_SECRETS[characterId] || [];
        const nextSecret = secrets.find(s => s.level === intimacyLevel + 1);
        if (!nextSecret) return null;
        return (
          <div className="border-t border-white/5 bg-white/[0.02] px-4 py-2 flex items-center gap-2">
            <span className="text-[10px] text-white/20 whitespace-nowrap flex-shrink-0">Next unlock</span>
            <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2.5 py-1 min-w-0 flex-1 border border-white/5">
              <span className="text-[11px] flex-shrink-0">🔒</span>
              <span className="text-[10px] text-white/20 blur-[2px] select-none truncate">
                {nextSecret.hint}
              </span>
              <span className="ml-auto text-[9px] bg-pink-500/15 text-pink-400/60 rounded-full px-1.5 py-0.5 flex-shrink-0">
                Lv{nextSecret.level}
              </span>
            </div>
          </div>
        );
      })()}

      {/* LINE連携促進バナー */}
      {!isGuest && lineLinked === false && messages.length >= 3 && (
        <a
          href="/api/auth/line?mode=link"
          className="border-t border-[#06C755]/20 bg-[#06C755]/5 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#06C755]/10 transition-all"
        >
          <div className="flex items-center gap-2 min-w-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#06C755" className="flex-shrink-0">
              <path d="M12 2C6.48 2 2 6.03 2 11c0 3.13 1.67 5.9 4.25 7.61V21l2.5-1.39c.73.2 1.5.3 2.25.3 5.52 0 10-4.03 10-9S17.52 2 12 2z"/>
            </svg>
            <p className="text-[11px] text-white/50 leading-tight">
              LINEと連携すると{character.nameJa}からメッセージが届く♡
            </p>
          </div>
          <span className="flex-shrink-0 text-[11px] font-bold text-white px-3 py-1.5 rounded-full" style={{ backgroundColor: '#06C755' }}>
            連携する →
          </span>
        </a>
      )}

      {/* ゲスト向け登録促進バナー */}
      {isGuest && messages.length >= 2 && (
        <div className="border-t border-white/5 bg-white/[0.02] backdrop-blur-sm px-4 py-2.5 flex items-center justify-between gap-3">
          {messages.length >= 5 ? (
            <p className="text-[11px] text-pink-300/70 leading-tight">
              この会話、消えちゃうよ？<br />
              <span className="text-[10px] text-white/30">登録すれば履歴保存 + 写真1日3枚 + ストーリー27本</span>
            </p>
          ) : (
            <p className="text-[11px] text-white/40 leading-tight">
              {character.nameJa}との会話を保存しておく？<br />
              <span className="text-[10px] text-white/20">無料・30秒・クレカ不要</span>
            </p>
          )}
          <Link
            href="/login?signup=1"
            className="flex-shrink-0 text-[11px] font-semibold bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            登録して続ける →
          </Link>
        </div>
      )}

      {/* 入力エリア */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={`${character.nameJa}にメッセージ...`}
        suggestions={suggestions}
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

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
