export const AUTH_COOKIES = {
    STATE: 'oauth_state',
    REDIRECT_TO: 'auth_redirect_to',
} as const;

export const AUTH_OPTS = {
    STATE_TTL: 60 * 5, // 5 minutes
} as const;
