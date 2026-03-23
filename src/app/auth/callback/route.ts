import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const next = searchParams.get('next') ?? '/chat/saya';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.trim();

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    // Google OAuth PKCE: サーバーサイドでコード交換（code_verifier cookieにアクセス可能）
    const redirectResponse = NextResponse.redirect(`${appUrl}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return redirectResponse;
    }
    console.error('exchangeCodeForSession error:', exchangeError.message);
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  return NextResponse.redirect(`${appUrl}/login?error=no_code`);
}
