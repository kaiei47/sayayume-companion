/**
 * Instagram Graph API utilities
 * Uses Instagram Business Login API (ig_exchange_token flow)
 */

const IG_API_BASE = 'https://graph.instagram.com/v21.0';

/**
 * Post an image to Instagram
 * @returns postId on success, null on failure
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string,
  accessToken: string,
  igUserId: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  // Step 1: Create media container
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });

  const containerRes = await fetch(`${IG_API_BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: containerParams.toString(),
  });

  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}));
    console.error('IG container creation failed:', err);
    return { success: false, error: JSON.stringify(err) };
  }

  const { id: creationId } = await containerRes.json();
  console.log(`IG container created: ${creationId}`);

  // Wait for container to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 2: Publish container
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  const publishRes = await fetch(`${IG_API_BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishParams.toString(),
  });

  if (!publishRes.ok) {
    const err = await publishRes.json().catch(() => ({}));
    console.error('IG media publish failed:', err);
    return { success: false, error: JSON.stringify(err) };
  }

  const { id: postId } = await publishRes.json();
  console.log(`IG post published: ${postId}`);
  return { success: true, postId };
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 * Requires App Secret from Meta Developer Portal
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ token: string; expiresIn: number } | null> {
  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('access_token', shortLivedToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('IG token exchange failed:', err);
    return null;
  }

  const data = await res.json();
  return { token: data.access_token, expiresIn: data.expires_in };
}

/**
 * Refresh a long-lived token (can be called anytime within 60 days)
 * No App Secret needed
 */
export async function refreshInstagramToken(
  accessToken: string
): Promise<{ token: string; expiresIn: number } | null> {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error('IG token refresh failed');
    return null;
  }

  const data = await res.json();
  return { token: data.access_token, expiresIn: data.expires_in };
}

/**
 * Build Japanese IG caption with hashtags
 */
export function buildIgCaption(baseCaption: string): string {
  return `${baseCaption}

#さやゆめ #AIガールフレンド #AI美女 #さや #ゆめ
もっと話したい人はプロフのリンクから♡`;
}
