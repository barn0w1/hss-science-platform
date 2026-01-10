import { env } from '../config/env.js'

export type DiscordUser = {
  id: string
  username: string
  discriminator: string
  global_name: string | null
  avatar: string | null
  bot?: boolean
  system?: boolean
  mfa_enabled?: boolean
  banner?: string | null
  accent_color?: number | null
  locale?: string
  verified?: boolean
  email?: string | null
  flags?: number
  premium_type?: number
  public_flags?: number
}

export async function exchangeCodeForToken(code: string) {
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!tokenRes.ok) {
    throw new Error('Failed to fetch token')
  }

  return tokenRes.json()
}

export async function getDiscordUser(accessToken: string) {
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!userRes.ok) {
    throw new Error('Failed to fetch user')
  }

  return userRes.json()
}

export function getAuthUrl(state?: string) {
  const scope = encodeURIComponent('identify email')
  let url = `https://discord.com/api/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    env.DISCORD_REDIRECT_URI
  )}&response_type=code&scope=${scope}`
  
  if (state) {
      url += `&state=${encodeURIComponent(state)}`
  }
  return url
}
