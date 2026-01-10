import { config } from 'dotenv';
import path from 'node:path';

// Load .env from workspace root
config({ path: path.resolve(process.cwd(), '../../.env') });

const requiredEnv = [
  'HSS_DISCORD_CLIENT_ID',
  'HSS_DISCORD_CLIENT_SECRET',
  'HSS_DISCORD_REDIRECT_URI',
] as const;

export const env = {
  DISCORD_CLIENT_ID: process.env.HSS_DISCORD_CLIENT_ID!,
  DISCORD_CLIENT_SECRET: process.env.HSS_DISCORD_CLIENT_SECRET!,
  DISCORD_REDIRECT_URI: process.env.HSS_DISCORD_REDIRECT_URI || 'http://auth.localhost/callback',
  PORT: Number(process.env.PORT_AUTH || process.env.PORT) || 3000,
};

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}