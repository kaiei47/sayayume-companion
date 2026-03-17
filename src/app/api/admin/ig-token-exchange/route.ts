import { NextRequest } from 'next/server';
import { exchangeForLongLivedToken, refreshInstagramToken } from '@/lib/instagram';

/**
 * Admin endpoint to exchange short-lived IG token for long-lived (60-day) token.
 * Call this once after getting a new token from Meta Developer Portal.
 *
 * GET /api/admin/ig-token-exchange?action=exchange&token=SHORT_TOKEN
 * GET /api/admin/ig-token-exchange?action=refresh
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get('action') ?? 'refresh';

  if (action === 'exchange') {
    const shortToken = req.nextUrl.searchParams.get('token');
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    if (!shortToken || !clientId || !clientSecret) {
      return Response.json({
        error: 'Missing: token param, INSTAGRAM_CLIENT_ID, or INSTAGRAM_CLIENT_SECRET env var',
      }, { status: 400 });
    }

    const result = await exchangeForLongLivedToken(shortToken, clientId, clientSecret);
    if (!result) {
      return Response.json({ error: 'Token exchange failed' }, { status: 500 });
    }

    return Response.json({
      message: 'Long-lived token obtained! Set this as INSTAGRAM_ACCESS_TOKEN in Vercel env vars.',
      token: result.token,
      expires_in_seconds: result.expiresIn,
      expires_in_days: Math.floor(result.expiresIn / 86400),
    });
  }

  if (action === 'refresh') {
    const currentToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!currentToken) {
      return Response.json({ error: 'INSTAGRAM_ACCESS_TOKEN not set' }, { status: 400 });
    }

    const result = await refreshInstagramToken(currentToken);
    if (!result) {
      return Response.json({ error: 'Token refresh failed' }, { status: 500 });
    }

    return Response.json({
      message: 'Token refreshed! Update INSTAGRAM_ACCESS_TOKEN in Vercel env vars.',
      token: result.token,
      expires_in_seconds: result.expiresIn,
      expires_in_days: Math.floor(result.expiresIn / 86400),
    });
  }

  return Response.json({ error: 'Invalid action. Use: exchange or refresh' }, { status: 400 });
}
