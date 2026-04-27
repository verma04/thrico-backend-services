"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileCache = exports.UserCache = exports.WebsiteCache = exports.BaseRedisCache = exports.CACHE_TTL = exports.getRedisClient = void 0;
const redis_1 = require("redis");
// Singleton Redis client
let redisClient = null;
/**
 * Get or create Redis client instance
 */
const getRedisClient = () => {
    if (!redisClient) {
        redisClient = (0, redis_1.createClient)({
            username: process.env.REDIS_USERNAME || "app_user",
            password: process.env.REDIS_PASSWORD || "mKzQiIos5h1BwfImSYMRznu6PoeZj4gu",
            socket: {
                host: process.env.REDIS_HOST || "localhost",
                port: parseInt(process.env.REDIS_PORT || "6379", 10),
            },
        });
        redisClient.connect().catch(console.error);
        redisClient.on("error", (err) => {
            // console.error("Redis Client Error:", err);
        });
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
// Default cache TTL values
exports.CACHE_TTL = {
    short: 900, // 15 minutes
    medium: 1800, // 30 minutes
    long: 3600, // 1 hour
    veryLong: 7200, // 2 hours
};
/**
 * Base Redis Cache class with common operations
 */
class BaseRedisCache {
    constructor() {
        this.redis = (0, exports.getRedisClient)();
    }
    /**
     * Get value from cache
     */
    async get(key) {
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        catch (e) {
            console.error(`Redis get error for key ${key}:`, e);
            return null;
        }
    }
    /**
     * Set value in cache with TTL
     */
    async set(key, data, ttl) {
        try {
            await this.redis.setEx(key, ttl, JSON.stringify(data));
        }
        catch (e) {
            console.error(`Redis set error for key ${key}:`, e);
        }
    }
    /**
     * Delete one or more keys from cache
     */
    async del(keys) {
        try {
            const keyArray = Array.isArray(keys) ? keys : [keys];
            await this.redis.del(keyArray);
        }
        catch (e) {
            console.error(`Redis del error:`, e);
        }
    }
    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            const result = await this.redis.exists(key);
            return result === 1;
        }
        catch (e) {
            console.error(`Redis exists error for key ${key}:`, e);
            return false;
        }
    }
}
exports.BaseRedisCache = BaseRedisCache;
/**
 * Website Cache - for admin-graphql service
 */
class WebsiteCache extends BaseRedisCache {
    constructor() {
        super(...arguments);
        this.keys = {
            website: (entityId) => `website:${entityId}`,
            websiteBySlug: (slug) => `website:slug:${slug}`,
            navbar: (websiteId) => `navbar:${websiteId}`,
            footer: (websiteId) => `footer:${websiteId}`,
            page: (pageId) => `page:${pageId}`,
            pages: (websiteId) => `pages:${websiteId}`,
            modules: (pageId) => `modules:${pageId}`,
        };
    }
    async getWebsite(entityId) {
        return this.get(this.keys.website(entityId));
    }
    async setWebsite(entityId, data) {
        return this.set(this.keys.website(entityId), data, exports.CACHE_TTL.long);
    }
    async invalidateWebsite(entityId, websiteId) {
        return this.del([
            this.keys.website(entityId),
            this.keys.navbar(websiteId),
            this.keys.footer(websiteId),
            this.keys.pages(websiteId),
        ]);
    }
    async invalidatePage(pageId) {
        return this.del([this.keys.page(pageId), this.keys.modules(pageId)]);
    }
    async getNavbar(websiteId) {
        return this.get(this.keys.navbar(websiteId));
    }
    async setNavbar(websiteId, data) {
        return this.set(this.keys.navbar(websiteId), data, exports.CACHE_TTL.long);
    }
}
exports.WebsiteCache = WebsiteCache;
/**
 * User Cache - for user service
 */
class UserCache extends BaseRedisCache {
    constructor() {
        super(...arguments);
        this.keys = {
            user: (userId) => `user:${userId}`,
            userByEmail: (email) => `user:email:${email}`,
        };
    }
    async getUser(userId) {
        return this.get(this.keys.user(userId));
    }
    async setUser(userId, data) {
        return this.set(this.keys.user(userId), data, exports.CACHE_TTL.long);
    }
    async invalidateUser(userId) {
        return this.del(this.keys.user(userId));
    }
    async getUserByEmail(email) {
        return this.get(this.keys.userByEmail(email));
    }
    async setUserByEmail(email, data) {
        return this.set(this.keys.userByEmail(email), data, exports.CACHE_TTL.long);
    }
}
exports.UserCache = UserCache;
/**
 * Mobile Cache - for mobile service
 */
class MobileCache extends BaseRedisCache {
    constructor() {
        super(...arguments);
        this.keys = {
            mobile: (userId) => `mobile:${userId}`,
            session: (sessionId) => `session:${sessionId}`,
        };
    }
    async getMobileUser(userId) {
        return this.get(this.keys.mobile(userId));
    }
    async setMobileUser(userId, data) {
        return this.set(this.keys.mobile(userId), data, exports.CACHE_TTL.long);
    }
    async invalidateMobileUser(userId) {
        return this.del(this.keys.mobile(userId));
    }
    async getSession(sessionId) {
        return this.get(this.keys.session(sessionId));
    }
    async setSession(sessionId, data) {
        return this.set(this.keys.session(sessionId), data, exports.CACHE_TTL.veryLong);
    }
    async invalidateSession(sessionId) {
        return this.del(this.keys.session(sessionId));
    }
}
exports.MobileCache = MobileCache;
//# sourceMappingURL=redis-cache.js.map