import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    HSS_DATABASE_URL: z.string().url(),

    // General
    HSS_DOMAIN: z.string().default('localhost'),

    // Redis
    HSS_REDIS_HOST: z.string().min(1),
    HSS_REDIS_PORT: z.coerce.number().default(6379),
    HSS_REDIS_PASSWORD: z.string().optional(),

    // Auth / Cookie
    // 本番でドット(.)忘れを防ぐため、ここで強制チェックしてもいい
    HSS_COOKIE_DOMAIN: z.string(), 

    // Discord
    HSS_DISCORD_CLIENT_ID: z.string(),
    HSS_DISCORD_CLIENT_SECRET: z.string(),
    HSS_DISCORD_REDIRECT_URI: z.string().url(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("❌ Invalid environment variables:", _env.error.format());
    throw new Error("Invalid environment variables");
}

export const env = _env.data;
export const isProduction = env.NODE_ENV === 'production';