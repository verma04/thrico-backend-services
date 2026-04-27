import { RedisClientType } from "redis";
/**
 * Get or create Redis client instance
 */
export declare const getRedisClient: () => RedisClientType;
export declare const CACHE_TTL: {
    short: number;
    medium: number;
    long: number;
    veryLong: number;
};
/**
 * Base Redis Cache class with common operations
 */
export declare class BaseRedisCache {
    protected redis: RedisClientType;
    constructor();
    /**
     * Get value from cache
     */
    protected get(key: string): Promise<any | null>;
    /**
     * Set value in cache with TTL
     */
    protected set(key: string, data: any, ttl: number): Promise<void>;
    /**
     * Delete one or more keys from cache
     */
    protected del(keys: string | string[]): Promise<void>;
    /**
     * Check if key exists
     */
    protected exists(key: string): Promise<boolean>;
}
/**
 * Website Cache - for admin-graphql service
 */
export declare class WebsiteCache extends BaseRedisCache {
    private keys;
    getWebsite(entityId: string): Promise<any>;
    setWebsite(entityId: string, data: any): Promise<void>;
    invalidateWebsite(entityId: string, websiteId: string): Promise<void>;
    invalidatePage(pageId: string): Promise<void>;
    getNavbar(websiteId: string): Promise<any>;
    setNavbar(websiteId: string, data: any): Promise<void>;
}
/**
 * User Cache - for user service
 */
export declare class UserCache extends BaseRedisCache {
    private keys;
    getUser(userId: string): Promise<any>;
    setUser(userId: string, data: any): Promise<void>;
    invalidateUser(userId: string): Promise<void>;
    getUserByEmail(email: string): Promise<any>;
    setUserByEmail(email: string, data: any): Promise<void>;
}
/**
 * Mobile Cache - for mobile service
 */
export declare class MobileCache extends BaseRedisCache {
    private keys;
    getMobileUser(userId: string): Promise<any>;
    setMobileUser(userId: string, data: any): Promise<void>;
    invalidateMobileUser(userId: string): Promise<void>;
    getSession(sessionId: string): Promise<any>;
    setSession(sessionId: string, data: any): Promise<void>;
    invalidateSession(sessionId: string): Promise<void>;
}
//# sourceMappingURL=redis-cache.d.ts.map