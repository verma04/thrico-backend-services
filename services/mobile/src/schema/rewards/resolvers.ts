import { RewardsService } from "@thrico/services";
import { log } from "@thrico/logging";
import { eq } from "drizzle-orm";
import { user } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { spinResolvers } from "./spin/resolvers";
import { scratchResolvers } from "./scratch/resolvers";
import { matchWinResolvers } from "./match/resolvers";

export const rewardsResolvers = {
  Query: {
    async getRewards(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { entityId, userId } = auth;

        if (!entityId && userId) {
          const userRecord = await db.query.user.findFirst({
            where: eq(user.id, userId),
          });
          entityId = userRecord?.entityId;
        }

        if (!entityId) {
          return [];
        }

        return await RewardsService.listRewards({ entityId, db });
      } catch (error) {
        log.error("Error in getRewards resolver", { error });
        throw error;
      }
    },

    async getRewardById(_: any, { id }: any, context: any) {
      try {
        const { db } = context.user || (await checkAuth(context));
        return await RewardsService.getRewardById({ id, db });
      } catch (error) {
        log.error("Error in getRewardById resolver", { error, id });
        throw error;
      }
    },

    async getUserRedemptions(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { userId, entityId } = auth;

        if ((!entityId || !userId) && userId) {
          const userRecord = await db.query.user.findFirst({
            where: eq(user.id, userId),
          });
          if (userRecord) {
            userId = userId || userRecord.id;
            entityId = entityId || userRecord.entityId;
          }
        }

        if (!userId || !entityId) {
          return [];
        }

        return await RewardsService.getUserRedemptions({
          userId,
          entityId,
          db,
        });
      } catch (error) {
        log.error("Error in getUserRedemptions resolver", { error });
        throw error;
      }
    },

    async getPlayRemainingToday(_: any, __: any, context: any) {
      // Mock for now, should calculate remaining plays across all games
      return 5;
    },

    ...spinResolvers.Query,
    ...scratchResolvers.Query,
    ...matchWinResolvers.Query,
  },

  Mutation: {
    async redeemRewardCoupon(_: any, { rewardId }: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { userId, entityId } = auth;

        if ((!entityId || !userId) && userId) {
          const userRecord = await db.query.user.findFirst({
            where: eq(user.id, userId),
          });
          if (userRecord) {
            userId = userId || userRecord.id;
            entityId = entityId || userRecord.entityId;
          }
        }

        if (!userId || !entityId) {
          throw new Error("Missing user or entity identity");
        }

        const result = await RewardsService.redeemReward({
          userId,
          entityId,
          rewardId,
          db,
        });

        return result;
      } catch (error: any) {
        log.error("Error in redeemReward resolver", { error });
        return {
          success: false,
          error: error.message,
        };
      }
    },

    ...spinResolvers.Mutation,
    ...scratchResolvers.Mutation,
    ...matchWinResolvers.Mutation,
  },
};
