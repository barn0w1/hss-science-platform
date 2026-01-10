import { Redis } from "ioredis";

// env
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "password";

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
});

export const COOKIE_NAME = "hss_science_session";
// 7 days in seconds
export const SESSION_TTL = 60 * 60 * 24 * 7; 

const IS_PROD = process.env.NODE_ENV === 'production';
// 環境変数 COOKIE_DOMAIN があればそれを使用 (例: .hss-science.org)
// なければ、Production時はセキュリティのためエラーにすべきだが、
// ここではデフォルトでundefined (host-only) とする
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

export const COOKIE_OPTS = {
    httpOnly: true,
    // Productionなら必ずSecure
    secure: IS_PROD,
    // サブドメイン間で共有する場合は Lax が適切
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL,
    domain: COOKIE_DOMAIN,
} as const;

export const REDIS_KEYS = {
    SESSION: (sessionId: string) => `hss:session:${sessionId}`,
    USER_SESSIONS: (userId: string) => `hss:user:${userId}:sessions`,
} as const;

export interface ConnectionInfo {
    ip: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    os: string;
    browser: string;
    lastActiveAt: string;
}

export interface SessionUser {
  id: string;
  discordId: string;
  username: string;
  role: string | null;
  avatarUrl: string | null;
  // Optional connection metadata for smart session management
  connection?: ConnectionInfo;
  // Allow additional properties (ProjectID, Permissions, etc.)
  [key: string]: unknown;
}


function generateSessionId(): string {
  // 32 bytes of random data, encoded as base64url (approx 43 chars)
  // More compact and entropy-dense than UUID v4
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64url');
}

export const SessionManager = {
  /**
   * Create Session
   * Limits concurrent sessions per user to 5.
   */
  async createSession(user: SessionUser): Promise<string> {
    const sessionId = generateSessionId();
    const sessionKey = REDIS_KEYS.SESSION(sessionId);
    const userSessionsKey = REDIS_KEYS.USER_SESSIONS(user.id);
    const sessionData = JSON.stringify(user);

    // Atomically: 
    // 1. Set session data
    // 2. Add to user's list
    // 3. Trim list to max size
    // 4. Return removed session IDs (to delete their keys)
    const script = `
      redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
      redis.call('RPUSH', KEYS[2], ARGV[3])
      redis.call('EXPIRE', KEYS[2], ARGV[2])
      
      local count = redis.call('LLEN', KEYS[2])
      if count > tonumber(ARGV[4]) then
        local removed = redis.call('LRANGE', KEYS[2], 0, count - tonumber(ARGV[4]) - 1)
        redis.call('LTRIM', KEYS[2], -tonumber(ARGV[4]), -1)
        return removed
      end
      return {}
    `;

    try {
      const removedSessionIds = await redis.eval(
        script,
        2, // number of keys
        sessionKey,
        userSessionsKey,
        // args
        sessionData,
        SESSION_TTL,
        sessionId,
        5 // Max sessions
      ) as string[];

      // Clean up removed sessions asynchronously
      if (removedSessionIds.length > 0) {
        const keysToDelete = removedSessionIds.map(id => REDIS_KEYS.SESSION(id));
        await redis.del(...keysToDelete);
      }
    } catch (err) {
      console.error('Redis Transaction Error:', err);
      throw new Error('Failed to create session');
    }

    return sessionId;
  },

  /**
   * Session Validation
   * Automatically extends session TTL (Sliding Expiration)
   */
  async validateSession<T extends SessionUser = SessionUser>(sessionId: string): Promise<T | null> {
    const key = REDIS_KEYS.SESSION(sessionId);
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    try {
      const user = JSON.parse(data) as T;
      const userSessionsKey = REDIS_KEYS.USER_SESSIONS(user.id);
      
      // Update lastActiveAt if connection info exists (Smart update)
      if (user.connection) {
        user.connection.lastActiveAt = new Date().toISOString();
        // We need to write back the updated data
        await redis.pipeline()
           .set(key, JSON.stringify(user), "EX", SESSION_TTL)
           .expire(userSessionsKey, SESSION_TTL)
           .exec();
           
        return user;
      }

      // Standard sliding expiration
      await redis.pipeline()
        .expire(key, SESSION_TTL)
        .expire(userSessionsKey, SESSION_TTL)
        .exec();

      return user;
    } catch (e) {
      console.error("Failed to parse session data", e);
      return null;
    }
  },


  /**
   * Get all active sessions for a user
   * Performs lazy cleanup of expired sessions found in the list.
   */
  async getUserSessions<T extends SessionUser = SessionUser>(userId: string): Promise<{ sessionId: string; data: T }[]> {
     const userSessionsKey = REDIS_KEYS.USER_SESSIONS(userId);
     // Get all candidates
     const sessionIds = await redis.lrange(userSessionsKey, 0, -1);
     
     if (sessionIds.length === 0) return [];

     const keys = sessionIds.map(id => REDIS_KEYS.SESSION(id));
     // MGET for O(1) bulk retrieval
     const sessionsData = await redis.mget(...keys);

     const activeSessions: { sessionId: string; data: T }[] = [];
     const expiredSessionIds: string[] = [];

     sessionsData.forEach((data, index) => {
        const sid = sessionIds[index];
        if (data) {
            try {
                activeSessions.push({ sessionId: sid, data: JSON.parse(data) });
            } catch {
                expiredSessionIds.push(sid);
            }
        } else {
            // Found a ghost ID in the list (session expired key but id remains in list)
            expiredSessionIds.push(sid);
        }
     });

     // Smart Cleanup: Remove expired IDs from the list asynchronously
     if (expiredSessionIds.length > 0) {
        // pipeline to remove each expired ID
        const pipeline = redis.pipeline();
        expiredSessionIds.forEach(id => pipeline.lrem(userSessionsKey, 0, id));
        pipeline.exec().catch(err => console.error('Failed to cleanup user sessions', err));
     }

     return activeSessions;
  },

  /**
   * Revoke all sessions for a user (e.g. Password Reset)
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = REDIS_KEYS.USER_SESSIONS(userId);
    const sessionIds = await redis.lrange(userSessionsKey, 0, -1);

    if (sessionIds.length > 0) {
        const keys = sessionIds.map(id => REDIS_KEYS.SESSION(id));
        // Delete all session keys and the list key itself in one go
        const pipeline = redis.pipeline();
        pipeline.del(...keys);
        pipeline.del(userSessionsKey);
        await pipeline.exec();
    } else {
        await redis.del(userSessionsKey);
    }
  },

  /**
   * Regenerate Session ID (Session Rotation)
   * Recommended after privilege changes or periodic rotation.
   * Creates a new session ID with the same data, and invalidates the old one.
   */
  async regenerateSession(oldSessionId: string): Promise<string | null> {
    const user = await this.validateSession(oldSessionId);
    if (!user) return null;

    // Create new session first
    const newSessionId = await this.createSession(user);

    // Then immediate revoke the old one
    await this.revokeSession(oldSessionId);

    return newSessionId;
  },

  /**
   * Update Session User Data
   */
  async updateSessionUser<T extends SessionUser = SessionUser>(sessionId: string, partialUser: Partial<T>) {
    const key = REDIS_KEYS.SESSION(sessionId);
    const currentStr = await redis.get(key);
    if (!currentStr) return false;

    try {
      const current = JSON.parse(currentStr) as T;
      const updated = { ...current, ...partialUser };

      // Update date if connection info is present
      if (updated.connection) {
         updated.connection.lastActiveAt = new Date().toISOString();
      }

      await redis.set(key, JSON.stringify(updated), "EX", SESSION_TTL);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Revoke Session manually
   */
  async revokeSession(sessionId: string): Promise<void> {
    const key = REDIS_KEYS.SESSION(sessionId);
    const sessionStr = await redis.get(key);
    
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr) as SessionUser;
            const userSessionsKey = REDIS_KEYS.USER_SESSIONS(session.id);
            await redis.lrem(userSessionsKey, 0, sessionId);
        } catch {}
    }

    await redis.del(key);
  },

  /**
   * Invalidate Session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const key = REDIS_KEYS.SESSION(sessionId);
    await redis.del(key);
  }
};