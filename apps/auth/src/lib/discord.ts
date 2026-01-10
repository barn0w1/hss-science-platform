import { env } from '@hss/config';

export const DISCORD_API = 'https://discord.com/api/v10';
export const REDIRECT_URI = env.HSS_DISCORD_REDIRECT_URI || 'http://auth.localhost/callback';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.HSS_DISCORD_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email',
    state,
  });
  return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<any> {
  const params = new URLSearchParams({
    client_id: env.HSS_DISCORD_CLIENT_ID!,
    client_secret: env.HSS_DISCORD_CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    throw new Error('Failed to exchange code');
  }

  return res.json();
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }

  return res.json();
}
