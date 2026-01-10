import { config } from 'dotenv';
import path from 'node:path';

// Load .env from workspace root (relative to this package typically in node_modules or monorepo structure)
// We assume this is run from an app connected to the monorepo root
// But safely, we can try to find the root .env
config({ path: path.resolve(process.cwd(), '../../.env') });

/**
 * Type-safe Environment Variables Accessor
 */
export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database
    HSS_DATABASE_URL: process.env.HSS_DATABASE_URL,
    
    // Redis
    HSS_REDIS_HOST: process.env.HSS_REDIS_HOST || 'localhost',
    HSS_REDIS_PORT: Number(process.env.HSS_REDIS_PORT) || 6379,
    HSS_REDIS_PASSWORD: process.env.HSS_REDIS_PASSWORD,
    
    // Auth / Cookie
    HSS_COOKIE_DOMAIN: process.env.HSS_COOKIE_DOMAIN, // e.g. .hss-science.org

    // Discord
    HSS_DISCORD_CLIENT_ID: process.env.HSS_DISCORD_CLIENT_ID,
    HSS_DISCORD_CLIENT_SECRET: process.env.HSS_DISCORD_CLIENT_SECRET,
    HSS_DISCORD_REDIRECT_URI: process.env.HSS_DISCORD_REDIRECT_URI,
    
    // Computed helper
    isProduction: process.env.NODE_ENV === 'production',
} as const;

export function checkRequiredEnv() {
    const missing: string[] = [];
    if (!env.HSS_DATABASE_URL) missing.push('HSS_DATABASE_URL');
    if (!env.HSS_DISCORD_CLIENT_ID) missing.push('HSS_DISCORD_CLIENT_ID');
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
