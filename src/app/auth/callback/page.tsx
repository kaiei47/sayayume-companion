'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const next = searchParams.get('next') ?? '/';

    async function handleCallback() {
      // Case 1: URL hash tokens (LINE magic link → #access_token=...&refresh_token=...)
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const errorCode = params.get('error_code');
        const errorDesc = params.get('error_description');

        if (errorCode || errorDesc) {
          console.error('Auth hash error:', errorCode, errorDesc);
          router.replace('/login?error=auth_failed');
          return;
        }

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) {
            router.replace(next);
            return;
          }
          console.error('setSession error:', error);
          router.replace('/login?error=auth_failed');
          return;
        }
      }

      // Case 2: PKCE code exchange (Google OAuth / email OTP → ?code=...)
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
        console.error('exchangeCodeForSession error:', error);
        router.replace('/login?error=auth_failed');
        return;
      }

      // Supabase sometimes handles the session automatically via URL hash
      // Wait a tick and check if session is already set
      await new Promise((r) => setTimeout(r, 500));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(next);
        return;
      }

      router.replace('/login?error=auth_failed');
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        <p className="text-sm text-muted-foreground">ログイン中...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
