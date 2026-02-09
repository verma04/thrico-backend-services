import { log } from "@thrico/logging";
import {
  getNotificationsFromCache,
  markNotificationsAsRead,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const notificationResolvers = {
  Query: {
    async getUserNotification(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const { NotificationService } = await import("@thrico/services");

        return await NotificationService.getUserNotifications({
          db,
          currentUserId: userId,
          limit: input?.limit || 10,
          offset: input?.offset || 0,
        });
      } catch (error) {
        log.error("Error in getUserNotification", { error, input });
        throw error;
      }
    },
    async getGamificationNotifications(_: any, __: any, context: any) {
      try {
        const { userId, entityId } = context.user || (await checkAuth(context));

        log.debug("Fetching gamification notifications from Redis", {
          userId,
          entityId,
        });

        const notifications = await getNotificationsFromCache(entityId, userId);
        const unreadCount = notifications.filter((n) => !n.isRead).length;

        return unreadCount;
      } catch (error) {
        log.error("Error in getGamificationNotifications", { error });
        throw error;
      }
    },
    async getGamificationNotification(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId } = context.user || (await checkAuth(context));
        const notifications = await getNotificationsFromCache(
          entityId,
          userId,
          false,
          input?.limit || 10,
          input?.offset || 0,
        );
        return notifications;
      } catch (error) {
        log.error("Error in getGamificationNotification", { error });
        throw error;
      }
    },
    async getNetworkNotification(_: any, __: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        const { NotificationService } = await import("@thrico/services");
        return await NotificationService.countUnreadNotifications({
          db,
          userId,
          notificationTypes: ["CONNECTION_REQUEST", "CONNECTION_ACCEPTED"],
        });
      } catch (error) {
        log.error("Error in getNetworkNotification", { error });
        throw error;
      }
    },
    async getFeedNotifications(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const { NotificationService } = await import("@thrico/services");

        return await NotificationService.getFeedNotifications({
          db,
          userId,
          cursor: input?.cursor,
          limit: input?.limit || 10,
        });
      } catch (error) {
        log.error("Error in getFeedNotifications", { error, input });
        throw error;
      }
    },
    async getCommunityNotifications(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const { NotificationService } = await import("@thrico/services");

        return await NotificationService.getCommunityNotifications({
          db,
          userId,
          cursor: input?.cursor,
          limit: input?.limit || 10,
        });
      } catch (error) {
        log.error("Error in getCommunityNotifications", { error, input });
        throw error;
      }
    },
    async getNetworkNotifications(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const { NotificationService } = await import("@thrico/services");

        return await NotificationService.getNetworkNotifications({
          db,
          userId,
          cursor: input?.cursor,
          limit: input?.limit || 10,
        });
      } catch (error) {
        log.error("Error in getNetworkNotifications", { error, input });
        throw error;
      }
    },
  },

  Mutation: {
    async markGamificationNotificationsAsRead(_: any, __: any, context: any) {
      try {
        const { userId, entityId } = context.user || (await checkAuth(context));

        log.debug("Marking gamification notifications as read in Redis", {
          userId,
          entityId,
        });

        await markNotificationsAsRead(entityId, userId);

        return {
          success: true,
          message: "Notifications marked as read successfully",
        };
      } catch (error) {
        log.error("Error in clearGamificationNotifications", { error });
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to mark notifications as read",
        };
      }
    },
  },
};
