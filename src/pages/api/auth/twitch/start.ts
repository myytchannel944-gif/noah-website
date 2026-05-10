import type { APIRoute } from 'astro';
import { getEnv, getSiteUrl, jsonResponse, stateCookie } from '../../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = (context) => {
  const env = getEnv(context);

  if (!env.TWITCH_CLIENT_ID) {
    return jsonResponse(
      { error: 'Missing TWITCH_CLIENT_ID. Add it in Cloudflare Pages environment variables.' },
      { status: 500 },
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${getSiteUrl(context.request, env)}/api/auth/twitch/callback`;
  const authorizeUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authorizeUrl.searchParams.set('client_id', env.TWITCH_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'user:read:email');
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorizeUrl.toString(),
      'set-cookie': stateCookie('twitch', state),
    },
  });
};
