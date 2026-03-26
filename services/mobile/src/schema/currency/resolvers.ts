import {
  EntityCurrencyWalletService,
  GlobalWalletService,
  RedemptionService,
  CurrencyHistoryService,
} from "@thrico/services";
import {
  entityCurrencyConfig,
  gamificationUser,
  userPointsHistory,
  pointRules,
  groups,
  entity,
  user,
} from "@thrico/database";
import { eq, and, desc, lt } from "drizzle-orm";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const currencyResolvers = {
  Query: {
    async getMyWallets(_: any, __: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));

        const entityWallet = await EntityCurrencyWalletService.getWallet({
          userId,
          entityId,
          db,
        });

        let enhancedEntityWallet = null;

        if (entityWallet) {
          const [config] = await Promise.all([
            db.query.entityCurrencyConfig.findFirst({
              where: eq(entityCurrencyConfig.entityId, entityId),
              columns: {
                currencyName: true,
                normalizationFactor: true,
              },
            }),
          ]);

          enhancedEntityWallet = {
            ...entityWallet,
            balance: Number(entityWallet.balance),
            totalEarned: Number(entityWallet.totalEarned),
            totalSpent: Number(entityWallet.totalSpent),
            totalConvertedToTc: Number(entityWallet.totalConvertedToTc),
            currencyName: config?.currencyName || "Entity Currency",
            normalizationFactor: config?.normalizationFactor || 10,
          };
        }

        return {
          entityWallet: enhancedEntityWallet,
        };
      } catch (error) {
        log.error("Error in getMyWallets", { error });
        throw error;
      }
    },

    async getMyTCBalance(_: any, __: any, context: any) {
      let userId: string | undefined;
      let thricoId: string | undefined;
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        userId = auth.userId;

        if (!userId) throw new Error("Unauthorized");

        // Fetch User to get thricoId
        const userRecord = await db.query.user.findFirst({
          where: eq(user.id, userId),
          columns: { thricoId: true },
        });
        thricoId = userRecord?.thricoId || userId;

        const wallet = await GlobalWalletService.getWallet({
          thricoId: thricoId!,
          db,
        });
        if (!wallet) return null;
        return {
          ...wallet,
          balance: Number(wallet.balance),
          totalEarned: Number(wallet.totalEarned),
          totalSpent: Number(wallet.totalSpent),
        };
      } catch (error) {
        log.error("Error in getMyTCBalance", { error, userId, thricoId });
        throw error;
      }
    },

    async getMyEntityWallet(_: any, { entityId }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        const wallet = await EntityCurrencyWalletService.getWallet({
          userId,
          entityId,
          db,
        });
        if (!wallet) return null;
        return {
          ...wallet,
          balance: Number(wallet.balance),
          totalEarned: Number(wallet.totalEarned),
          totalSpent: Number(wallet.totalSpent),
          totalConvertedToTc: Number(wallet.totalConvertedToTc),
        };
      } catch (error) {
        log.error("Error in getMyEntityWallet", { error });
        throw error;
      }
    },

    async getEntityCurrencyConfig(_: any, __: any, context: any) {
      try {
        const { db, entityId } = context.user || (await checkAuth(context));
        const config = await db.query.entityCurrencyConfig.findFirst({
          where: eq(entityCurrencyConfig.entityId, entityId),
        });
        if (!config) return null;
        return {
          ...config,
          tcConversionRate: Number(config.tcConversionRate),
        };
      } catch (error) {
        log.error("Error in getEntityCurrencyConfig", { error });
        throw error;
      }
    },

    async getTransactionHistory(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId } = context.user || (await checkAuth(context));
        const { limit, lastKey } = input || {};
        const data = await CurrencyHistoryService.getTransactionHistory({
          userId,
          entityId,
          limit: limit || 20,
          lastKey,
        });
        console.log(data?.items);
        return data;
      } catch (error) {
        log.error("Error in getTransactionHistory", { error });
        throw error;
      }
    },

    async getGlobalTransactionHistory(_: any, { input }: any, context: any) {
      let userId: string | undefined;
      let thricoId: string | undefined;
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        userId = auth.userId;

        if (!userId) throw new Error("Unauthorized");

        const { limit, lastKey } = input || {};

        // Fetch thricoId
        const userRecord = await db.query.user.findFirst({
          where: eq(user.id, userId),
          columns: { thricoId: true },
        });
        thricoId = userRecord?.thricoId || userId;

        return await CurrencyHistoryService.getGlobalTransactionHistory({
          thricoId: thricoId!,
          limit: limit || 20,
          lastKey,
        });
      } catch (error) {
        log.error("Error in getGlobalTransactionHistory", {
          error,
          userId,
          thricoId,
        });
        throw error;
      }
    },

    async getRedemptionHistory(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId } = context.user || (await checkAuth(context));
        const { limit, lastKey } = input || {};
        return await CurrencyHistoryService.getRedemptionHistory({
          userId,
          entityId,
          limit: limit || 20,
          lastKey,
        });
      } catch (error) {
        log.error("Error in getRedemptionHistory", { error });
        throw error;
      }
    },

    async previewRedemption(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        const { entityId, rewardCostEC } = input;
        return await RedemptionService.previewRedemption({
          userId,
          entityId,
          rewardCostEC,
          db,
        });
      } catch (error) {
        log.error("Error in previewRedemption", { error });
        throw error;
      }
    },

    async getMyEntityCurrency(_: any, { entityId }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));

        // 1. Fetch Wallet & Config in parallel
        const [wallet, config, gUser] = await Promise.all([
          EntityCurrencyWalletService.getWallet({ userId, entityId, db }),
          db.query.entityCurrencyConfig.findFirst({
            where: eq(entityCurrencyConfig.entityId, entityId),
          }),
          db.query.gamificationUser.findFirst({
            where: and(
              eq(gamificationUser.user, userId),
              eq(gamificationUser.entityId, entityId),
            ),
          }),
        ]);

        // 2. Construct Response
        return {
          entityId,
          currencyName: config?.currencyName || "Entity Currency",
          balance: Number(wallet?.balance || 0),
          normalizationFactor: config?.normalizationFactor || 10,
          tcConversionRate: Number(config?.tcConversionRate || 1.0),
          minEntityActivityRequired: !!config?.minEntityActivityRequired,
          totalPointsEarned: gUser?.totalPoints || 0,
          nextRankProgress: 0, // Placeholder for now, can be computed later
        };
      } catch (error) {
        log.error("Error in getMyEntityCurrency", { error });
        throw error;
      }
    },

    async getMyPointsActivity(
      _: any,
      { entityId, limit, lastKey }: any,
      context: any,
    ) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));

        // 1. Get Gamification User ID
        const gUser = await db.query.gamificationUser.findFirst({
          where: and(
            eq(gamificationUser.user, userId),
            eq(gamificationUser.entityId, entityId),
          ),
        });

        if (!gUser) {
          return { items: [], lastKey: null };
        }

        const queryLimit = (limit || 20) + 1;

        // 2. Fetch History with Pagination
        const items = await db.query.userPointsHistory.findMany({
          where: and(
            eq(userPointsHistory.userId, gUser.id),
            lastKey?.timestamp
              ? lt(userPointsHistory.createdAt, new Date(lastKey.timestamp))
              : undefined,
          ),
          limit: (limit || 20) + 1,
          orderBy: desc(userPointsHistory.createdAt),
          with: {
            pointRule: true,
          },
        });

        const hasNext = items.length > (limit || 20);
        const edges = hasNext ? items.slice(0, -1) : items;
        const nextCursor =
          edges.length > 0
            ? { timestamp: edges[edges.length - 1].createdAt }
            : null;

        return {
          items: edges.map((item: any) => ({
            id: item.id,
            ruleName: item.pointRule?.action || "Unknown Activity",
            pointsEarned: item.pointsEarned,
            reason: item.pointRule?.description || "Activity Points",
            timestamp: new Date(item.createdAt).getTime(),
          })),
          lastKey: nextCursor,
        };
      } catch (error) {
        log.error("Error in getMyPointsActivity", { error });
        throw error;
      }
    },
  },

  Mutation: {
    async redeemReward(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        const { entityId, rewardCostEC, rewardId } = input;
        return await RedemptionService.redeemReward({
          userId,
          entityId,
          rewardCostEC,
          rewardId,
          db,
        });
      } catch (error) {
        log.error("Error in redeemReward", { error });
        throw error;
      }
    },
  },
};
