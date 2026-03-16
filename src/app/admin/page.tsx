'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['yoshihide.maruyama@gmail.com'];

interface RecentUser {
  display_name: string | null;
  email: string | null;
  is_premium: boolean;
  created_at: string;
}

interface SupportMsg {
  id: string;
  sender: 'user' | 'admin';
  message: string;
  read_at: string | null;
  created_at: string;
}

interface SupportThread {
  user_id: string;
  display_name: string | null;
  email: string | null;
  messages: SupportMsg[];
  unread_count: number;
  latest_at: string;
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  planCounts: Record<string, number>;
  totalConversations: number;
  totalMessages: number;
  messagesToday: number;
  mrrEstimate: number;
  recentUsers: RecentUser[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<string | null>(null);
  const threadBottomRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const router = useRouter();

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/support');
      if (!res.ok) return;
      const data = await res.json();
      setThreads(data.threads ?? []);
    } catch { /* ignore */ }
  }, []);

  const sendReply = async (userId: string) => {
    const message = replyInputs[userId]?.trim();
    if (!message || replySending) return;
    setReplySending(userId);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setReplyInputs(prev => ({ ...prev, [userId]: '' }));
      setThreads(prev => prev.map(t =>
        t.user_id === userId
          ? { ...t, messages: [...t.messages, data.message], unread_count: 0 }
          : t
      ));
      setTimeout(() => threadBottomRefs.current[userId]?.scrollIntoView({ behavior: 'smooth' }), 50);
    } finally {
      setReplySending(null);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403) {
        router.push('/');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data: AdminStats = await res.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Check if user is admin before fetching
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
        router.push('/');
        return;
      }
      fetchStats();
      fetchThreads();
    });
  }, [fetchStats, fetchThreads, router]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-red-400">Error: {error}</p>
          <button
            onClick={fetchStats}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              さやゆめ - Key Metrics
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {lastUpdated && (
              <p>
                Updated: {lastUpdated.toLocaleTimeString('ja-JP')}
              </p>
            )}
            <p className="opacity-60">Auto-refresh: 30s</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard label="Total Users" value={stats.totalUsers} />
          <MetricCard
            label="Active Subs"
            value={stats.activeSubscriptions}
          />
          <MetricCard
            label="MRR Estimate"
            value={`\u00a5${stats.mrrEstimate.toLocaleString()}`}
          />
          <MetricCard
            label="Conversations"
            value={stats.totalConversations}
          />
          <MetricCard label="Total Messages" value={stats.totalMessages} />
          <MetricCard
            label="Messages Today"
            value={stats.messagesToday}
            highlight
          />
        </div>

        {/* Subscription Breakdown */}
        {Object.keys(stats.planCounts).length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Subscriptions by Plan
            </h2>
            <div className="space-y-3">
              {Object.entries(stats.planCounts).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{plan}</span>
                  <span className="font-mono text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Signups */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Recent Signups
          </h2>
          {stats.recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentUsers.map((user, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {user.display_name || 'Anonymous'}
                      {user.is_premium && (
                        <span className="ml-2 text-xs text-yellow-400">
                          Premium
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email || 'No email'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(user.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Inbox */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Support Messages 💌
            </h2>
            <button onClick={fetchThreads} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              更新
            </button>
          </div>
          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">メッセージなし</p>
          ) : (
            <div className="space-y-3">
              {threads.map(thread => (
                <div key={thread.user_id} className="rounded-xl border border-border/40 overflow-hidden">
                  {/* スレッドヘッダー */}
                  <button
                    onClick={() => setOpenThreadId(v => v === thread.user_id ? null : thread.user_id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {thread.display_name || 'Anonymous'}
                        </p>
                        {thread.unread_count > 0 && (
                          <span className="flex-shrink-0 bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {thread.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{thread.email}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                        {thread.messages[thread.messages.length - 1]?.message}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-3 whitespace-nowrap">
                      {formatRelativeTime(thread.latest_at)}
                    </span>
                  </button>

                  {/* スレッド展開 */}
                  {openThreadId === thread.user_id && (
                    <div className="border-t border-border/30">
                      {/* メッセージ一覧 */}
                      <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-2 bg-background/30">
                        {thread.messages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                              msg.sender === 'user'
                                ? 'bg-card border border-border/40 rounded-bl-sm'
                                : 'bg-pink-500/20 rounded-br-sm'
                            }`}>
                              <p className="text-[10px] text-muted-foreground/60 mb-0.5">
                                {msg.sender === 'user' ? thread.display_name || 'User' : '運営'}
                                {' · '}{new Date(msg.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="leading-relaxed">{msg.message}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={el => { threadBottomRefs.current[thread.user_id] = el; }} />
                      </div>
                      {/* 返信フォーム */}
                      <div className="border-t border-border/20 p-3 flex gap-2">
                        <input
                          type="text"
                          value={replyInputs[thread.user_id] ?? ''}
                          onChange={e => setReplyInputs(prev => ({ ...prev, [thread.user_id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(thread.user_id); } }}
                          placeholder="返信を入力..."
                          className="flex-1 rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-500/30 placeholder:text-muted-foreground/40"
                        />
                        <button
                          onClick={() => sendReply(thread.user_id)}
                          disabled={!replyInputs[thread.user_id]?.trim() || replySending === thread.user_id}
                          className="rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold px-3 py-2 hover:bg-pink-500/20 disabled:opacity-40 transition-all whitespace-nowrap"
                        >
                          {replySending === thread.user_id ? '...' : '返信'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? 'border-blue-500/30 bg-blue-500/5'
          : 'border-border/50 bg-card/50'
      }`}
    >
      <p className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
