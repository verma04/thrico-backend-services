import { createClient, RedisClientType } from "redis";

// Singleton Redis client
let redisClient: RedisClientType | null = null;

/**
 * Get or create Redis client instance
 */
export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    redisClient = createClient({
      username: process.env.REDIS_USERNAME || "app_user",
      password:
        process.env.REDIS_PASSWORD || "mKzQiIos5h1BwfImSYMRznu6PoeZj4gu",
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
      },
    });

    redisClient.connect().catch(console.error);

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });
  }

  return redisClient;
};

// Default cache TTL values
export const CACHE_TTL = {
  short: 900, // 15 minutes
  medium: 1800, // 30 minutes
  long: 3600, // 1 hour
  veryLong: 7200, // 2 hours
};

/**
 * Base Redis Cache class with common operations
 */
export class BaseRedisCache {
  protected redis: RedisClientType;

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Get value from cache
   */
  protected async get(key: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.error(`Redis get error for key ${key}:`, e);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  protected async set(key: string, data: any, ttl: number): Promise<void> {
    try {
      await this.redis.setEx(key, ttl, JSON.stringify(data));
    } catch (e) {
      console.error(`Redis set error for key ${key}:`, e);
    }
  }

  /**
   * Delete one or more keys from cache
   */
  protected async del(keys: string | string[]): Promise<void> {
    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      await this.redis.del(keyArray);
    } catch (e) {
      console.error(`Redis del error:`, e);
    }
  }

  /**
   * Check if key exists
   */
  protected async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (e) {
      console.error(`Redis exists error for key ${key}:`, e);
      return false;
    }
  }
}

/**
 * Website Cache - for admin-graphql service
 */
export class WebsiteCache extends BaseRedisCache {
  private keys = {
    website: (entityId: string) => `website:${entityId}`,
    websiteBySlug: (slug: string) => `website:slug:${slug}`,
    navbar: (websiteId: string) => `navbar:${websiteId}`,
    footer: (websiteId: string) => `footer:${websiteId}`,
    page: (pageId: string) => `page:${pageId}`,
    pages: (websiteId: string) => `pages:${websiteId}`,
    modules: (pageId: string) => `modules:${pageId}`,
  };

  async getWebsite(entityId: string) {
    return this.get(this.keys.website(entityId));
  }

  async setWebsite(entityId: string, data: any) {
    return this.set(this.keys.website(entityId), data, CACHE_TTL.long);
  }

  async invalidateWebsite(entityId: string, websiteId: string) {
    return this.del([
      this.keys.website(entityId),
      this.keys.navbar(websiteId),
      this.keys.footer(websiteId),
      this.keys.pages(websiteId),
    ]);
  }

  async invalidatePage(pageId: string) {
    return this.del([this.keys.page(pageId), this.keys.modules(pageId)]);
  }

  async getNavbar(websiteId: string) {
    return this.get(this.keys.navbar(websiteId));
  }

  async setNavbar(websiteId: string, data: any) {
    return this.set(this.keys.navbar(websiteId), data, CACHE_TTL.long);
  }
}

/**
 * User Cache - for user service
 */
export class UserCache extends BaseRedisCache {
  private keys = {
    user: (userId: string) => `user:${userId}`,
    userByEmail: (email: string) => `user:email:${email}`,
  };

  async getUser(userId: string) {
    return this.get(this.keys.user(userId));
  }

  async setUser(userId: string, data: any) {
    return this.set(this.keys.user(userId), data, CACHE_TTL.long);
  }

  async invalidateUser(userId: string) {
    return this.del(this.keys.user(userId));
  }

  async getUserByEmail(email: string) {
    return this.get(this.keys.userByEmail(email));
  }

  async setUserByEmail(email: string, data: any) {
    return this.set(this.keys.userByEmail(email), data, CACHE_TTL.long);
  }
}

/**
 * Mobile Cache - for mobile service
 */
export class MobileCache extends BaseRedisCache {
  private keys = {
    mobile: (userId: string) => `mobile:${userId}`,
    session: (sessionId: string) => `session:${sessionId}`,
  };

  async getMobileUser(userId: string) {
    return this.get(this.keys.mobile(userId));
  }

  async setMobileUser(userId: string, data: any) {
    return this.set(this.keys.mobile(userId), data, CACHE_TTL.long);
  }

  async invalidateMobileUser(userId: string) {
    return this.del(this.keys.mobile(userId));
  }

  async getSession(sessionId: string) {
    return this.get(this.keys.session(sessionId));
  }

  async setSession(sessionId: string, data: any) {
    return this.set(this.keys.session(sessionId), data, CACHE_TTL.veryLong);
  }

  async invalidateSession(sessionId: string) {
    return this.del(this.keys.session(sessionId));
  }
}
