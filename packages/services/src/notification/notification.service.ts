import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  feedReactions,
  notifications,
  user,
  userFeed,
  userToEntity,
} from "@thrico/database";

export class NotificationService {
  static async getUserNotifications({
    db,
    currentUserId,
    getUnreadCountFn,
  }: {
    db: any;
    currentUserId: string;
    getUnreadCountFn?: (userId: string) => Promise<number>;
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
        .orderBy(desc(notifications.createdAt));

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

      // TODO: Implement when isRead field is added to notifications table
      log.warn("markNotificationAsRead not yet implemented", {
        notificationId,
        userId,
      });

      return { success: true };
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
            eq(notifications.user, userId)
          )
        )
        .returning();

      if (!deleted) {
        throw new GraphQLError(
          "Notification not found or you don't have permission to delete it.",
          {
            extensions: { code: "FORBIDDEN" },
          }
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
    content,
    notificationType,
    feedId,
  }: {
    db: any;
    userId: string;
    senderId?: string;
    content: string;
    notificationType: string;
    feedId?: string;
  }) {
    try {
      if (!userId || !content || !notificationType) {
        throw new GraphQLError(
          "User ID, content, and notification type are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Creating notification", { userId, notificationType });

      const [notification] = await db
        .insert(notifications)
        .values({
          user: userId,
          sender: senderId,
          content,
          notificationType,
          feed: feedId,
        })
        .returning();

      log.info("Notification created", {
        notificationId: notification.id,
        userId,
        notificationType,
      });
      return notification;
    } catch (error) {
      log.error("Error in createNotification", {
        error,
        userId,
        notificationType,
      });
      throw error;
    }
  }
}
