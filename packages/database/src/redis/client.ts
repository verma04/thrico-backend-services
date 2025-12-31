import Redis from 'ioredis';
import { log } from '@thrico/logging';
import { REDIS_KEYS } from '@thrico/shared';

// Lazy initialization - client is created only when first accessed
// This ensures dotenv has loaded environment variables first
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    console.log('Creating Redis client with:', {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
    });
    
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    // Event listeners
    redisClient.on('connect', () => {
      log.info('Redis client connected', {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      });
    });

    redisClient.on('error', (error) => {
      console.log('Full Redis error:', error); // Debug logging
      const err = error as any; // Cast to access Node.js error properties
      log.error('Redis client error', {
        error: error.message,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall,
      });
    });

    redisClient.on('reconnecting', () => {
      log.warn('Redis client reconnecting');
    });
  }
  
  return redisClient;
}

// Helper functions

/**
 * Set a value in Redis with optional expiration
 */
export async function setCache(
  key: string,
  value: any,
  expirationSeconds?: number
): Promise<void> {
  try {
    const redis = getRedisClient();
    const serialized = JSON.stringify(value);
    if (expirationSeconds) {
      await redis.setex(key, expirationSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (error) {
    log.error('Error setting cache', { key, error });
    throw error;
  }
}

/**
 * Get a value from Redis
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    log.error('Error getting cache', { key, error });
    return null;
  }
}

/**
 * Delete a key from Redis
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(key);
  } catch (error) {
    log.error('Error deleting cache', { key, error });
  }
}

/**
 * Delete keys matching a pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    log.error('Error deleting cache pattern', { pattern, error });
  }
}

/**
 * Check if a key exists in Redis
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    log.error('Error checking cache existence', { key, error });
    return false;
  }
}

/**
 * Set session data
 */
export async function setSession(
  userId: string,
  sessionData: any,
  expirationSeconds: number
): Promise<void> {
  const key = `${REDIS_KEYS.SESSION}${userId}`;
  await setCache(key, sessionData, expirationSeconds);
}

/**
 * Get session data
 */
export async function getSession(userId: string): Promise<any | null> {
  const key = `${REDIS_KEYS.SESSION}${userId}`;
  return getCache(key);
}

/**
 * Delete session
 */
export async function deleteSession(userId: string): Promise<void> {
  const key = `${REDIS_KEYS.SESSION}${userId}`;
  await deleteCache(key);
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    log.info('Redis connection closed');
    redisClient = null;
  }
}

// Export a getter that returns the client (lazy)
// DO NOT call getRedisClient() here as it would create the client immediately!
export default {
  get client() {
    return getRedisClient();
  }
};


