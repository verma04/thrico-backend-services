import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  feedReactions,
  notifications,
  user,
  userFeed,
  userToEntity,
  pushNotificationToCache,
  getNotificationsFromCache,
  markNotificationAsReadInCache,
  USER_LOGIN_SESSION,
} from "@thrico/database";
import { FirebaseService } from "./firebase";

export class NotificationService {
  static async getUserNotifications({
    db,
    currentUserId,
    getUnreadCountFn,
    limit = 10,
    offset = 0,
  }: {
    db: any;
    currentUserId: string;
    getUnreadCountFn?: (userId: string) => Promise<number>;
    limit?: number;
    offset?: number;
  }) {
    try {
      if (!currentUserId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user notifications", { userId: currentUserId });

      const result = await db
        .select({
          id: notifications.id,
          sender: {
            senderId: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          feed: userFeed,
          content: notifications.content,
          notificationType: notifications.notificationType,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          like: sql<Array<object>>`ARRAY(
            SELECT ${user}
            FROM ${feedReactions}
            LEFT JOIN ${userToEntity} ON ${feedReactions.userId} = ${userToEntity.id}
            LEFT JOIN ${user} ON ${userToEntity.userId} = ${user.id}
            WHERE ${feedReactions.feedId} = ${userFeed.id} AND ${feedReactions.userId} != ${currentUserId}
          )`,
          totalLikes: sql<Array<string>>`ARRAY(
            SELECT ${feedReactions.id}
            FROM ${feedReactions}
            WHERE ${feedReactions.feedId} = ${userFeed.id}
          )`,
        })
        .from(notifications)
        .leftJoin(userToEntity, eq(notifications.sender, userToEntity.id))
        .leftJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(userFeed, eq(notifications.feed, userFeed.id))
        .where(eq(notifications.user, currentUserId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      let unreadCount = 0;
      if (getUnreadCountFn) {
        unreadCount = await getUnreadCountFn(currentUserId);
      }

      log.info("User notifications retrieved", {
        userId: currentUserId,
        count: result.length,
        unreadCount,
      });

      return {
        unread: unreadCount,
        result: result,
      };
    } catch (error) {
      log.error("Error in getUserNotifications", {
        error,
        userId: currentUserId,
      });
      throw error;
    }
  }

  static async markNotificationAsRead({
    db,
    notificationId,
    userId,
  }: {
    db: any;
    notificationId: string;
    userId: string;
  }) {
    try {
      if (!notificationId || !userId) {
        throw new GraphQLError("Notification ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Marking notification as read", { notificationId, userId });

      const [updated] = await db
        .update(notifications)
        .set({ isRead: "true" })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.user, userId),
          ),
        )
        .returning();

      if (updated) {
        // Sync with Redis cache
        await markNotificationAsReadInCache(
          updated.entity,
          userId,
          notificationId,
        ).catch((err) => {
          log.error("Failed to mark notification as read in cache", {
            notificationId,
            error: err.message,
          });
        });
      }

      return { success: !!updated };
    } catch (error) {
      log.error("Error in markNotificationAsRead", {
        error,
        notificationId,
        userId,
      });
      throw error;
    }
  }

  static async deleteNotification({
    db,
    notificationId,
    userId,
  }: {
    db: any;
    notificationId: string;
    userId: string;
  }) {
    try {
      if (!notificationId || !userId) {
        throw new GraphQLError("Notification ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Deleting notification", { notificationId, userId });

      const [deleted] = await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.user, userId),
          ),
        )
        .returning();

      if (!deleted) {
        throw new GraphQLError(
          "Notification not found or you don't have permission to delete it.",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      log.info("Notification deleted", { notificationId, userId });
      return deleted;
    } catch (error) {
      log.error("Error in deleteNotification", {
        error,
        notificationId,
        userId,
      });
      throw error;
    }
  }

  static async createNotification({
    db,
    userId,
    senderId,
    entityId,
    content,
    notificationType,
    feedId,
    shouldSendPush,
    pushTitle,
    pushBody,
    communityId,
    commNotifType,
    imageUrl,
    listingId,
    jobId,
  }: {
    db: any;
    userId: string;
    senderId?: string;
    entityId: string;
    content: string;
    notificationType: string;
    feedId?: string;
    shouldSendPush?: boolean;
    pushTitle?: string;
    pushBody?: string;
    communityId?: string;
    commNotifType?: any; // Using any for now to avoid circular dependency or import issues if not careful
    imageUrl?: string;
    listingId?: string;
    jobId?: string;
  }) {
    try {
      if (!userId || !content || !notificationType || !entityId) {
        throw new GraphQLError(
          "User ID, entity ID, content, and notification type are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Creating notification", {
        userId,
        entityId,
        notificationType,
      });

      const [notification] = await db
        .insert(notifications)
        .values({
          user: userId,
          sender: senderId,
          entity: entityId,
          content,
          notificationType,
          feed: feedId,
          isRead: "false",
        })
        .returning();

      // If it's a community notification, also insert into the separate table
      if (communityId && commNotifType) {
        const { communityMetadataNotification } =
          await import("@thrico/database");
        await db.insert(communityMetadataNotification).values({
          user: userId,
          community: communityId,
          type: commNotifType,
          notification: notification.id,
          content,
        });
      }

      // // Cache in Redis (which now also publishes for SSE)
      // await pushNotificationToCache(entityId, userId, notification);

      console.log({
        userId,
        entityId,
        title: pushTitle || "New Notification",
        body: pushBody || content,
        payload: {
          notificationId: notification.id,
          notificationType,
          communityId: communityId,
          commNotifType: commNotifType,
          imageUrl: imageUrl,
          listingId: listingId,
          jobId: jobId,
        },
      });
      // Trigger Push if requested
      if (shouldSendPush) {
        this.sendPushNotification({
          userId,
          entityId,
          title: pushTitle || "New Notification",
          body: pushBody || content,
          payload: {
            notificationId: notification.id,
            notificationType,
            communityId: communityId,
            commNotifType: commNotifType,
            image: imageUrl,
            listingId: listingId,
            jobId: jobId,
          },
        }).catch((err: any) => {
          log.error("Failed to send push as part of notification creation", {
            userId,
            error: err.message,
          });
        });
      }

      log.info("Notification created, cached, and potentially pushed", {
        notificationId: notification.id,
        userId,
        entityId,
        notificationType,
        shouldSendPush,
      });
      return notification;
    } catch (error) {
      log.error("Error in createNotification", {
        error,
        userId,
        entityId,
        notificationType,
      });
      throw error;
    }
  }

  static async getNotificationsByEntityAndUser({
    entityId,
    userId,
  }: {
    entityId: string;
    userId: string;
  }) {
    try {
      log.debug("Getting notifications from Redis cache", { entityId, userId });
      const notifications = await getNotificationsFromCache(entityId, userId);
      return notifications;
    } catch (error) {
      log.error("Error in getNotificationsByEntityAndUser", {
        error,
        entityId,
        userId,
      });
      return [];
    }
  }

  static async getTargetDeviceTokens({
    userId,
    entityId,
  }: {
    userId: string;
    entityId: string;
  }) {
    try {
      log.debug("Getting target device tokens", { userId, entityId });

      // Query DynamoDB for user sessions using scan as fallback for missing index
      const sessions = await USER_LOGIN_SESSION.scan("userId")
        .eq(userId)
        .exec();

      // Filter sessions by active entity or fallback
      const targetSessions = sessions.filter(
        (s: any) =>
          s.deviceToken && (!s.activeEntityId || s.activeEntityId === entityId),
      );

      const tokens = targetSessions.map((s: any) => s.deviceToken);

      log.info("Target device tokens retrieved", {
        userId,
        entityId,
        tokenCount: tokens.length,
      });

      return tokens;
    } catch (error) {
      log.error("Error in getTargetDeviceTokens", { error, userId, entityId });
      return [];
    }
  }

  static async removeInvalidDeviceToken(token: string) {
    try {
      log.info("Removing invalid device token", { token });

      // Find all sessions with this device token
      const sessions = await USER_LOGIN_SESSION.scan("deviceToken")
        .eq(token)
        .exec();

      if (sessions.length > 0) {
        log.info(
          `Found ${sessions.length} sessions with invalid token. Removing...`,
        );
        await Promise.all(sessions.map((session: any) => session.delete()));
      }
    } catch (error) {
      log.error("Error in removeInvalidDeviceToken", { error, token });
    }
  }

  /**
   * Send a push notification to all active devices of a user in an entity context
   */
  static async sendPushNotification({
    userId,
    entityId,
    title,
    body,
    payload,
  }: {
    userId: string;
    entityId: string;
    title: string;
    body: string;
    payload?: any;
  }) {
    try {
      log.debug("Preparing to send push notification", {
        userId,
        entityId,
        title,
      });

      const tokens = await this.getTargetDeviceTokens({ userId, entityId });

      if (tokens.length === 0) {
        log.info("No active device tokens found for user in entity context", {
          userId,
          entityId,
        });
        return;
      }

      log.info(`Sending push notification to ${tokens.length} devices`, {
        userId,
        entityId,
        title,
      });

      return await FirebaseService.sendToDevices({
        tokens,
        title,
        body,
        payload,
      });
    } catch (error) {
      log.error("Error in sendPushNotification", { error, userId, entityId });
      return { success: false, error };
    }
  }

  static async countUnreadNotifications({
    db,
    userId,
    notificationTypes,
  }: {
    db: any;
    userId: string;
    notificationTypes: string[];
  }) {
    try {
      if (!userId || !notificationTypes || notificationTypes.length === 0) {
        throw new GraphQLError("User ID and notification types are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const { inArray } = await import("drizzle-orm");

      const [result] = await db
        .select({
          count: sql<number>`count(${notifications.id})::int`,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.user, userId),
            inArray(notifications.notificationType, notificationTypes as any),
            eq(notifications.isRead, "false"),
          ),
        );

      return result?.count || 0;
    } catch (error) {
      log.error("Error in countUnreadNotifications", {
        error,
        userId,
        notificationTypes,
      });
      throw error;
    }
  }

  static async getFeedNotifications({
    db,
    userId,
    cursor,
    limit = 10,
  }: {
    db: any;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    try {
      const { lt, inArray } = await import("drizzle-orm");
      const { feedMetadataNotification } = await import("@thrico/database");

      log.debug("Getting feed notifications", { userId, cursor, limit });

      const feedTypes = ["FEED_COMMENT", "FEED_LIKE"];

      const query = db
        .select({
          id: notifications.id,
          notificationType: notifications.notificationType,
          content: notifications.content,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          sender: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          feed: userFeed,
          metadata: feedMetadataNotification,
        })
        .from(notifications)
        .leftJoin(user, eq(notifications.sender, user.id))

        .leftJoin(userFeed, eq(notifications.feed, userFeed.id))
        .leftJoin(
          feedMetadataNotification,
          eq(notifications.id, feedMetadataNotification.notification),
        )
        .where(
          and(
            eq(notifications.user, userId),
            inArray(notifications.notificationType, feedTypes as any),
            cursor ? lt(notifications.createdAt, new Date(cursor)) : undefined,
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getFeedNotifications", { error, userId });
      throw error;
    }
  }

  static async getCommunityNotifications({
    db,
    userId,
    cursor,
    limit = 10,
  }: {
    db: any;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    try {
      const { lt, inArray } = await import("drizzle-orm");
      const { communityMetadataNotification, groups } =
        await import("@thrico/database");

      log.debug("Getting community notifications", { userId, cursor, limit });

      const communityTypes = [
        "COMMUNITIES",
        "COMMUNITY_CREATED",
        "COMMUNITY_JOIN_REQUEST",
        "COMMUNITY_RATING",
        "COMMUNITY_ROLE_UPDATED",
        "COMMUNITY_JOIN_APPROVED",
      ];

      const query = db
        .select({
          id: notifications.id,
          notificationType: notifications.notificationType,
          content: notifications.content,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          sender: {
            id: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          community: {
            id: groups.id,
            title: groups.title,
            slug: groups.slug,
            cover: groups.cover,
          },
          metadata: communityMetadataNotification,
        })
        .from(notifications)
        .leftJoin(userToEntity, eq(notifications.sender, userToEntity.id))
        .leftJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(
          communityMetadataNotification,
          eq(notifications.id, communityMetadataNotification.notification),
        )
        .leftJoin(
          groups,
          eq(communityMetadataNotification.community, groups.id),
        )
        .where(
          and(
            eq(notifications.user, userId),
            inArray(notifications.notificationType, communityTypes as any),
            cursor ? lt(notifications.createdAt, new Date(cursor)) : undefined,
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getCommunityNotifications", { error, userId });
      throw error;
    }
  }

  static async getNetworkNotifications({
    db,
    userId,
    cursor,
    limit = 10,
  }: {
    db: any;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    try {
      const { lt, inArray } = await import("drizzle-orm");

      log.debug("Getting network notifications", { userId, cursor, limit });

      const networkTypes = ["CONNECTION_REQUEST", "CONNECTION_ACCEPTED"];

      const query = db
        .select({
          id: notifications.id,
          notificationType: notifications.notificationType,
          content: notifications.content,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          sender: {
            id: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
        })
        .from(notifications)
        .leftJoin(userToEntity, eq(notifications.sender, userToEntity.id))
        .leftJoin(user, eq(userToEntity.userId, user.id))
        .where(
          and(
            eq(notifications.user, userId),
            inArray(notifications.notificationType, networkTypes as any),
            cursor ? lt(notifications.createdAt, new Date(cursor)) : undefined,
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getNetworkNotifications", { error, userId });
      throw error;
    }
  }
}
