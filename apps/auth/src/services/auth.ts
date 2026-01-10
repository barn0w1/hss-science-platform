import { db, users } from '@hss/database';
import { ConnectionInfo } from '@hss/session-sdk';
import { exchangeCodeForToken, getDiscordUser, DiscordUser } from '../lib/discord.js';

export class AuthService {
  /**
   * Orchestrates the login process
   * 1. Validates Discord Code
   * 2. Syncs User to Database
   * 3. (Caller handles Session Creation to keep this pure) -- actually, service should surely return the session ID.
   *    Let's keep session creation here as it's part of "Login" business logic.
   */
  async login(code: string, connectionInfo: ConnectionInfo) {
    // 1. Exchange Code
    const tokenData = await exchangeCodeForToken(code) as any;
    
    // 2. Fetch Profile
    const discordUser = await getDiscordUser(tokenData.access_token) as DiscordUser;

    // 3. Upsert User (Sync)
    const [user] = await db.insert(users).values({
      discordId: discordUser.id,
      username: discordUser.username,
      email: discordUser.email,
      avatarUrl: discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
    }).onConflictDoUpdate({
      target: users.discordId,
      set: {
        username: discordUser.username,
        email: discordUser.email,
        avatarUrl: discordUser.avatar 
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : null,
        updatedAt: new Date(),
      },
    }).returning();

    return user;
  }
}

export const authService = new AuthService();
