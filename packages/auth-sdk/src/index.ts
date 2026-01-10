import { Redis } from "ioredis";

// env
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "redis_local_password";

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
});

export const COOKIE_NAME = "hss_science_session";
// 7 days in seconds
export const SESSION_TTL = 60 * 60 * 24 * 7; 

export const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL,
} as const;

export interface SessionUser {
  id: string;
  discordId: string;
  username: string;
  role: string | null;
  avatarUrl: string | null;
}

export const AuthService = {
  /**
   * Create Session
   * Limits concurrent sessions per user to 5.
   */
  async createSession(user: SessionUser): Promise<string> {
    const sessionId = crypto.randomUUID();
    const sessionKey = `session:${sessionId}`;
    const userSessionsKey = `user_sessions:${user.id}`;
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
        const keysToDelete = removedSessionIds.map(id => `session:${id}`);
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
   */
  async validateSession(sessionId: string): Promise<SessionUser | null> {
    const key = `session:${sessionId}`;
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    try {
      await redis.expire(key, SESSION_TTL);

      return JSON.parse(data) as SessionUser;
    } catch (e) {
      console.error("Failed to parse session data", e);
      return null;
    }
  },

  /**
   * Update Session User Data
   */
  async updateSessionUser(sessionId: string, partialUser: Partial<SessionUser>) {
    const key = `session:${sessionId}`;
    const currentStr = await redis.get(key);
    if (!currentStr) return false;

    try {
      const current = JSON.parse(currentStr) as SessionUser;
      const updated = { ...current, ...partialUser };

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
    const key = `session:${sessionId}`;
    const sessionStr = await redis.get(key);
    
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr) as SessionUser;
            const userSessionsKey = `user_sessions:${session.id}`;
            await redis.lrem(userSessionsKey, 0, sessionId);
        } catch {}
    }

    await redis.del(key);
  },

  /**
   * Invalidate Session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await redis.del(key);
  }
};