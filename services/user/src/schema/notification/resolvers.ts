import { log } from "@thrico/logging";
import { markNotificationsAsRead } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  CommunityNotificationService,
  FeedNotificationService,
  JobNotificationService,
  ListingNotificationService,
  MomentNotificationService,
  NetworkNotificationService,
  NotificationService,
  GamificationNotificationService,
} from "@thrico/services";

export const notificationResolvers = {
  Query: {
    async getUserNotification(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        return await NotificationService.getUserNotifications({
          db,
          currentUserId: userId,
          limit: input?.limit || 10,
          cursor: input?.cursor,
          getUnreadCountFn: async (uid) => {
            const counts = await NotificationService.getUnreadNotificationCounts({
              userId: uid,
              entityId: entityId,
            });
            const values = Object.values(counts) as number[];
            return values.reduce((a, b) => a + b, 0);
          },
        });
      } catch (error) {
        log.error("Error in getUserNotification", { error, input });
        throw error;
      }
    },
    async getUnreadNotificationCounts(_: any, __: any, context: any) {
      try {
        const { userId, entityId } = await checkAuth(context);
        return await NotificationService.getUnreadNotificationCounts({
          userId,
          entityId,
        });
      } catch (error) {
        log.error("Error in getUnreadNotificationCounts", { error });
        throw error;
      }
    },
    async getGamificationNotifications(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        return await GamificationNotificationService.getGamificationNotifications({
          db,
          userId,
          cursor: input?.cursor,
          limit: input?.limit || 10,
        });
      } catch (error) {
        log.error("Error in getGamificationNotifications", { error, input });
        throw error;
      }
    },

    async getFeedNotifications(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        return await FeedNotificationService.getFeedNotifications({
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

        return await CommunityNotificationService.getCommunityNotifications({
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

        return await NetworkNotificationService.getNetworkNotifications({
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
    async getJobNotifications(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        return await JobNotificationService.getJobNotifications({
          db,
          userId,
          cursor: input?.cursor,
          limit: input?.limit || 10,
        });
      } catch (error) {
        log.error("Error in getJobNotifications", { error, input });
        throw error;
      }
    },
    async getListingNotifications(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        return await ListingNotificationService.getListingNotifications({
          db,
          userId,
          cursor: input?.cursor,
          limit: input?.limit || 10,
        });
      } catch (error) {
        log.error("Error in getListingNotifications", { error, input });
        throw error;
      }
    },
    async getMomentNotifications(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        return await MomentNotificationService.getMomentNotifications({
          db,
          userId,
          cursor: input?.cursor,
          limit: input?.limit || 10,
        });
      } catch (error) {
        log.error("Error in getMomentNotifications", { error, input });
        throw error;
      }
    },
  },

  Mutation: {
    async markGamificationNotificationsAsRead(_: any, __: any, context: any) {
      try {
        const { userId, entityId } = await checkAuth(context);

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

    async markAllNotificationsAsRead(_: any, { module }: any, context: any) {
      try {
        const { userId, entityId } = await checkAuth(context);

        await NotificationService.markAllNotificationsAsRead({
          userId,
          entityId,
          module,
        });

        return {
          success: true,
          message: `${module} notifications marked as read`,
        };
      } catch (error) {
        log.error("Error in markAllNotificationsAsRead", { error, module });
        throw error;
      }
    },

    async markNotificationAsRead(_: any, { id }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        const result = await NotificationService.markNotificationAsRead({
          db,
          notificationId: id,
          userId,
        });

        return {
          success: result.success,
          message: result.success
            ? "Notification marked as read"
            : "Failed to mark notification as read",
        };
      } catch (error) {
        log.error("Error in markNotificationAsRead", { error, id });
        throw error;
      }
    },
  },
};
