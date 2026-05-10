import type { APIRoute } from 'astro';
import {
  clearStateCookie,
  getEnv,
  getSiteUrl,
  jsonResponse,
  readSession,
  readState,
  sessionCookie,
} from '../../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const env = getEnv(context);
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) {
    return jsonResponse(
      { error: 'Missing Twitch OAuth config. Add TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.' },
      { status: 500 },
    );
  }

  if (!code || !state || state !== readState(context.request, 'twitch')) {
    return jsonResponse({ error: 'Invalid Twitch OAuth callback.' }, { status: 400 });
  }

  const redirectUri = `${getSiteUrl(context.request, env)}/api/auth/twitch/callback`;
  const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return jsonResponse({ error: 'Twitch token exchange failed.' }, { status: 502 });
  }

  const token = await tokenResponse.json() as { access_token: string };
  const userResponse = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      authorization: `Bearer ${token.access_token}`,
      'client-id': env.TWITCH_CLIENT_ID,
    },
  });

  if (!userResponse.ok) {
    return jsonResponse({ error: 'Twitch profile fetch failed.' }, { status: 502 });
  }

  const userData = await userResponse.json() as { data?: Array<Record<string, unknown>> };
  const session = readSession(context.request);
  session.twitch = userData.data?.[0] ?? {};

  return new Response(null, {
    status: 302,
    headers: [
      ['location', '/account'],
      ['set-cookie', sessionCookie(session)],
      ['set-cookie', clearStateCookie('twitch')],
    ],
  });
};
