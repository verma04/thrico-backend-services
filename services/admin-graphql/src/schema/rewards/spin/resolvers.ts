import {
  spinWheelConfig,
  spinWheelPrizes,
  spinWheelPlays,
} from "@thrico/database";
import { eq, and, desc } from "drizzle-orm";
import checkAuth from "../../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";

export const spinResolvers = {
  Query: {
    async getSpinWheelConfig(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const config = await db.query.spinWheelConfig.findFirst({
          where: eq(spinWheelConfig.entityId, entity),
          with: {
            prizes: {
              with: { reward: true },
              orderBy: [spinWheelPrizes.sortOrder],
            },
          },
        });
        return config || null;
      } catch (error: any) {
        log.error("Error in getSpinWheelConfig", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async getSpinWheelPrizes(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const config = await db.query.spinWheelConfig.findFirst({
          where: eq(spinWheelConfig.entityId, entity),
        });
        if (!config) return [];

        return await db.query.spinWheelPrizes.findMany({
          where: and(
            eq(spinWheelPrizes.configId, config.id),
            eq(spinWheelPrizes.entityId, entity),
          ),
          orderBy: [spinWheelPrizes.sortOrder],
          with: { reward: true },
        });
      } catch (error: any) {
        log.error("Error in getSpinWheelPrizes", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async getSpinWheelPlays(_: any, { pagination }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      const { page = 1, limit = 20 } = pagination || {};
      const offset = (page - 1) * limit;

      try {
        return await db.query.spinWheelPlays.findMany({
          where: eq(spinWheelPlays.entityId, entity),
          limit,
          offset,
          orderBy: [desc(spinWheelPlays.playedAt)],
          with: { user: true, prize: true },
        });
      } catch (error: any) {
        log.error("Error in getSpinWheelPlays", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },
  },

  Mutation: {
    async upsertSpinWheelConfig(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const existing = await db.query.spinWheelConfig.findFirst({
          where: eq(spinWheelConfig.entityId, entity),
        });

        if (existing) {
          const [updated] = await db
            .update(spinWheelConfig)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(spinWheelConfig.id, existing.id))
            .returning();
          return updated;
        }

        const [created] = await db
          .insert(spinWheelConfig)
          .values({ ...input, entityId: entity })
          .returning();
        return created;
      } catch (error: any) {
        log.error("Error in upsertSpinWheelConfig", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async createSpinWheelPrize(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        let config = await db.query.spinWheelConfig.findFirst({
          where: eq(spinWheelConfig.entityId, entity),
        });

        if (!config) {
          const [created] = await db
            .insert(spinWheelConfig)
            .values({ entityId: entity })
            .returning();
          config = created;
        }

        const [prize] = await db
          .insert(spinWheelPrizes)
          .values({
            ...input,
            configId: config.id,
            entityId: entity,
          })
          .returning();
        return prize;
      } catch (error: any) {
        log.error("Error in createSpinWheelPrize", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async updateSpinWheelPrize(_: any, { id, input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const [updated] = await db
          .update(spinWheelPrizes)
          .set({ ...input, updatedAt: new Date() })
          .where(
            and(
              eq(spinWheelPrizes.id, id),
              eq(spinWheelPrizes.entityId, entity),
            ),
          )
          .returning();

        if (!updated) {
          throw new GraphQLError("Prize not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return updated;
      } catch (error: any) {
        log.error("Error in updateSpinWheelPrize", {
          error: error.message,
          entity,
          id,
        });
        throw error;
      }
    },

    async deleteSpinWheelPrize(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        await db
          .delete(spinWheelPrizes)
          .where(
            and(
              eq(spinWheelPrizes.id, id),
              eq(spinWheelPrizes.entityId, entity),
            ),
          );
        return true;
      } catch (error: any) {
        log.error("Error in deleteSpinWheelPrize", {
          error: error.message,
          entity,
          id,
        });
        throw error;
      }
    },
  },
};
