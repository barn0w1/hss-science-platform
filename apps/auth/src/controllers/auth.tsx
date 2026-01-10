import { Context } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { COOKIE_NAME, COOKIE_OPTS, SessionManager } from '@hss/session-sdk'

import { AUTH_COOKIES, AUTH_OPTS } from '../lib/constants.js'
import { getAuthUrl } from '../lib/discord.js'
import { validateRedirectUrl, getDefaultRedirectUrl } from '../lib/url.js'
import { parseUserAgent } from '../lib/ua.js'
import { authService } from '../services/auth.js'
import { LoginPage } from '../views/pages/login.js'

/**
 * Controller: Handles HTTP Request/Response flow exclusively.
 * Delegates business logic to AuthService and SessionManager.
 */

export const showLoginPage = (c: Context) => {
  const error = c.req.query('error')
  const redirectTo = c.req.query('redirect_to')
  const validRedirectTo = validateRedirectUrl(redirectTo)

  return c.html(<LoginPage error={error} redirectTo={validRedirectTo || undefined} />)
}

export const startDiscordAuth = (c: Context) => {
  const redirectTo = c.req.query('redirect_to')
  const validRedirectTo = validateRedirectUrl(redirectTo)

  // 1. CSRF Protection (State)
  const state = crypto.randomUUID();
  
  setCookie(c, AUTH_COOKIES.STATE, state, {
      httpOnly: true,
      secure: true, 
      sameSite: 'Lax',
      maxAge: AUTH_OPTS.STATE_TTL 
  });

  // 2. Persist Redirect Intent
  if (validRedirectTo) {
    setCookie(c, AUTH_COOKIES.REDIRECT_TO, validRedirectTo, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: AUTH_OPTS.STATE_TTL 
    })
  }

  return c.redirect(getAuthUrl(state))
}

export const handleDiscordCallback = async (c: Context) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const storedState = getCookie(c, AUTH_COOKIES.STATE);

    // 1. Security Checks
    if (!code || !state || state !== storedState) {
        return c.redirect('/auth/login?error=Invalid request or session expired');
    }

    // Clean up one-time state
    deleteCookie(c, AUTH_COOKIES.STATE);

    try {
        // 2. Extract Connection Metadata
        const uaStr = c.req.header('user-agent');
        const ua = parseUserAgent(uaStr);
        const ip = c.req.header('x-forwarded-for') || 'unknown';

        // 3. Delegate to Service (Business Logic)
        const user = await authService.login(code, {
            ip,
            deviceType: ua.deviceType,
            os: ua.os,
            browser: ua.browser,
            lastActiveAt: new Date().toISOString()
        });

        // 4. Session Creation (Infrastructure)
        const sessionId = await SessionManager.createSession({
            id: user.id,
            discordId: user.discordId,
            username: user.username,
            role: 'user', // Default role
            avatarUrl: user.avatarUrl,
            connection: {
                ip,
                deviceType: ua.deviceType,
                os: ua.os,
                browser: ua.browser,
                lastActiveAt: new Date().toISOString()
            }
        });
        
        // 5. Set Global Session Cookie
        setCookie(c, COOKIE_NAME, sessionId, COOKIE_OPTS);

        // 6. Redirect to Destination
        const returnTo = getCookie(c, AUTH_COOKIES.REDIRECT_TO);
        deleteCookie(c, AUTH_COOKIES.REDIRECT_TO);
        
        return c.redirect(validateRedirectUrl(returnTo) || getDefaultRedirectUrl());

    } catch (e) {
        console.error("[Auth] Login Failed:", e);
        return c.redirect('/auth/login?error=Authentication failed');
    }
}
