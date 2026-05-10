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

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    return jsonResponse(
      { error: 'Missing Discord OAuth config. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.' },
      { status: 500 },
    );
  }

  if (!code || !state || state !== readState(context.request, 'discord')) {
    return jsonResponse({ error: 'Invalid Discord OAuth callback.' }, { status: 400 });
  }

  const redirectUri = `${getSiteUrl(context.request, env)}/api/auth/discord/callback`;
  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return jsonResponse({ error: 'Discord token exchange failed.' }, { status: 502 });
  }

  const token = await tokenResponse.json() as { access_token: string };
  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: {
      authorization: `Bearer ${token.access_token}`,
    },
  });

  if (!userResponse.ok) {
    return jsonResponse({ error: 'Discord profile fetch failed.' }, { status: 502 });
  }

  const userData = await userResponse.json() as Record<string, unknown>;
  const session = readSession(context.request);
  session.discord = userData;

  return new Response(null, {
    status: 302,
    headers: [
      ['location', '/account'],
      ['set-cookie', sessionCookie(session)],
      ['set-cookie', clearStateCookie('discord')],
    ],
  });
};
