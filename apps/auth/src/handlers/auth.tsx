import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { db, users } from '@hss/database'
import { SessionManager, COOKIE_NAME, COOKIE_OPTS } from '@hss/session-sdk'
import { LoginPage } from '../views/pages/login.js'
import { exchangeCodeForToken, getAuthUrl, getDiscordUser, DiscordUser } from '../services/discord.js'
import { validateRedirectUrl, getDefaultRedirectUrl } from '../utils/url.js'
import { parseUserAgent } from '../utils/ua.js'

const app = new Hono()

const REDIRECT_COOKIE_NAME = 'auth_return_to'

// 1. ログイン画面
// ?redirect_to=URL を受け取る
app.get('/login', (c) => {
  const error = c.req.query('error')
  const redirectTo = c.req.query('redirect_to')
  
  // URLの検証 (無効な場合はnullになり、UIに反映されない = デフォルト遷移)
  const validRedirectTo = validateRedirectUrl(redirectTo)

  return c.html(<LoginPage error={error} redirectTo={validRedirectTo || undefined} />)
})

// 2. Discordへリダイレクト
// ?redirect_to=URL を受け取り、Cookieに保存してからDiscordへ
app.get('/discord', (c) => {
  const redirectTo = c.req.query('redirect_to')
  const validRedirectTo = validateRedirectUrl(redirectTo)

  if (validRedirectTo) {
    setCookie(c, REDIRECT_COOKIE_NAME, validRedirectTo, {
      httpOnly: true,
      secure: true, // 本番環境ではtrue推奨。ローカル開発でhttpsでない場合は注意が必要だが、Honoのsecureオプションは自動ではないので明示的に
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 10, // 10分間有効
    })
  } else {
      // 一応消しておく
      deleteCookie(c, REDIRECT_COOKIE_NAME)
  }

  return c.redirect(getAuthUrl())
})

// 3. Callback処理
// Discordからの戻りを受け、Cookieがあればそこへリダイレクト
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  
  // エラー時のリダイレクト先も、本来はcontextを維持したいが、エラーなので一旦ログインに戻す
  if (!code) return c.redirect('/auth/login?error=No code provided')

  try {
    // A. Access Token取得
    const tokenData = await exchangeCodeForToken(code)

    // B. User Info取得
    const discordUser = await getDiscordUser(tokenData.access_token) as DiscordUser

    // C. DB保存 (Upsert)
    // 競合時は情報を更新する
    const [user] = await db.insert(users).values({
      discordId: discordUser.id,
      username: discordUser.username,
      email: discordUser.email,
      avatarUrl: discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
    }).onConflictDoUpdate({
      target: users.discordId,
      set: {
        username: discordUser.username,
        email: discordUser.email,
        avatarUrl: discordUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
        updatedAt: new Date()
      }
    }).returning()

    const uaString = c.req.header('user-agent');
    const ua = parseUserAgent(uaString);
    const ip = c.req.header('x-forwarded-for') || 'unknown';

    // D. Session作成 (Redis)
    const sessionId = await SessionManager.createSession({
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      connection: {
        ip: ip,
        deviceType: ua.deviceType,
        os: ua.os,
        browser: ua.browser,
        lastActiveAt: new Date().toISOString(),
      }
    })

    // E. Cookieセット (セッションID)
    setCookie(c, COOKIE_NAME, sessionId, COOKIE_OPTS)

    // F. 元の場所へリダイレクト
    const returnTo = getCookie(c, REDIRECT_COOKIE_NAME)
    deleteCookie(c, REDIRECT_COOKIE_NAME) // 使い終わったら消す

    // Cookieから取得したURLを再度検証
    const validReturnTo = validateRedirectUrl(returnTo)
    
    return c.redirect(validReturnTo || getDefaultRedirectUrl())

  } catch (err) {
    console.error('Auth Error:', err)
    return c.redirect('/auth/login?error=Authentication failed')
  }
})

export default app
