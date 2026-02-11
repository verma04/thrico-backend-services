import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  notifications,
  communityNotifications,
  feedNotifications,
  networkNotifications,
  jobNotifications,
  listingNotifications,
  gamificationNotifications,
  user,
  userFeed,
  userToEntity,
  pushNotificationToCache,
  getNotificationsFromCache,
  markNotificationAsReadInCache,
  incrementUnreadCount,
  getUnreadCounts,
  USER_LOGIN_SESSION,
  resetUnreadCount,
} from "@thrico/database";
import { FirebaseService } from "./firebase";

export class NotificationService {
  static async getUserNotifications({
    db,
    currentUserId,
    getUnreadCountFn,
    limit = 10,
    cursor,
  }: {
    db: any;
    currentUserId: string;
    getUnreadCountFn?: (userId: string) => Promise<number>;
    limit?: number;
    cursor?: string;
  }) {
    try {
      if (!currentUserId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user notifications", {
        userId: currentUserId,
        cursor,
      });

      // Import lt from drizzle-orm
      const { lt } = await import("drizzle-orm");

      // Fetch notifications from central registry joined with all modules
      const rows = await db
        .select({
          id: notifications.id,
          module: notifications.module,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          // Module Data
          community: communityNotifications,
          feed: feedNotifications,
          network: networkNotifications,
          job: jobNotifications,
          listing: listingNotifications,
          gamification: gamificationNotifications,
        })
        .from(notifications)
        .leftJoin(
          communityNotifications,
          eq(notifications.communityNotificationId, communityNotifications.id),
        )
        .leftJoin(
          feedNotifications,
          eq(notifications.feedNotificationId, feedNotifications.id),
        )
        .leftJoin(
          networkNotifications,
          eq(notifications.networkNotificationId, networkNotifications.id),
        )
        .leftJoin(
          jobNotifications,
          eq(notifications.jobNotificationId, jobNotifications.id),
        )
        .leftJoin(
          listingNotifications,
          eq(notifications.listingNotificationId, listingNotifications.id),
        )
        .leftJoin(
          gamificationNotifications,
          eq(
            notifications.gamificationNotificationId,
            gamificationNotifications.id,
          ),
        )
        .where(
          and(
            eq(notifications.userId, currentUserId),
            cursor ? lt(notifications.createdAt, new Date(cursor)) : undefined,
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      // Collect IDs for batch fetching related data
      const senderIds = new Set<string>();
      const feedIds = new Set<string>();

      rows.forEach((row: any) => {
        let senderId;
        if (row.community) senderId = row.community.senderId;
        else if (row.feed) {
          senderId = row.feed.senderId;
          if (row.feed.feedId) feedIds.add(row.feed.feedId);
        } else if (row.network) senderId = row.network.senderId;
        else if (row.job) senderId = row.job.senderId;
        else if (row.listing) senderId = row.listing.senderId;

        if (senderId) senderIds.add(senderId);
      });

      // Fetch related data
      let senderMap = new Map();
      if (senderIds.size > 0) {
        const senders = await db
          .select({
            senderId: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          })
          .from(userToEntity)
          .leftJoin(user, eq(userToEntity.userId, user.id))
          .where(inArray(userToEntity.id, Array.from(senderIds)));
        senderMap = new Map(senders.map((s: any) => [s.senderId, s]));
      }

      let feedMap = new Map();
      if (feedIds.size > 0) {
        const feeds = await db
          .select()
          .from(userFeed)
          .where(inArray(userFeed.id, Array.from(feedIds)));
        feedMap = new Map(feeds.map((f: any) => [f.id, f]));
      }

      // Map results to unified structure
      const result = rows.map((row: any) => {
        let content = "";
        let type = "";
        let senderId = null;
        let feedData = null;
        let additionalData = {};

        if (row.community) {
          content = row.community.content;
          type = row.community.type;
          senderId = row.community.senderId;
          additionalData = { communityId: row.community.communityId };
        } else if (row.feed) {
          content = row.feed.content;
          type = row.feed.type;
          senderId = row.feed.senderId;
          if (row.feed.feedId) feedData = feedMap.get(row.feed.feedId);
        } else if (row.network) {
          content = row.network.content;
          type = row.network.type;
          senderId = row.network.senderId;
        } else if (row.job) {
          content = row.job.content;
          type = row.job.type;
          senderId = row.job.senderId;
          additionalData = { jobId: row.job.jobId };
        } else if (row.listing) {
          content = row.listing.content;
          type = row.listing.type;
          senderId = row.listing.senderId;
          additionalData = { listingId: row.listing.listingId };
        } else if (row.gamification) {
          content = row.gamification.content;
          type = row.gamification.type;
          additionalData = {
            points: row.gamification.points,
            badgeName: row.gamification.badgeName,
            badgeImageUrl: row.gamification.badgeImageUrl,
            rankName: row.gamification.rankName,
          };
        }

        const sender = senderId ? senderMap.get(senderId) : null;

        return {
          id: row.id,
          sender: sender || null,
          feed: feedData || null,
          content,
          type,
          module: row.module,
          isRead: row.isRead,
          createdAt: row.createdAt,
          ...additionalData,
        };
      });

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
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getUserNotifications", {
        error,
        userId: currentUserId,
      });
      throw error;
    }
  }

  static async markAllNotificationsAsRead({
    userId,
    entityId,
    module,
  }: {
    userId: string;
    entityId: string;
    module: string;
  }) {
    try {
      if (!userId || !entityId || !module) {
        throw new GraphQLError("User ID, Entity ID and Module are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      await resetUnreadCount(module, userId, entityId);

      return { success: true };
    } catch (error) {
      log.error("Error in markAllNotificationsAsRead", {
        error,
        userId,
        entityId,
        module,
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
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId),
          ),
        )
        .returning();

      if (updated) {
        // Sync with Redis cache
        await markNotificationAsReadInCache(
          updated.entityId,
          userId,
          notificationId,
        ).catch((err: any) => {
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
    // try {
    //   if (!notificationId || !userId) {
    //     throw new GraphQLError("Notification ID and User ID are required.", {
    //       extensions: { code: "BAD_USER_INPUT" },
    //     });
    //   }
    //   log.debug("Deleting notification", { notificationId, userId });
    //   const [deleted] = await db
    //     .delete(notifications)
    //     .where(
    //       and(
    //         eq(notifications.id, notificationId),
    //         eq(notifications.user, userId),
    //       ),
    //     )
    //     .returning();
    //   if (!deleted) {
    //     throw new GraphQLError(
    //       "Notification not found or you don't have permission to delete it.",
    //       {
    //         extensions: { code: "FORBIDDEN" },
    //       },
    //     );
    //   }
    //   log.info("Notification deleted", { notificationId, userId });
    //   return deleted;
    // } catch (error) {
    //   log.error("Error in deleteNotification", {
    //     error,
    //     notificationId,
    //     userId,
    //   });
    //   throw error;
    // }
  }

  static async createNotification({
    db,
    userId,
    senderId,
    entityId,
    content,
    module,
    type,
    feedId,
    communityId,
    jobId,
    listingId,
    imageUrl,
    points,
    badgeName,
    badgeImageUrl,
    rankName,
    actors,
    count,
    shouldSendPush,
    pushTitle,
    pushBody,
    contentId,
    isIncrementUnreadCount = true,
  }: {
    db: any;
    userId: string;
    senderId?: string;
    entityId: string;
    content: string;
    module:
      | "COMMUNITY"
      | "FEED"
      | "NETWORK"
      | "JOB"
      | "LISTING"
      | "GAMIFICATION";
    type: string;
    feedId?: string;
    communityId?: string;
    jobId?: string;
    listingId?: string;
    imageUrl?: string;
    points?: number;
    badgeName?: string;
    badgeImageUrl?: string;
    rankName?: string;
    actors?: string[];
    count?: number;
    shouldSendPush?: boolean;
    pushTitle?: string;
    pushBody?: string;
    contentId?: string;
    isIncrementUnreadCount?: boolean;
  }) {
    try {
      if (!userId || !content || !type || !entityId || !module) {
        throw new GraphQLError(
          "User ID, entity ID, content, type, and module are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Creating notification", {
        userId,
        entityId,
        module,
        type,
      });

      // Import module-specific tables
      const {
        communityNotifications,
        feedNotifications,
        networkNotifications,
        jobNotifications,
        listingNotifications,
        gamificationNotifications,
        notifications: centralNotifications,
      } = await import("@thrico/database");

      let moduleNotificationId: string;

      // Create notification in module-specific table
      switch (module) {
        case "COMMUNITY":
          console.log(contentId, "sdsddsds");
          if (!communityId || !contentId) {
            throw new GraphQLError(
              "Community ID required for community notifications",
            );
          }
          const [communityNotif] = await db
            .insert(communityNotifications)
            .values({
              type,
              userId,
              senderId,
              entityId,
              communityId: communityId || contentId,
              content,
              imageUrl,
              isRead: false,
            })
            .returning();
          moduleNotificationId = communityNotif.id;
          break;

        case "FEED":
          // if (feedId) {
          //   throw new GraphQLError("Feed ID required for feed notifications");
          // }
          const [feedNotif] = await db
            .insert(feedNotifications)
            .values({
              type,
              userId,
              senderId: senderId! || contentId!,
              entityId,
              feedId,
              content,
              actors,
              count: count || 1,
              isRead: false,
            })
            .returning();
          moduleNotificationId = feedNotif.id;
          break;

        case "NETWORK":
          const [networkNotif] = await db
            .insert(networkNotifications)
            .values({
              type,
              userId,
              senderId: senderId!,
              entityId,
              content,
              isRead: false,
            })
            .returning();
          moduleNotificationId = networkNotif.id;
          break;

        case "JOB":
          if (!jobId) {
            throw new GraphQLError("Job ID required for job notifications");
          }
          const [jobNotif] = await db
            .insert(jobNotifications)
            .values({
              type,
              userId,
              senderId,
              entityId,
              jobId: jobId || contentId,
              content,
              isRead: false,
            })
            .returning();
          moduleNotificationId = jobNotif.id;
          break;

        case "LISTING":
          if (!listingId) {
            throw new GraphQLError(
              "Listing ID required for listing notifications",
            );
          }
          const [listingNotif] = await db
            .insert(listingNotifications)
            .values({
              type,
              userId,
              senderId,
              entityId,
              listingId: listingId || contentId,
              content,
              isRead: false,
            })
            .returning();
          moduleNotificationId = listingNotif.id;
          break;

        case "GAMIFICATION":
          const [gamificationNotif] = await db
            .insert(gamificationNotifications)
            .values({
              type,
              userId,
              entityId,
              content,
              points,
              badgeName,
              badgeImageUrl,
              rankName,
              isRead: false,
            })
            .returning();
          moduleNotificationId = gamificationNotif.id;
          break;

        default:
          throw new GraphQLError(`Unknown notification module: ${module}`);
      }

      // Create entry in central notifications registry
      const [centralNotification] = await db
        .insert(centralNotifications)
        .values({
          module,
          userId,
          entityId,
          isRead: false,
          // Link to module-specific notification
          [`${module.toLowerCase()}NotificationId`]: moduleNotificationId,
        })
        .returning();

      log.info("Notification created in module and central registry", {
        centralNotificationId: centralNotification.id,
        moduleNotificationId,
        userId,
        module,
        type,
      });

      // Increment unread count in Redis
      if (isIncrementUnreadCount) {
        await incrementUnreadCount(module, userId, entityId);
      }

      // Trigger Push if requested
      if (shouldSendPush) {
        this.sendPushNotification({
          userId,
          entityId,
          title: pushTitle || "New Notification",
          body: pushBody || content,
          payload: {
            notificationId: centralNotification.id,
            module,
            type,
            id: contentId || communityId || jobId || listingId || feedId,
            image: imageUrl,
          },
        }).catch((err: any) => {
          log.error("Failed to send push as part of notification creation", {
            userId,
            error: err.message,
          });
        });
      }

      return centralNotification;
    } catch (error) {
      log.error("Error in createNotification", {
        error,
        userId,
        entityId,
        module,
        type,
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

      // const { inArray } = await import("drizzle-orm");

      // const [result] = await db
      //   .select({
      //     count: sql<number>`count(${notifications.id})::int`,
      //   })
      //   .from(notifications)
      //   .where(
      //     and(
      //       eq(notifications.user, userId),
      //       inArray(notifications.notificationType, notificationTypes as any),
      //       eq(notifications.isRead, "false"),
      //     ),
      //   );

      // return result?.count || 0;
    } catch (error) {
      log.error("Error in countUnreadNotifications", {
        error,
        userId,
        notificationTypes,
      });
      throw error;
    }
  }

  static async getUnreadNotificationCounts({
    userId,
    entityId,
  }: {
    userId: string;
    entityId: string;
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      return await getUnreadCounts(userId, entityId);
    } catch (error) {
      log.error("Error in getUnreadNotificationCounts", {
        error,
        userId,
        entityId,
      });
      throw error;
    }
  }
}
