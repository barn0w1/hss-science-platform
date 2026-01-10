import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { SessionManager, COOKIE_NAME, SessionUser } from '@hss/session-sdk';

type AuthVariables = {
  user: SessionUser | null;
};

/**
 * Authentication Middleware
 * 
 * Do One Thing: Validate Session and Inject User Context.
 * 
 * - Checks for session cookie
 * - Validates session via SessionManager (Redis)
 * - Injects `user` into Hono context (c.var.user)
 * - Does NOT handle enforcing permissions (Authorization) - that's for the app route to decide.
 */
export const authMiddleware = () => {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const sessionId = getCookie(c, COOKIE_NAME);

    if (!sessionId) {
      c.set('user', null);
      return next();
    }

    // Validate and slide expiration
    const user = await SessionManager.validateSession(sessionId);

    // If validation fails (expired or invalid), treat as guest
    if (!user) {
      c.set('user', null);
    } else {
      c.set('user', user);
    }

    await next();
  });
};

/**
 * Require Auth Middleware
 * 
 * A stricter version or helper that stops request if not authenticated.
 * Or apps can just check `c.var.user` themselves.
 * 
 * For simplicity and "Do One Thing", we keep the main middleware 
 * focused on specific task: "Identify".
 * 
 * If you want "Guard", you can use this helper or check in handler.
 */
export const requireAuth = () => {
    return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
        // Must run after authMiddleware
        const user = c.var.user;
        if (!user) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        await next();
    });
};
