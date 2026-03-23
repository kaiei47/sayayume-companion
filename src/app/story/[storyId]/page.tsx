'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getStory } from '@/lib/stories';
import type { Story, StoryMission } from '@/lib/stories';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MissionStatus {
  id: string;
  description: string;
  hint: string;
  completed: boolean;
}

export default function StoryPlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storyId = params.storyId as string;
  const sessionId = searchParams.get('session');

  const [story, setStory] = useState<Story | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [missions, setMissions] = useState<MissionStatus[]>([]);
  const [showMissions, setShowMissions] = useState(false);
  const [storyCompleted, setStoryCompleted] = useState(false);
  const [completionTitle, setCompletionTitle] = useState<string | null>(null);
  const [newMissionCompleted, setNewMissionCompleted] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ストーリーデータ読み込み
  useEffect(() => {
    const s = getStory(storyId);
    if (s) {
      setStory(s);
      setMissions(s.missions.map(m => ({
        id: m.id,
        description: m.description,
        hint: m.hint,
        completed: false,
      })));
    }
  }, [storyId]);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ミッション達成アニメーション消去
  useEffect(() => {
    if (newMissionCompleted) {
      const timer = setTimeout(() => setNewMissionCompleted(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [newMissionCompleted]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/story/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
        }),
      });

      if (!res.ok) throw new Error('Chat failed');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue;
          }
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '{}') continue;
            try {
              const data = JSON.parse(jsonStr);

              // トークンストリーミング
              if (data.text !== undefined) {
                assistantText += data.text;
                // [IMAGE:...]タグを除去（ストーリーモードでは画像生成しない）
                const cleanText = assistantText.replace(/\[IMAGE:[^\]]*\]/g, '').trim();
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: cleanText };
                  return updated;
                });
              }

              // ミッション達成
              if (data.completed && Array.isArray(data.completed)) {
                setMissions(prev => prev.map(m => ({
                  ...m,
                  completed: m.completed || data.completed.includes(m.id),
                })));

                // 最後に達成されたミッションの名前を取得してアニメーション表示
                const lastCompleted = data.completed[data.completed.length - 1];
                const missionName = story?.missions.find(m => m.id === lastCompleted)?.description;
                if (missionName) {
                  setNewMissionCompleted(missionName);
                }

                // ストーリー完了
                if (data.allMissionsCleared) {
                  setStoryCompleted(true);
                  setCompletionTitle(data.storyTitle || null);
                }
              }
            } catch {
              // parse error, skip
            }
          }
        }
      }
    } catch (err) {
      console.error('Story chat error:', err);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, sessionId, story]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!story) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-white/30 text-sm">Story not found</div>
      </div>
    );
  }

  const completedCount = missions.filter(m => m.completed).length;
  const progressPercent = (completedCount / story.missions.length) * 100;
  const charGradient = story.character === 'saya'
    ? 'from-pink-500 to-rose-400'
    : story.character === 'yume'
      ? 'from-purple-500 to-violet-400'
      : 'from-amber-400 to-orange-400';
  const charAccent = story.character === 'saya'
    ? 'text-pink-400'
    : story.character === 'yume'
      ? 'text-purple-400'
      : 'text-amber-400';

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 pt-2.5 pb-1">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/story"
              className="flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back</span>
            </Link>

            <div className="text-center flex-1 mx-4">
              <div className="text-sm font-bold truncate">{story.title}</div>
            </div>

            <button
              onClick={() => setShowMissions(!showMissions)}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-all duration-300 ${
                showMissions
                  ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/20'
                  : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-[12px] font-medium">{completedCount}/{story.missions.length}</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${charGradient} transition-all duration-700 ease-out`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Mission Panel - Slide down */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          showMissions ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#0a0a1a]/95 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-lg mx-auto px-4 py-3 space-y-1.5">
            <div className="text-[10px] text-white/20 font-medium tracking-widest uppercase mb-2">Missions</div>
            {missions.map(m => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 py-2 px-3 rounded-xl transition-all duration-300 ${
                  m.completed
                    ? 'bg-emerald-500/[0.08] border border-emerald-500/10'
                    : 'bg-white/[0.02] border border-white/[0.04]'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 ${
                  m.completed
                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                    : 'border-2 border-white/15'
                }`}>
                  {m.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${m.completed ? 'text-emerald-400 line-through' : 'text-white/70'}`}>
                    {m.description}
                  </span>
                  {!m.completed && (
                    <div className="text-[11px] text-white/20 mt-0.5 flex items-center gap-1">
                      <span>💡</span>
                      <span>{m.hint}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Story start screen */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              {story.coverImage ? (
                <>
                  <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl shadow-pink-500/10">
                    <Image src={story.coverImage} alt={story.title} width={800} height={500} className="w-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h2 className="text-white font-bold text-lg">{story.title}</h2>
                      <p className="text-white/60 text-xs mt-1">{story.description}</p>
                    </div>
                  </div>
                  <p className="text-white/30 text-xs mt-4">メッセージを送ってストーリーを始めよう</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-4">
                    <span className="text-3xl">📖</span>
                  </div>
                  <h2 className="text-lg font-bold mb-1.5">{story.title}</h2>
                  <p className="text-sm text-white/35 text-center mb-6 max-w-[280px] leading-relaxed">{story.description}</p>
                  <div className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[12px] text-white/25">
                    Send a message to start the story
                  </div>
                </>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                  msg.role === 'user'
                    ? `bg-gradient-to-br ${charGradient} text-white rounded-br-md shadow-lg shadow-pink-500/10`
                    : 'bg-white/[0.05] text-white/85 rounded-bl-md border border-white/[0.06]'
                }`}
              >
                {msg.content || (
                  <span className="inline-flex gap-1 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </span>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Mission Complete Toast */}
      {newMissionCompleted && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
          <div className="animate-mission-toast bg-[#0a0a1a]/90 backdrop-blur-xl border border-emerald-500/20 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">Mission Complete</div>
              <div className="text-sm font-bold">{newMissionCompleted}</div>
            </div>
          </div>
        </div>
      )}

      {/* Story Completion Modal */}
      {storyCompleted && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          {/* Confetti particles (CSS) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-confetti"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  backgroundColor: ['#ec4899', '#a855f7', '#f59e0b', '#10b981', '#3b82f6'][i % 5],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1.5 + Math.random()}s`,
                }}
              />
            ))}
          </div>

          <div className="relative bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] rounded-3xl p-8 max-w-sm w-full text-center space-y-5">
            {/* Glow effect */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-pink-500/20 via-transparent to-purple-500/20 -z-10 blur-sm" />

            <div className="text-5xl animate-bounce">🎉</div>

            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Story Clear!
            </h2>

            <p className="text-white/50 text-sm">{story.title}</p>

            {completionTitle && (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-400">🏆</span>
                <span className="text-amber-300 text-sm font-medium">「{completionTitle}」</span>
              </div>
            )}

            <div className={`text-lg font-bold ${charAccent} animate-pulse`}>
              +{story.completionReward.intimacy} EXP
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/story"
                className="py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all text-center"
              >
                Back to Stories
              </Link>
              <Link
                href={`/chat/${story.character === 'duo' ? 'saya' : story.character}`}
                className={`py-3 rounded-xl bg-gradient-to-r ${charGradient} text-sm font-bold text-white hover:opacity-90 hover:shadow-lg hover:shadow-pink-500/20 transition-all text-center`}
              >
                Continue Chatting
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 bg-[#0a0a1a]/80 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={storyCompleted ? 'Story completed' : 'Type a message...'}
            disabled={isStreaming || storyCompleted}
            rows={1}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-base text-white placeholder-white/20 resize-none focus:outline-none focus:border-pink-500/30 focus:bg-white/[0.06] disabled:opacity-40 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || storyCompleted}
            className={`px-4 py-2.5 rounded-xl bg-gradient-to-r ${charGradient} text-sm font-bold text-white disabled:opacity-20 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-pink-500/20`}
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes mission-toast {
          0% { transform: translateY(-20px); opacity: 0; }
          15% { transform: translateY(0); opacity: 1; }
          85% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        .animate-mission-toast {
          animation: mission-toast 3s ease-in-out forwards;
        }
        @keyframes confetti {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 2s ease-in forwards;
        }
      `}</style>
    </div>
  );
}
