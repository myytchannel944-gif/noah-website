type RuntimeEnv = {
  TWITCH_CLIENT_ID?: string;
  TWITCH_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  PUBLIC_SITE_URL?: string;
};

export type AccountSession = {
  twitch?: Record<string, unknown>;
  discord?: Record<string, unknown>;
};

export function getEnv(AstroOrContext: { locals?: { runtime?: { env?: RuntimeEnv } } }) {
  return AstroOrContext.locals?.runtime?.env ?? {};
}

export function getSiteUrl(request: Request, env: RuntimeEnv) {
  return env.PUBLIC_SITE_URL || new URL(request.url).origin;
}

export function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

export function readSession(request: Request): AccountSession {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)account_session=([^;]+)/);

  if (!match) return {};

  try {
    return JSON.parse(decodeURIComponent(match[1])) as AccountSession;
  } catch {
    return {};
  }
}

export function sessionCookie(session: AccountSession) {
  return [
    `account_session=${encodeURIComponent(JSON.stringify(session))}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=2592000',
  ].join('; ');
}

export function stateCookie(provider: string, state: string) {
  return [
    `${provider}_oauth_state=${state}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=600',
  ].join('; ');
}

export function readState(request: Request, provider: string) {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${provider}_oauth_state=([^;]+)`));
  return match?.[1] ?? '';
}

export function clearStateCookie(provider: string) {
  return `${provider}_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
