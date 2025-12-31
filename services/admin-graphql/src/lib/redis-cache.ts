import { createClient } from "redis";

const redis = createClient({
  username: "app_user",
  password: "mKzQiIos5h1BwfImSYMRznu6PoeZj4gu",
  socket: {
    host: "messaging.thrico.network",
    port: 6379,
  },
});

redis.connect().catch(console.error);

// Cache keys
const CACHE_KEYS = {
  website: (entityId: string) => `website:${entityId}`,
  websiteBySlug: (slug: string) => `website:slug:${slug}`,
  navbar: (websiteId: string) => `navbar:${websiteId}`,
  footer: (websiteId: string) => `footer:${websiteId}`,
  page: (pageId: string) => `page:${pageId}`,
  pages: (websiteId: string) => `pages:${websiteId}`,
  modules: (pageId: string) => `modules:${pageId}`,
};

// Cache TTL (Time To Live)
const CACHE_TTL = {
  website: 3600, // 1 hour
  navbar: 3600,
  footer: 3600,
  page: 1800, // 30 minutes
  modules: 1800,
};

export class WebsiteCache {
  // Get website from cache
  async getWebsite(entityId: string) {
    try {
      const cached = await redis.get(CACHE_KEYS.website(entityId));
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.error("Redis get error", e);
      return null;
    }
  }

  // Set website in cache
  async setWebsite(entityId: string, data: any) {
    try {
      await redis.setEx(
        CACHE_KEYS.website(entityId),
        CACHE_TTL.website,
        JSON.stringify(data)
      );
    } catch (e) {
      console.error("Redis set error", e);
    }
  }

  // Invalidate website cache
  async invalidateWebsite(entityId: string, websiteId: string) {
    try {
      await redis.del([
        CACHE_KEYS.website(entityId),
        CACHE_KEYS.navbar(websiteId),
        CACHE_KEYS.footer(websiteId),
        CACHE_KEYS.pages(websiteId),
      ]);
    } catch (e) {
      console.error("Redis del error", e);
    }
  }

  // Invalidate page and its modules cache
  async invalidatePage(pageId: string) {
    try {
      await redis.del([CACHE_KEYS.page(pageId), CACHE_KEYS.modules(pageId)]);
    } catch (e) {
      console.error("Redis del error", e);
    }
  }

  // Get navbar from cache
  async getNavbar(websiteId: string) {
    try {
      const cached = await redis.get(CACHE_KEYS.navbar(websiteId));
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  }

  // Set navbar in cache
  async setNavbar(websiteId: string, data: any) {
    try {
      await redis.setEx(
        CACHE_KEYS.navbar(websiteId),
        CACHE_TTL.navbar,
        JSON.stringify(data)
      );
    } catch (e) {
      console.error(e);
    }
  }
}
