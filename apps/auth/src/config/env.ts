import { env as configEnv, checkRequiredEnv } from '@hss/config';

// Ensure critical vars are present
checkRequiredEnv();

export const env = {
  DISCORD_CLIENT_ID: configEnv.HSS_DISCORD_CLIENT_ID!,
  DISCORD_CLIENT_SECRET: configEnv.HSS_DISCORD_CLIENT_SECRET!,
  DISCORD_REDIRECT_URI: configEnv.HSS_DISCORD_REDIRECT_URI || 'http://auth.localhost/callback',
  PORT: 3000, 
  // Ideally PORT should also come from config if fixed, or passed via env in deployment
  // For now keeping it consistent with local PORTS constant if we want
};
