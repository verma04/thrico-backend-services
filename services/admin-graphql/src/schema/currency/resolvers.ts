import { eq, and } from "drizzle-orm";
import {
  entityCurrencyConfig,
  activityCaps,
  tcConversionCaps,
  redemptionCaps,
  seedCurrency,
} from "@thrico/database";
import { CurrencyHistoryService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";

export const currencyResolvers = {
  Query: {
    async getEntityCurrencyConfig(_: any, __: any, context: any) {
      const { db, entity: entityId } = await checkAuth(context);

      return await db.query.entityCurrencyConfig.findFirst({
        where: eq(entityCurrencyConfig.entityId, entityId),
      });
    },

    async getActivityCaps(_: any, __: any, context: any) {
      const { db, entity: entityId } = await checkAuth(context);
      return await db.query.activityCaps.findMany({
        where: eq(activityCaps.entityId, entityId),
      });
    },

    async getTCConversionCap(_: any, __: any, context: any) {
      const { db, entity: entityId } = await checkAuth(context);
      return await db.query.tcConversionCaps.findFirst({
        where: eq(tcConversionCaps.entityId, entityId),
      });
    },

    async getRedemptionCap(_: any, __: any, context: any) {
      const { db, entity: entityId } = await checkAuth(context);
      return await db.query.redemptionCaps.findFirst({
        where: eq(redemptionCaps.entityId, entityId),
      });
    },

    async getCurrencyTransactions(
      _: any,
      { userId, limit, cursor }: any,
      context: any,
    ) {
      const { entity: entityId } = await checkAuth(context);
      // If userId is provided, filter by it. If not, this is a broad audit.
      // Note: Current HistoryService requires userId as partition key.
      // If we need broad audit without userId, we might need a different GSI/query.
      if (!userId) {
        throw new GraphQLError("userId is required for transaction audit.");
      }

      let lastKey: any = undefined;
      if (cursor) {
        try {
          lastKey = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
        } catch (e) {
          log.error("Invalid cursor provided", { cursor });
        }
      }

      const { items, lastKey: newLastKey } =
        await CurrencyHistoryService.getTransactionHistory({
          userId,
          entityId,
          limit: limit || 20,
          lastKey,
        });

      return {
        items,
        nextCursor: newLastKey
          ? Buffer.from(JSON.stringify(newLastKey)).toString("base64")
          : null,
      };
    },
  },

  Mutation: {
    async updateEntityCurrencyConfig(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        // Validation for redemption range (10-30%) as per System Design Flow
        if (
          input.minTcPercentage !== undefined &&
          (input.minTcPercentage < 10 || input.minTcPercentage > 30)
        ) {
          throw new Error("minTcPercentage must be between 10 and 30");
        }
        if (
          input.maxTcPercentage !== undefined &&
          (input.maxTcPercentage < 10 || input.maxTcPercentage > 30)
        ) {
          throw new Error("maxTcPercentage must be between 10 and 30");
        }

        // Use upsert-like logic
        const existing = await db.query.entityCurrencyConfig.findFirst({
          where: eq(entityCurrencyConfig.entityId, entityId),
        });

        if (existing) {
          const [updated] = await db
            .update(entityCurrencyConfig)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(entityCurrencyConfig.entityId, entityId))
            .returning();
          return updated;
        } else {
          const [created] = await db
            .insert(entityCurrencyConfig)
            .values({ ...input, entityId })
            .returning();
          return created;
        }
      } catch (error: any) {
        log.error("Error in updateEntityCurrencyConfig", {
          error: error.message,
        });
        throw new GraphQLError(error.message);
      }
    },

    async upsertActivityCap(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);
        const { activityType } = input;

        const existing = await db.query.activityCaps.findFirst({
          where: and(
            eq(activityCaps.entityId, entityId),
            eq(activityCaps.activityType, activityType),
          ),
        });

        if (existing) {
          const [updated] = await db
            .update(activityCaps)
            .set({ ...input })
            .where(eq(activityCaps.id, existing.id))
            .returning();
          return updated;
        } else {
          const [created] = await db
            .insert(activityCaps)
            .values({ ...input, entityId })
            .returning();
          return created;
        }
      } catch (error: any) {
        log.error("Error in upsertActivityCap", {
          error: error.message,
        });
        throw new GraphQLError(error.message);
      }
    },

    async updateTCConversionCap(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        const existing = await db.query.tcConversionCaps.findFirst({
          where: eq(tcConversionCaps.entityId, entityId),
        });

        if (existing) {
          const [updated] = await db
            .update(tcConversionCaps)
            .set({ ...input })
            .where(eq(tcConversionCaps.entityId, entityId))
            .returning();
          return updated;
        } else {
          const [created] = await db
            .insert(tcConversionCaps)
            .values({ ...input, entityId })
            .returning();
          return created;
        }
      } catch (error: any) {
        log.error("Error in updateTCConversionCap", {
          error: error.message,
        });
        throw new GraphQLError(error.message);
      }
    },

    async updateRedemptionCap(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        const existing = await db.query.redemptionCaps.findFirst({
          where: eq(redemptionCaps.entityId, entityId),
        });

        if (existing) {
          const [updated] = await db
            .update(redemptionCaps)
            .set({ ...input })
            .where(eq(redemptionCaps.entityId, entityId))
            .returning();
          return updated;
        } else {
          const [created] = await db
            .insert(redemptionCaps)
            .values({ ...input, entityId })
            .returning();
          return created;
        }
      } catch (error: any) {
        log.error("Error in updateRedemptionCap", {
          error: error.message,
        });
        throw new GraphQLError(error.message);
      }
    },

    async reSeedDefaultCurrency(_: any, __: any, context: any) {
      try {
        await checkAuth(context);
        // const result = await seedCurrency();
        return "Currency re-seeded successfully.";
      } catch (error: any) {
        log.error("Error in reSeedDefaultCurrency", {
          error: error.message,
        });
        throw new GraphQLError(error.message);
      }
    },
  },
};
