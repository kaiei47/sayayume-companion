import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.trim();

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?error=line_auth_failed`);
  }

  // CSRF state検証
  const cookieStore = await cookies();
  const savedState = cookieStore.get('line_oauth_state')?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }
  cookieStore.delete('line_oauth_state');

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=no_code`);
  }

  // 1. LINEトークン取得
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/api/auth/line/callback`,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!.trim(),
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!.trim(),
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // 2. LINEプロフィール取得
  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=profile_fetch_failed`);
  }

  const profile = await profileRes.json();
  const lineUserId = profile.userId;
  const displayName = profile.displayName;
  const pictureUrl = profile.pictureUrl;

  // 3. emailはLINEでは取得が難しいので仮メールを使用
  const fakeEmail = `line_${lineUserId}@line.local`;

  // 4. Supabaseで既存ユーザー検索またはユーザー作成
  // まず新規作成を試みる。既存ならエラーが返るのでその後に更新処理
  let userId: string;

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: fakeEmail,
    email_confirm: true,
    user_metadata: {
      line_user_id: lineUserId,
      display_name: displayName,
      avatar_url: pictureUrl,
      provider: 'line',
    },
  });

  if (!createError && newUser.user) {
    // 新規ユーザー作成成功
    userId = newUser.user.id;
  } else {
    // 既存ユーザー検索（fakeEmailで絞り込み）
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = listData?.users?.find((u) => u.email === fakeEmail);
    if (!existingUser) {
      return NextResponse.redirect(`${appUrl}/login?error=user_creation_failed`);
    }
    userId = existingUser.id;
    // プロフィール更新
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingUser.user_metadata,
        display_name: displayName,
        avatar_url: pictureUrl,
      },
    });
  }

  // 5. magic link生成 → action_linkを直接使ってリダイレクト
  const authCallbackUrl = `${appUrl}/auth/callback?next=/chat/saya`;
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: fakeEmail,
    options: { redirectTo: authCallbackUrl },
  });

  if (linkError || !linkData.properties?.action_link) {
    return NextResponse.redirect(`${appUrl}/login?error=session_failed`);
  }

  // action_linkにはSupabaseが正しく生成したverify URLが入っている
  return NextResponse.redirect(linkData.properties.action_link);
}
