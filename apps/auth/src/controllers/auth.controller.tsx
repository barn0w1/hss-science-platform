import { Context } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { COOKIE_NAME, COOKIE_OPTS } from '@hss/session-sdk'
import { LoginPage } from '../views/pages/login.js'
import { validateRedirectUrl, getDefaultRedirectUrl } from '../utils/url.js'
import { parseUserAgent } from '../utils/ua.js'
import { getAuthUrl } from '../services/discord.js'
import { authService } from '../services/auth.service.js'

const COOKIE_REDIRECT_TO = 'auth_redirect_to';
const COOKIE_STATE = 'auth_state';

/**
 * Show Login Page
 */
export const showLoginPage = (c: Context) => {
  const error = c.req.query('error')
  const redirectTo = c.req.query('redirect_to')
  const validRedirectTo = validateRedirectUrl(redirectTo)

  return c.html(<LoginPage error={error} redirectTo={validRedirectTo || undefined} />)
}

/**
 * Start OAuth Flow (Redirect to Discord)
 */
export const startDiscordAuth = (c: Context) => {
  const redirectTo = c.req.query('redirect_to')
  const validRedirectTo = validateRedirectUrl(redirectTo)

  // 1. Generate State (Anti-CSRF)
  const state = crypto.randomUUID();
  
  // 2. Save state & return url to cookie (Short lived)
  setCookie(c, COOKIE_STATE, state, {
      httpOnly: true,
      secure: true, 
      sameSite: 'Lax',
      maxAge: 60 * 5 // 5 min
  });

  if (validRedirectTo) {
    setCookie(c, COOKIE_REDIRECT_TO, validRedirectTo, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 5 
    })
  }

  // 3. Redirect to Discord with State
  return c.redirect(getAuthUrl(state))
}

/**
 * Handle OAuth Callback
 */
export const handleDiscordCallback = async (c: Context) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const storedState = getCookie(c, COOKIE_STATE);

    // 1. Validate Input
    if (!code || !state) {
        return c.redirect('/auth/login?error=Invalid request');
    }

    // 2. CSRF Check
    if (state !== storedState) {
        return c.redirect('/auth/login?error=State mismatch (CSRF detected)');
    }

    // Clean up temporary cookies
    deleteCookie(c, COOKIE_STATE);

    try {
        // 3. Process Login (Service Layer)
        const ip = c.req.header('x-forwarded-for') || 'unknown';
        const ua = parseUserAgent(c.req.header('user-agent'));

        const { sessionId } = await authService.loginWithDiscord(code, {
            ip,
            deviceType: ua.deviceType,
            os: ua.os,
            browser: ua.browser,
            lastActiveAt: new Date().toISOString()
        });
        
        // 4. Set Session Cookie (SSO Domain)
        setCookie(c, COOKIE_NAME, sessionId, COOKIE_OPTS);

        // 5. Redirect User back
        const returnTo = getCookie(c, COOKIE_REDIRECT_TO);
        deleteCookie(c, COOKIE_REDIRECT_TO);
        
        return c.redirect(validateRedirectUrl(returnTo) || getDefaultRedirectUrl());

    } catch (e) {
        console.error("Login Failed", e);
        return c.redirect('/auth/login?error=Login failed');
    }
}
