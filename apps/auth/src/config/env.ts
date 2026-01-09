import { config } from 'dotenv';

config();

const requiredEnv = [
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_REDIRECT_URI',
] as const;

export const env = {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID!,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET!,
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || 'http://auth.localhost/callback',
  DRIVE_URL: process.env.DRIVE_URL || 'http://drive.localhost',
  PORT: Number(process.env.PORT) || 3000,
};

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}