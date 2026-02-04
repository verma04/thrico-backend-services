import { GamificationQueryService } from "@thrico/services";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const gamificationResolvers = {
  Query: {
    async getUserGamificationProfile(_: any, __: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        const gamificationQueryService = new GamificationQueryService(db);
        return await gamificationQueryService.getUserGamificationProfile({
          userId,
          entityId,
          db,
        });
      } catch (error) {
        log.error("Error in getUserGamificationProfile", { error });
        throw error;
      }
    },

    async getUserEarnedBadges(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        const { limit, cursor } = input || {};
        const gamificationQueryService = new GamificationQueryService(db);
        return await gamificationQueryService.getUserEarnedBadges({
          userId,
          entityId,
          db,
          limit,
          cursor,
        });
      } catch (error) {
        log.error("Error in getUserEarnedBadges", { error });
        throw error;
      }
    },

    async getUserPointsHistory(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        const { limit, cursor } = input || {};
        const gamificationQueryService = new GamificationQueryService(db);
        return await gamificationQueryService.getUserPointsHistory({
          userId,
          entityId,
          db,
          limit,
          cursor,
        });
      } catch (error) {
        log.error("Error in getUserPointsHistory", { error });
        throw error;
      }
    },

    async getEntityBadges(_: any, __: any, context: any) {
      try {
        const { db, entityId } = context.user || (await checkAuth(context));
        const gamificationQueryService = new GamificationQueryService(db);
        return await gamificationQueryService.getEntityBadges({
          entityId,
          db,
        });
      } catch (error) {
        log.error("Error in getEntityBadges", { error });
        throw error;
      }
    },

    async getUserGamificationSummary(_: any, __: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        const gamificationQueryService = new GamificationQueryService(db);
        return await gamificationQueryService.getUserGamificationSummary({
          userId,
          entityId,
          db,
        });
      } catch (error) {
        log.error("Error in getUserGamificationSummary", { error });
        throw error;
      }
    },
    async getUserLeaderboard(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        const { limit, offset } = input || {};
        const gamificationQueryService = new GamificationQueryService(db);
        const data = await gamificationQueryService.getLeaderboard({
          entityId,
          userId,
          limit: limit || 20,
          offset: offset || 0,
          db,
        });

        console.log(data);
        return data;
      } catch (error) {
        log.error("Error in getUserLeaderboard", { error });
        throw error;
      }
    },
    async getUserNextLevelProgress(_: any, __: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        const gamificationQueryService = new GamificationQueryService(db);
        return await gamificationQueryService.getUserNextLevelProgress({
          userId,
          entityId,
          db,
        });
      } catch (error) {
        log.error("Error in getUserNextLevelProgress", { error });
        throw error;
      }
    },
  },
};
