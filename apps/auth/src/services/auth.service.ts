import { db, users } from '@hss/database';
import { SessionManager, ConnectionInfo } from '@hss/session-sdk';
import { exchangeCodeForToken, getDiscordUser, DiscordUser } from './discord.js';

export class AuthService {
  /**
   * Handle Discord Login Callback
   * 1. Exchange Code -> Token
   * 2. Get User Info
   * 3. Sync internal DB (Upsert)
   * 4. Create Session in Redis
   */
  async loginWithDiscord(code: string, connectionInfo: ConnectionInfo) {
    // 1 & 2. Discord API
    const tokenData = await exchangeCodeForToken(code) as any;
    const discordUser = await getDiscordUser(tokenData.access_token) as DiscordUser;

    // 3. Upsert User in DB
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
        updatedAt: new Date()
      }
    }).returning();

    // 4. Create Session (Redis)
    const sessionId = await SessionManager.createSession({
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        connection: connectionInfo
    });

    return { sessionId, user };
  }
}

export const authService = new AuthService();
