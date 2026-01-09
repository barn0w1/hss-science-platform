import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { db, users } from '@hss/database'
import { AuthService, COOKIE_NAME, COOKIE_OPTS } from '@hss/auth-sdk'
import { env } from '../config/env'
import { LoginPage } from '../views/pages/login'
import { exchangeCodeForToken, getAuthUrl, getDiscordUser } from '../lib/discord'

const app = new Hono()

// 1. ログイン画面
app.get('/login', (c) => {
  const error = c.req.query('error')
  return c.html(<LoginPage error={error} />)
})

// 2. Discordへリダイレクト
app.get('/discord', (c) => {
  return c.redirect(getAuthUrl())
})

// 3. Callback処理
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.redirect('/auth/login?error=No code provided')

  try {
    // A. Access Token取得
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: newData = await exchangeCodeForToken(code)

    // B. User Info取得
    const discordUser = await getDiscordUser(tokenData.access_token
    // 競合時は情報を更新する
    const [user] = await db.insert(users).values({
      discordId: discordUser.id,
      username: discordUser.username,
      email: discordUser.email,
      avatarUrl: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
    }).onConflictDoUpdate({
      target: users.discordId,
      set: {
        username: discordUser.username,
        email: discordUser.email,
        avatarUrl: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
        updatedAt: new Date()
      }
    }).returning()

    // D. Session作成 (Redis)
    const sessionId = await AuthService.createSession({
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
    })

    // E. Cookieセット
    setCookie(c, COOKIE_NAME, sessionId, COOKIE_OPTS)

    // F. Driveへリダイレクト (本番は環境変数から取得推奨)
    return c.redirect(env.DRIVE_URL)

  } catch (err) {
    console.error('Auth Error:', err)
    return c.redirect('/auth/login?error=Authentication failed')
  }
})

export default app