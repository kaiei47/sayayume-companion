'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['yoshihide.maruyama@gmail.com'];

interface RecentUser {
  display_name: string | null;
  email: string | null;
  is_premium: boolean;
  created_at: string;
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
  const router = useRouter();

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
    });
  }, [fetchStats, router]);

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
