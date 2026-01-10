import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { SessionManager, COOKIE_NAME } from '@hss/session-sdk'
import { validateRedirectUrl, getDefaultRedirectUrl } from '../lib/url.js'
import { AUTH_COOKIES } from '../lib/constants.js'

/**
 * Middleware: Redirect if Authenticated
 * If the user already has a valid session, skip login/signup pages
 * and redirect them to the intended destination or dashboard.
 */
export const redirectIfAuthenticated = async (c: Context, next: Next) => {
  const sessionId = getCookie(c, COOKIE_NAME)

  if (sessionId) {
    try {
      // Validate session with Redis (Atomic check)
      const session = await SessionManager.validateSession(sessionId)
      
      if (session) {
        // User is already logged in.
        // Determine where to send them.
        
        // 1. Check Query Param (e.g. ?redirect_to=...)
        const queryRedirect = c.req.query('redirect_to');
        
        // 2. Check Cookie (if set previously)
        const cookieRedirect = getCookie(c, AUTH_COOKIES.REDIRECT_TO);
        
        const targetUrl = validateRedirectUrl(queryRedirect) 
                       || validateRedirectUrl(cookieRedirect) 
                       || getDefaultRedirectUrl();

        return c.redirect(targetUrl);
      }
    } catch (e) {
      // Session validation failed (e.g. Redis error).
      // Treat as not authenticated and proceed.
      console.error("Session check failed during guest check", e);
    }
  }

  // Not authenticated, proceed to controller
  await next()
}
