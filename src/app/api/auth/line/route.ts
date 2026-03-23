import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');

  // mode=link のとき → 既存ユーザーとLINEを連携するフロー
  const mode = request.nextUrl.searchParams.get('mode') || 'login';

  // stateとmodeをcookieに保存（CSRF対策）
  const cookieStore = await cookies();
  cookieStore.set('line_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10分
    path: '/',
  });
  cookieStore.set('line_oauth_mode', mode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINE_LOGIN_CHANNEL_ID!.trim(),
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL!.trim()}/api/auth/line/callback`,
    state,
    scope: 'profile openid email',
    nonce,
  });

  return NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  );
}
