'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import SayayumeLogo from '@/components/SayayumeLogo';
import type { Story } from '@/lib/stories';

interface StoryWithStatus extends Story {
  isLocked: boolean;
  lockReason: 'plan' | 'intimacy' | null;
  currentIntimacyLevel: number;
  session: {
    id: string;
    status: string;
    completedMissions: string[];
    totalMissions: number;
  } | null;
  isCompleted: boolean;
}

interface StoryData {
  stories: StoryWithStatus[];
  plan: string;
  intimacy: { saya: number; yume: number };
}

export default function StorySelectPage() {
  const [data, setData] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'saya' | 'yume' | 'duo'>('all');
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/story/sessions')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const startStory = async (storyId: string) => {
    setStarting(storyId);
    try {
      const res = await fetch('/api/story/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: storyId }),
      });
      const { session } = await res.json();
      if (session) {
        window.location.href = `/story/${storyId}?session=${session.id}`;
      }
    } catch (err) {
      console.error('Failed to start story:', err);
      setStarting(null);
    }
  };

  const continueStory = (storyId: string, sessionId: string) => {
    window.location.href = `/story/${storyId}?session=${sessionId}`;
  };

  const filtered = data?.stories?.filter(s =>
    filter === 'all' || s.character === filter
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          <div className="text-white/30 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl">📖</span>
          <h1 className="text-lg font-bold tracking-wide">Stories</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-28">
        {/* Intimacy Bars - Compact */}
        {data?.intimacy && (
          <div className="flex gap-3 mb-5">
            {/* Saya */}
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                S
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/50">Saya</span>
                  <span className="text-[11px] font-bold text-pink-400">Lv.{data.intimacy.saya}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-700"
                    style={{ width: `${Math.min(data.intimacy.saya * 20, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            {/* Yume */}
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-violet-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                Y
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/50">Yume</span>
                  <span className="text-[11px] font-bold text-purple-400">Lv.{data.intimacy.yume}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-400 transition-all duration-700"
                    style={{ width: `${Math.min(data.intimacy.yume * 20, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all', label: 'All' },
            { key: 'saya', label: 'Saya' },
            { key: 'yume', label: 'Yume' },
            { key: 'duo', label: 'Both' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                filter === f.key
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/20'
                  : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60 border border-white/[0.06]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Story Cards */}
        <div className="space-y-3">
          {filtered.map(story => (
            <StoryCard
              key={story.id}
              story={story}
              starting={starting === story.id}
              onStart={() => startStory(story.id)}
              onContinue={() => story.session && continueStory(story.id, story.session.id)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-white/30 py-16">
            <div className="text-4xl mb-3 opacity-50">📖</div>
            <p className="text-sm">No stories available</p>
          </div>
        )}
      </main>

      {/* Bottom Nav - Glassmorphism */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a1a]/70 backdrop-blur-2xl border-t border-white/[0.06]">
        <div className="max-w-lg mx-auto flex justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {[
            { href: '/', icon: '🏠', label: 'Home', active: false },
            { href: '/chat/saya', icon: '💬', label: 'Chat', active: false },
            { href: '/story', icon: '📖', label: 'Story', active: true },
            { href: '/settings', icon: '⚙️', label: 'Settings', active: false },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all duration-300 ${
                item.active
                  ? 'text-pink-400'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className={`text-[10px] font-medium ${item.active ? 'text-pink-400' : ''}`}>
                {item.label}
              </span>
              {item.active && (
                <div className="absolute -bottom-0 w-6 h-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function StoryCard({
  story,
  starting,
  onStart,
  onContinue,
}: {
  story: StoryWithStatus;
  starting: boolean;
  onStart: () => void;
  onContinue: () => void;
}) {
  const difficultyStars = '★'.repeat(story.difficulty) + '☆'.repeat(3 - story.difficulty);
  const charLabel = story.character === 'saya' ? 'Saya' : story.character === 'yume' ? 'Yume' : 'Saya × Yume';
  const charGradient = story.character === 'saya'
    ? 'from-pink-500 to-rose-400'
    : story.character === 'yume'
      ? 'from-purple-500 to-violet-400'
      : 'from-amber-400 to-orange-400';
  const charBadgeBg = story.character === 'saya'
    ? 'bg-pink-500/15 text-pink-400 border-pink-500/20'
    : story.character === 'yume'
      ? 'bg-purple-500/15 text-purple-400 border-purple-500/20'
      : 'bg-amber-500/15 text-amber-400 border-amber-500/20';

  const hasImage = story.thumbnail.startsWith('/');
  const isInProgress = story.session?.status === 'in_progress';

  return (
    <div
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        story.isLocked
          ? 'border-white/[0.04] bg-white/[0.015] opacity-50'
          : story.isCompleted
            ? 'border-emerald-500/15 bg-white/[0.03] hover:border-emerald-500/25'
            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.04]'
      }`}
    >
      {/* Horizontal layout: Image left + Content right */}
      <div className="flex">
        {/* Thumbnail */}
        {hasImage && (
          <div className="relative w-[38%] min-h-[140px] flex-shrink-0">
            <Image
              src={story.thumbnail}
              alt={story.title}
              fill
              className={`object-cover transition-all duration-500 ${
                story.isLocked ? 'grayscale blur-[2px]' : 'group-hover:scale-105'
              }`}
              sizes="(max-width: 640px) 38vw, 200px"
            />
            {/* Gradient overlay for blending */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0a1a]/90" />

            {/* Lock overlay */}
            {story.isLocked && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Completed badge on image */}
            {story.isCompleted && (
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-sm text-[10px] font-bold text-white flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Clear
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
          {/* Top: Title + Meta */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="font-bold text-[15px] leading-snug truncate">{story.title}</h3>
              <span className="text-xs text-amber-400/80 flex-shrink-0 tracking-wider">{difficultyStars}</span>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${charBadgeBg}`}>
                {charLabel}
              </span>
              <span className="text-[10px] text-white/25">•</span>
              <span className="text-[10px] text-white/30">{story.playTime} min</span>
            </div>

            <p className="text-[12px] text-white/40 leading-relaxed line-clamp-2">{story.description}</p>
          </div>

          {/* Mission Progress (if in progress) */}
          {isInProgress && story.session && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/30 font-medium tracking-wide">MISSIONS</span>
                <span className="text-[10px] font-bold text-pink-400">
                  {story.session.completedMissions.length}/{story.session.totalMissions}
                </span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${charGradient} transition-all duration-500`}
                  style={{
                    width: `${(story.session.completedMissions.length / story.session.totalMissions) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-3">
            {story.isLocked ? (
              <div className="text-[11px] text-white/20 py-1.5">
                {story.lockReason === 'plan'
                  ? 'Requires Basic plan or higher'
                  : `Requires Intimacy Lv${story.requiredIntimacy}`}
              </div>
            ) : isInProgress ? (
              <div className="flex gap-2">
                <button
                  onClick={onContinue}
                  className={`flex-1 py-2 rounded-xl bg-gradient-to-r ${charGradient} text-[13px] font-bold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-pink-500/20`}
                >
                  Continue
                </button>
                <button
                  onClick={onStart}
                  disabled={starting}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/40 hover:bg-white/[0.08] hover:text-white/60 transition-all"
                >
                  Restart
                </button>
              </div>
            ) : (
              <button
                onClick={onStart}
                disabled={starting}
                className={`w-full py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                  story.isCompleted
                    ? 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                    : `bg-gradient-to-r ${charGradient} text-white hover:opacity-90 hover:shadow-lg hover:shadow-pink-500/20`
                }`}
              >
                {starting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : story.isCompleted ? 'Play Again' : 'Start'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
