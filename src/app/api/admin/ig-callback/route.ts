import { NextRequest } from 'next/server';

/**
 * Instagram Business Login OAuth callback handler.
 * After user authorizes the app, IG redirects here with ?code=XXX
 * This handler exchanges the code for a short-lived token and immediately
 * exchanges that for a long-lived (60-day) token.
 *
 * Redirect URI to register in Meta app:
 *   https://sayayume.com/api/admin/ig-callback
 */

const IG_APP_ID = '1269427675137768';
const IG_REDIRECT_URI = 'https://sayayume.com/api/admin/ig-callback';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return new Response(`<html><body><h1>OAuth Error</h1><p>${error}: ${req.nextUrl.searchParams.get('error_description')}</p></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code) {
    return new Response('<html><body><h1>No code received</h1></body></html>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  if (!clientSecret) {
    return new Response('<html><body><h1>INSTAGRAM_CLIENT_SECRET not set</h1></body></html>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Step 1: Exchange auth code → short-lived token
  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: IG_APP_ID,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: IG_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    return new Response(`<html><body><h1>Token Exchange Failed</h1><pre>${JSON.stringify(err, null, 2)}</pre></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const { access_token: shortToken, user_id } = await tokenRes.json();

  // Step 2: Exchange short-lived → long-lived (60-day) token
  const longUrl = new URL('https://graph.instagram.com/access_token');
  longUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longUrl.searchParams.set('client_id', IG_APP_ID);
  longUrl.searchParams.set('client_secret', clientSecret);
  longUrl.searchParams.set('access_token', shortToken);

  const longRes = await fetch(longUrl.toString());
  if (!longRes.ok) {
    const err = await longRes.json().catch(() => ({}));
    return new Response(`<html><body>
      <h1>Short-lived token (exchange to long-lived failed)</h1>
      <p><b>user_id:</b> ${user_id}</p>
      <p><b>Short token:</b> ${shortToken}</p>
      <p><b>Error:</b> <pre>${JSON.stringify(err, null, 2)}</pre></p>
      <p>Set INSTAGRAM_ACCESS_TOKEN to the short token above (expires in ~60 min)</p>
    </body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const { access_token: longToken, expires_in } = await longRes.json();
  const expiryDays = Math.floor(expires_in / 86400);

  return new Response(`<html><body style="font-family:monospace;padding:20px;background:#0f0;color:#000">
    <h1>✅ Long-lived token obtained!</h1>
    <p><b>user_id:</b> ${user_id}</p>
    <p><b>Expires:</b> ${expiryDays} days</p>
    <hr/>
    <h2>Set these in Vercel env vars:</h2>
    <p><b>INSTAGRAM_ACCESS_TOKEN:</b></p>
    <textarea rows="4" cols="80" onclick="this.select()">${longToken}</textarea>
    <br/><br/>
    <p>Then redeploy Vercel for the token to take effect.</p>
    <p>Next refresh: before 60 days, call /api/admin/ig-token-exchange?action=refresh</p>
  </body></html>`, {
    headers: { 'Content-Type': 'text/html' },
  });
}
