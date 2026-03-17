/**
 * Twitter/X API utilities
 * Uses twitter-api-v2 for OAuth 1.0a authentication.
 * Flow: fetch image → upload media (v1.1) → post tweet (v2)
 */

import { TwitterApi } from 'twitter-api-v2';

function getTwitterClient(): TwitterApi | null {
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_KEY_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return null;
  }

  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
}

/**
 * Post an image to X (Twitter)
 * @param imageUrl  Public URL of the image (e.g. Supabase Storage public URL)
 * @param caption   Tweet text (max 280 chars)
 */
export async function postToTwitter(
  imageUrl: string,
  caption: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  const client = getTwitterClient();
  if (!client) {
    return { success: false, error: 'Twitter credentials not configured' };
  }

  try {
    // 1. Fetch image from Supabase Storage
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.includes('png') ? 'image/png' : 'image/jpeg';

    // 2. Upload media via v1.1 (v2 media upload not yet available)
    const mediaId = await client.v1.uploadMedia(imgBuffer, { mimeType });
    console.log(`Twitter media uploaded: ${mediaId}`);

    // 3. Post tweet with media
    const tweet = await client.v2.tweet({
      text: caption,
      media: { media_ids: [mediaId] },
    });

    console.log(`Twitter posted: ${tweet.data.id}`);
    return { success: true, tweetId: tweet.data.id };
  } catch (error) {
    console.error('Twitter post failed:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Build Japanese X caption with hashtags (matches IG caption style)
 */
export function buildTwitterCaption(baseCaption: string): string {
  return `${baseCaption}

💬 AIガールフレンドアプリ「さやゆめ」で話しかけてみて♡
👉 無料で始める → sayayume.com

#さやゆめ #AIガールフレンド #AI美女 #さや #ゆめ #AIgirlfriend #日本語AI`;
}
