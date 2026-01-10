import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { SessionManager, COOKIE_NAME, COOKIE_OPTS } from '@hss/session-sdk';
import { PORTS } from '@hss/config';

import { getAuthUrl, exchangeCode, getDiscordUser } from './lib/discord.js';
import { validateRedirectUrl, getGenericDefaultRedirect } from './lib/url.js';
import { upsertUser } from './lib/user.js';

const app = new Hono();

app.use('*', logger());

// --- Constants ---
const STATE_COOKIE = 'auth_state';
const REDIRECT_COOKIE = 'auth_redirect_to';

// --- Views (Simple JSX) ---
const Layout = (props: { children: any }) => (
  <html>
    <head>
      <title>HSS Science</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 flex items-center justify-center h-screen">
      {props.children}
    </body>
  </html>
);

// --- Routes ---

/**
 * GET /login
 * Displays the login page.
 * If already logged in, redirects immediately.
 */
app.get('/login', async (c) => {
    // 1. Check existing session
    const sessionId = getCookie(c, COOKIE_NAME);
    const redirectTo = validateRedirectUrl(c.req.query('redirect_to'));

    if (sessionId) {
        const session = await SessionManager.validateSession(sessionId);
        if (session) {
            return c.redirect(redirectTo || getGenericDefaultRedirect());
        }
    }

    // 2. Render Login Page
    const discordUrl = `/discord${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''}`;
    
    return c.html(
      <Layout>
        <div class="bg-white p-8 rounded shadow-md w-96 text-center">
            <h1 class="text-2xl font-bold mb-6 text-gray-800">Sign In</h1>
            <p class="mb-6 text-gray-600">Access HSS Science Platform</p>
            <a href={discordUrl} class="block w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2 px-4 rounded transition">
                Login with Discord
            </a>
            {c.req.query('error') && (
                <div class="mt-4 text-red-500 text-sm">
                    {c.req.query('error')}
                </div>
            )}
        </div>
      </Layout>
    );
});

/**
 * GET /discord
 * Initiates the Discord OAuth flow.
 */
app.get('/discord', (c) => {
    const redirectTo = validateRedirectUrl(c.req.query('redirect_to'));
    const state = crypto.randomUUID();

    setCookie(c, STATE_COOKIE, state, { httpOnly: true, secure: true, maxAge: 300 }); // 5 min
    if (redirectTo) {
        setCookie(c, REDIRECT_COOKIE, redirectTo, { httpOnly: true, secure: true, maxAge: 300 });
    }

    return c.redirect(getAuthUrl(state));
});

/**
 * GET /callback
 * Handles the OAuth callback.
 */
app.get('/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const storedState = getCookie(c, STATE_COOKIE);
    const storedRedirect = getCookie(c, REDIRECT_COOKIE);

    // 1. Validation
    if (!code || !state || state !== storedState) {
        return c.redirect('/login?error=Invalid state or timeout');
    }

    try {
        // 2. OAuth Exchange
        const tokens = await exchangeCode(code);
        const discordUser = await getDiscordUser(tokens.access_token);

        // 3. Sync User
        const user = await upsertUser(discordUser);

        // 4. Create Session
        const sessionId = await SessionManager.createSession({
            id: user.id,
            discordId: user.discordId,
            username: user.username,
            role: 'user', // Default
            avatarUrl: user.avatarUrl,
            connection: {
                ip: c.req.header('x-forwarded-for') || 'unknown',
                deviceType: 'unknown', // Simplified
                os: 'unknown',
                browser: 'unknown',
                lastActiveAt: new Date().toISOString()
            }
        });

        // 5. Cleanup & Set Cookie
        deleteCookie(c, STATE_COOKIE);
        deleteCookie(c, REDIRECT_COOKIE);
        setCookie(c, COOKIE_NAME, sessionId, COOKIE_OPTS);

        // 6. Redirect
        const target = validateRedirectUrl(storedRedirect) || getGenericDefaultRedirect();
        return c.redirect(target);

    } catch (error) {
        console.error('Auth Error:', error);
        return c.redirect('/login?error=Authentication failed');
    }
});

// Start Server
console.log(`Auth Service running on port ${PORTS.AUTH}`);
serve({
  fetch: app.fetch,
  port: PORTS.AUTH
});
