import { REDIS_KEYS } from "@thrico/shared";
import { getCache, setCache } from "./client";
import redis from "./client";
import { log } from "@thrico/logging";

const MAX_NOTIFICATIONS = 50;

/**
 * Push a notification to the user's Redis cache
 * Key format: notification:{entityId}:{userId}
 */
export async function pushNotificationToCache(
  entityId: string,
  userId: string,
  notification: any,
): Promise<void> {
  try {
    log.info("🔵 pushNotificationToCache called", {
      entityId,
      userId,
      notificationType: notification.type,
      notificationTitle: notification.title,
    });

    const key = `${REDIS_KEYS.NOTIFICATION_CACHE}${userId}:${entityId}`;
    const client = redis.client;

    log.debug("Redis key generated", { key });

    // Add isRead field to notification
    const notificationWithReadStatus = {
      ...notification,
      isRead: false,
    };

    const serialized = JSON.stringify(notificationWithReadStatus);

    log.debug("Notification serialized", {
      serializedLength: serialized.length,
      key,
    });

    // Push to the front of the list
    await client.lpush(key, serialized);
    log.debug("Notification pushed to Redis list");

    // Trim the list to keep only the latest MAX_NOTIFICATIONS
    await client.ltrim(key, 0, MAX_NOTIFICATIONS - 1);
    log.debug("Redis list trimmed", { maxNotifications: MAX_NOTIFICATIONS });

    // Set expiry to 7 days (optional, can adjust)
    await client.expire(key, 7 * 24 * 60 * 60);
    log.debug("Redis key expiry set to 7 days");

    log.info("✅ Notification successfully cached in Redis", {
      entityId,
      userId,
      key,
      type: notification.type,
    });

    // Publish to Pub/Sub channel for real-time SSE updates
    try {
      const channel = `${REDIS_KEYS.NOTIFICATION_CACHE}pubsub:${userId}`;
      await client.publish(channel, serialized);
      log.info("📣 Notification published to Redis channel", { channel });
    } catch (pubSubError) {
      log.warn(
        "⚠️ Failed to publish notification to Redis Pub/Sub (likely permission issue)",
        {
          userId,
          error:
            pubSubError instanceof Error
              ? pubSubError.message
              : String(pubSubError),
        },
      );
    }
  } catch (error) {
    log.error("❌ Error pushing notification to Redis cache", {
      entityId,
      userId,
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw error; // Re-throw to let caller handle it
  }
}

/**
 * Get notifications from the user's Redis cache
 * @param onlyUnread - If true, only return unread notifications
 */
export async function getNotificationsFromCache(
  entityId: string,
  userId: string,
  onlyUnread: boolean = false,
  limit?: number,
  offset: number = 0,
): Promise<any[]> {
  try {
    const key = `${REDIS_KEYS.NOTIFICATION_CACHE}${userId}:${entityId}`;
    const client = redis.client;

    const start = offset;
    const end = limit ? offset + limit - 1 : -1;

    const notifications = await client.lrange(key, start, end);
    const parsed = notifications.map((n) => JSON.parse(n));

    if (onlyUnread) {
      return parsed.filter((n) => !n.isRead);
    }

    return parsed;
  } catch (error) {
    log.error("Error getting notifications from Redis cache", {
      entityId,
      userId,
      error,
    });
    return [];
  }
}

/**
 * Mark all notifications as read
 */
export async function markNotificationsAsRead(
  entityId: string,
  userId: string,
): Promise<void> {
  try {
    const key = `${REDIS_KEYS.NOTIFICATION_CACHE}${userId}:${entityId}`;
    const client = redis.client;

    // Get all notifications
    const notifications = await client.lrange(key, 0, -1);

    // Mark all as read
    const updatedNotifications = notifications.map((n) => {
      const parsed = JSON.parse(n);
      return JSON.stringify({ ...parsed, isRead: true });
    });

    // Delete the old list
    await client.del(key);

    // Push all updated notifications back
    if (updatedNotifications.length > 0) {
      await client.rpush(key, ...updatedNotifications);
      await client.expire(key, 7 * 24 * 60 * 60);
    }

    log.debug("Notifications marked as read", { entityId, userId });
  } catch (error) {
    log.error("Error marking notifications as read", {
      entityId,
      userId,
      error,
    });
  }
}

/**
 * Mark a single notification as read in the Redis cache
 */
export async function markNotificationAsReadInCache(
  entityId: string,
  userId: string,
  notificationId: string,
): Promise<void> {
  try {
    const key = `${REDIS_KEYS.NOTIFICATION_CACHE}${userId}:${entityId}`;
    const client = redis.client;

    const notifications = await client.lrange(key, 0, -1);
    const updatedNotifications = notifications.map((n) => {
      const parsed = JSON.parse(n);
      if (parsed.id === notificationId) {
        return JSON.stringify({ ...parsed, isRead: true });
      }
      return n;
    });

    await client.del(key);
    if (updatedNotifications.length > 0) {
      await client.rpush(key, ...updatedNotifications);
      await client.expire(key, 7 * 24 * 60 * 60);
    }
  } catch (error) {
    log.error("Error marking single notification as read in Redis", {
      notificationId,
      error,
    });
  }
}

/**
 * Clear notifications from the user's Redis cache (delete all)
 */
export async function clearNotificationCache(
  entityId: string,
  userId: string,
): Promise<void> {
  try {
    const key = `${REDIS_KEYS.NOTIFICATION_CACHE}${userId}:${entityId}`;
    const client = redis.client;
    await client.del(key);
  } catch (error) {
    log.error("Error clearing notification Redis cache", {
      entityId,
      userId,
      error,
    });
  }
}
/**
 * Increment unread notification count for a specific module
 * Key format: notif:{module}:unread:{userId}:{entityId}
 */
export async function incrementUnreadCount(
  module: string,
  userId: string,
  entityId: string,
): Promise<void> {
  try {
    const key = `notif:${module}:unread:${userId}:${entityId}`;
    const client = redis.client;
    await client.incr(key);
    log.debug("Unread count incremented", { key, module, userId });
  } catch (error) {
    log.error("Error incrementing unread count", {
      module,
      userId,
      entityId,
      error,
    });
  }
}

/**
 * Get unread notification counts for all modules
 * Key format: notif:{module}:unread:{userId}:{entityId}
 */
export async function getUnreadCounts(
  userId: string,
  entityId: string,
): Promise<Record<string, number>> {
  try {
    const modules = [
      "COMMUNITY",
      "FEED",
      "NETWORK",
      "JOB",
      "LISTING",
      "GAMIFICATION",
    ];
    const client = redis.client;
    const pipeline = client.pipeline();

    modules.forEach((module) => {
      const key = `notif:${module}:unread:${userId}:${entityId}`;
      pipeline.get(key);
    });

    const results = await pipeline.exec();
    const counts: Record<string, number> = {};

    modules.forEach((module, index) => {
      const isError = results?.[index]?.[0];
      const value = results?.[index]?.[1];
      counts[module] = isError ? 0 : parseInt((value as string) || "0", 10);
    });

    return counts;
  } catch (error) {
    log.error("Error getting unread notification counts", {
      error,
      userId,
      entityId,
      module: "ALL", // Context that we failed for all modules
    });
    return {};
  }
}

/**
 * Reset unread notification count for a specific module to 0
 */
export async function resetUnreadCount(
  module: string,
  userId: string,
  entityId: string,
): Promise<void> {
  try {
    const key = `notif:${module}:unread:${userId}:${entityId}`;
    const client = redis.client;
    await client.set(key, 0);
    log.debug("Unread count reset to 0", { key, module, userId });
  } catch (error) {
    log.error("Error resetting unread count", {
      module,
      userId,
      entityId,
      error,
    });
  }
}
