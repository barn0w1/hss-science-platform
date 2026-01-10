import { env } from '@hss/config';

export function getGenericDefaultRedirect(): string {
    const protocol = env.NODE_ENV === 'production' ? 'https' : 'http';
    if (env.HSS_DOMAIN === 'localhost') {
        return `${protocol}://${env.HSS_DOMAIN}`;
    }
    return `${protocol}://${env.HSS_DOMAIN}`;
}

export function validateRedirectUrl(url: string | undefined): string | null {
    if (!url) return null;
    
    try {
        const u = new URL(url);
        // Security: Only allow redirects to subdomains of HSS_COOKIE_DOMAIN
        // e.g. .company.com -> app.company.com (OK), evil.com (NO)
        
        // Remove leading dot if present
        const rootDomain = env.HSS_COOKIE_DOMAIN ? env.HSS_COOKIE_DOMAIN.replace(/^\./, '') : 'localhost';
        
        if (rootDomain === 'localhost') {
             if (u.hostname === 'localhost' || u.hostname.endsWith('.localhost')) {
                 return url;
             }
        } else {
             if (u.hostname.endsWith(rootDomain)) {
                 return url;
             }
        }
        return null;
    } catch {
        return null;
    }
}
