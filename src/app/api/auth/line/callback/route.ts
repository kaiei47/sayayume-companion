import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

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
  const mode = cookieStore.get('line_oauth_mode')?.value || 'login';
  if (!state || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }
  cookieStore.delete('line_oauth_state');
  cookieStore.delete('line_oauth_mode');

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

  // --- mode=link: ログイン済みユーザーとLINEを連携するだけ ---
  if (mode === 'link') {
    // 現在のセッションからユーザーを取得
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const authClient = await createServerClient();
    const { data: { user: sessionUser } } = await authClient.auth.getUser();

    if (!sessionUser) {
      return NextResponse.redirect(`${appUrl}/settings?error=not_logged_in`);
    }

    // usersテーブルからdbUserIdを取得
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', sessionUser.id)
      .single();

    if (!dbUser) {
      return NextResponse.redirect(`${appUrl}/settings?error=user_not_found`);
    }

    // line_usersテーブルにupsert（連携登録）
    await supabaseAdmin
      .from('line_users')
      .upsert(
        { line_user_id: lineUserId, user_id: dbUser.id, display_name: displayName },
        { onConflict: 'line_user_id' }
      );

    return NextResponse.redirect(`${appUrl}/settings?line_linked=1`);
  }

  // 3. LINEユーザーID専用の仮メール
  const fakeEmail = `line_${lineUserId}@sayayume.com`;

  // 4. generateLink でユーザー作成＋magic linkトークン取得
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: fakeEmail,
    options: { redirectTo: `${appUrl}/` },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    console.error('generateLink error:', JSON.stringify(linkError));
    const encoded = encodeURIComponent(JSON.stringify(linkError).slice(0, 100));
    return NextResponse.redirect(`${appUrl}/login?error=session_failed&detail=${encoded}`);
  }

  // メタデータ更新
  if (linkData.user?.id) {
    await supabaseAdmin.auth.admin.updateUserById(linkData.user.id, {
      user_metadata: {
        ...linkData.user.user_metadata,
        line_user_id: lineUserId,
        display_name: displayName,
        avatar_url: pictureUrl,
        provider: 'line',
      },
    });
  }

  // 5. hashed_token を使ってサーバーサイドで verifyOtp → セッションCookieを直接セット
  // これによりクライアント側のコールバックが不要になる
  const redirectResponse = NextResponse.redirect(`${appUrl}/`);

  const supabaseSSR = createServerClient(
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

  const { error: verifyError } = await supabaseSSR.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });

  if (!verifyError) {
    // セッションCookieがセットされた状態でチャットへ直接リダイレクト
    return redirectResponse;
  }

  // verifyOtp失敗時は action_link へフォールバック
  console.error('verifyOtp error:', verifyError.message, '→ falling back to action_link');
  return NextResponse.redirect(linkData.properties.action_link);
}
