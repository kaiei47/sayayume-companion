import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');

  // stateをcookieに保存（CSRF対策）
  const cookieStore = await cookies();
  cookieStore.set('line_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10分
    path: '/',
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/callback`,
    state,
    scope: 'profile openid email',
    nonce,
  });

  return NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  );
}
