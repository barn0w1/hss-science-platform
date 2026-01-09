import Redis from "ioredis";

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
   */
  async createSession(user: SessionUser): Promise<string> {
    const sessionId = crypto.randomUUID();
    const key = `session:${sessionId}`;

    await redis.set(
      key,
      JSON.stringify(user),
      "EX",
      SESSION_TTL
    );

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
   * Invalidate Session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await redis.del(key);
  }
};