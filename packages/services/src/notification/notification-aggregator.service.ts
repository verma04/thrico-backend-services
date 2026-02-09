import { REDIS_KEYS } from "@thrico/shared";
import { log } from "@thrico/logging";
import {
  redis,
  userToEntity,
  user,
  feedMetadataNotification,
} from "@thrico/database";
import { eq, inArray } from "drizzle-orm";
import { NotificationService } from "./notification.service";

export class NotificationAggregatorService {
  private static WINDOW_SIZE = 2 * 60 * 1000; // 2 minutes
  private static MAX_ACTORS = 50;

  /**
   * Push a notification event to a Redis-based aggregation bucket.
   */
  static async pushEvent(params: {
    recipientId: string;
    actorId: string;
    type: "FEED_LIKE" | "FEED_COMMENT";
    feedId: string;
    entityId: string;
  }) {
    const { recipientId, actorId, type, feedId, entityId } = params;

    // Create a 5-minute window ID
    const windowId = Math.floor(Date.now() / this.WINDOW_SIZE);

    // Key format: agg_notif:{recipientId}:{type}:{feedId}:{windowId}
    const bucketKey = `${REDIS_KEYS.NOTIFICATION_AGGREGATION}${recipientId}:${type}:${feedId}:${windowId}`;
    const registryKey = `${REDIS_KEYS.NOTIFICATION_AGGREGATION}active_buckets`;
    const client = redis.client;

    try {
      log.info("➕ Pushing event to aggregation bucket", {
        recipientId,
        actorId,
        type,
        feedId,
        windowId,
        bucketKey,
      });

      // Add actor to the bucket (Set ensures uniqueness and deduplication)
      const count = await client.scard(bucketKey);
      log.debug(`Current bucket size: ${count}`);

      if (count < this.MAX_ACTORS) {
        await client.sadd(bucketKey, actorId);
        log.debug(`Added actor to bucket, new size: ${count + 1}`);
      } else {
        log.warn(`Bucket full (${count}/${this.MAX_ACTORS}), skipping actor`);
      }

      // Store entityId for the final notification creation
      const metadataKey = `${bucketKey}:meta`;
      await client.hset(metadataKey, "entityId", entityId);

      // Register this bucket as active for the flush job
      await client.sadd(registryKey, bucketKey);

      // Set TTL to 1 hour to ensure cleanup even if flush fails
      await client.expire(bucketKey, 3600);
      await client.expire(metadataKey, 3600);

      log.info("✅ Event successfully pushed to Redis", {
        bucketKey,
        actorId,
        windowId,
      });
    } catch (error) {
      log.error("❌ Failed to push event to aggregator", { error, bucketKey });
    }
  }

  /**
   * Process all active aggregation buckets that have completed their time window.
   */
  static async flushBuckets(db: any) {
    const registryKey = `${REDIS_KEYS.NOTIFICATION_AGGREGATION}active_buckets`;
    const client = redis.client;
    const lockKey = `${REDIS_KEYS.NOTIFICATION_AGGREGATION}flush_lock`;

    try {
      log.info("🔄 Starting flushBuckets process");

      // Distributed lock to prevent multiple workers from flushing simultaneously
      const lock = await client.set(lockKey, "locked", "PX", 60000, "NX");
      if (!lock) {
        log.debug("⏭️  Flush already in progress, skipping");
        return;
      }

      const activeBuckets = await client.smembers(registryKey);
      log.info(`📦 Found ${activeBuckets.length} active buckets`, {
        activeBuckets,
      });

      const currentWindow = Math.floor(Date.now() / this.WINDOW_SIZE);
      log.info(`⏱️  Current window: ${currentWindow}`);

      for (const bucketKey of activeBuckets) {
        try {
          const parts = bucketKey.split(":");
          const windowId = parseInt(parts[parts.length - 1]);

          log.info(
            `🔍 Processing bucket: ${bucketKey}, windowId: ${windowId}, currentWindow: ${currentWindow}`,
          );

          // Only flush windows that have already passed
          if (windowId >= currentWindow) {
            log.info(
              `⏸️  Bucket ${bucketKey} not ready yet (window ${windowId} >= ${currentWindow})`,
            );
            continue;
          }

          const actorIds = await client.smembers(bucketKey);
          log.info(`👥 Bucket ${bucketKey} has ${actorIds.length} actors`);

          if (actorIds.length === 0) {
            await client.srem(registryKey, bucketKey);
            log.debug(`🗑️  Removed empty bucket: ${bucketKey}`);
            continue;
          }

          const metadataKey = `${bucketKey}:meta`;
          const entityId = await client.hget(metadataKey, "entityId");

          // Extract components from key: agg_notif:{recipientId}:{type}:{feedId}:{windowId}
          const bucketStr = bucketKey.substring(
            REDIS_KEYS.NOTIFICATION_AGGREGATION.length,
          );
          const [recipientId, type, feedId] = bucketStr.split(":");

          log.info(`🔔 Creating aggregated notification`, {
            recipientId,
            type,
            feedId,
            actorCount: actorIds.length,
          });

          await this.createAggregatedNotification({
            db,
            recipientId,
            actorIds,
            type: type as "FEED_LIKE" | "FEED_COMMENT",
            feedId,
            entityId: entityId || "",
          });

          // Cleanup Redis keys
          await client.del(bucketKey, metadataKey);
          await client.srem(registryKey, bucketKey);

          log.info(
            `✅ Successfully processed and cleaned up bucket: ${bucketKey}`,
          );
        } catch (bucketError) {
          log.error("Failed to process bucket during flush", {
            bucketKey,
            error: bucketError,
          });
        }
      }

      await client.del(lockKey);
      log.info("✅ Flush process completed");
    } catch (error) {
      log.error("Error flushing aggregation buckets", { error });
      await client.del(lockKey);
    }
  }

  /**
   * Internal helper to create the actual database record and push notification.
   */
  private static async createAggregatedNotification(params: {
    db: any;
    recipientId: string;
    actorIds: string[];
    type: "FEED_LIKE" | "FEED_COMMENT";
    feedId: string;
    entityId: string;
  }) {
    const { db, recipientId, actorIds, type, feedId, entityId } = params;

    console.log("🚀 Aggregating notification", {
      recipientId,
      type,
      feedId,
      actorCount: actorIds.length,
    });

    try {
      log.info("🎯 Starting createAggregatedNotification", {
        recipientId,
        type,
        feedId,
        actorCount: actorIds.length,
      });

      // Fetch names of the first actor for personalization
      const actors = await db
        .select({
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        })
        .from(user)
        .where(inArray(user.id, actorIds))
        .limit(2); // Get up to 2 for better formatting if desired
      log.info("actors", { actors });

      log.debug(`Found ${actors.length} actors`, { actors });

      if (actors.length === 0) {
        log.warn("No actors found, skipping notification");
        return;
      }

      const firstActorName = `${actors[0].firstName} ${actors[0].lastName}`;
      const othersCount = actorIds.length - 1;

      let content = "";
      let pushTitle = "";

      if (type === "FEED_LIKE") {
        content =
          othersCount > 0
            ? `${firstActorName} and ${othersCount} others liked your post`
            : `${firstActorName} liked your post`;
        pushTitle = "New Likes";
      } else {
        content =
          othersCount > 0
            ? `${firstActorName} and ${othersCount} others commented on your post`
            : `${firstActorName} commented on your post`;
        pushTitle = "New Comments";
      }

      log.info("📝 Creating database notification", { content, pushTitle });

      // Create database notification record first
      const notification = await NotificationService.createNotification({
        db,
        userId: recipientId,
        senderId: actorIds[0],
        entityId,
        content,
        notificationType: type,
        feedId,
        shouldSendPush: false, // We'll send push manually below
        imageUrl: actors[0].avatar || undefined,
      });

      log.info("✅ Database notification created", {
        notificationId: notification.id,
      });

      // Store feed notification metadata with actor list
      await db.insert(feedMetadataNotification).values({
        user: recipientId,
        feed: feedId,
        type,
        notification: notification.id,
        content,
        actors: actorIds,
        count: actorIds.length,
      });

      log.info("✅ Metadata inserted");

      // Send push notification
      log.info("📲 Sending push notification", {
        recipientId,
        entityId,
        title: pushTitle,
      });

      const pushResult = await NotificationService.sendPushNotification({
        userId: recipientId,
        entityId,
        title: pushTitle,
        body: content,
        payload: {
          type,
          feedId,
          notificationId: notification.id,
          count: actorIds.length,
        },
      });

      log.info("✅ Push notification sent", { pushResult });

      log.info("🎉 Aggregated notification created successfully", {
        type,
        recipientId,
        count: actorIds.length,
        notificationId: notification.id,
      });
      return true;
    } catch (error) {
      log.error("❌ Failed to create aggregated notification", {
        error,
        recipientId,
        type,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
