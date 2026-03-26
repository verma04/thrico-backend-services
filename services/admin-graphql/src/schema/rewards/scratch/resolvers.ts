import {
  scratchCardConfig,
  scratchCardPrizes,
  scratchCardPlays,
} from "@thrico/database";
import { eq, and, desc } from "drizzle-orm";
import checkAuth from "../../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";

export const scratchResolvers = {
  Query: {
    async getScratchCardConfig(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const config = await db.query.scratchCardConfig.findFirst({
          where: eq(scratchCardConfig.entityId, entity),
          with: { prizes: true },
        });
        return config || null;
      } catch (error: any) {
        log.error("Error in getScratchCardConfig", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async getScratchCardPrizes(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const config = await db.query.scratchCardConfig.findFirst({
          where: eq(scratchCardConfig.entityId, entity),
        });
        if (!config) return [];

        return await db.query.scratchCardPrizes.findMany({
          where: and(
            eq(scratchCardPrizes.configId, config.id),
            eq(scratchCardPrizes.entityId, entity),
          ),
        });
      } catch (error: any) {
        log.error("Error in getScratchCardPrizes", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async getScratchCardPlays(_: any, { pagination }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      const { page = 1, limit = 20 } = pagination || {};
      const offset = (page - 1) * limit;

      try {
        return await db.query.scratchCardPlays.findMany({
          where: eq(scratchCardPlays.entityId, entity),
          limit,
          offset,
          orderBy: [desc(scratchCardPlays.playedAt)],
          with: { user: true, prize: true },
        });
      } catch (error: any) {
        log.error("Error in getScratchCardPlays", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },
  },

  Mutation: {
    async upsertScratchCardConfig(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const existing = await db.query.scratchCardConfig.findFirst({
          where: eq(scratchCardConfig.entityId, entity),
        });

        if (existing) {
          const [updated] = await db
            .update(scratchCardConfig)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(scratchCardConfig.id, existing.id))
            .returning();
          return updated;
        }

        const [created] = await db
          .insert(scratchCardConfig)
          .values({ ...input, entityId: entity })
          .returning();
        return created;
      } catch (error: any) {
        log.error("Error in upsertScratchCardConfig", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async createScratchCardPrize(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const config = await db.query.scratchCardConfig.findFirst({
          where: eq(scratchCardConfig.entityId, entity),
        });

        if (!config) {
          throw new GraphQLError(
            "Scratch card config not found. Create a config first.",
            { extensions: { code: "NOT_FOUND" } },
          );
        }

        const [prize] = await db
          .insert(scratchCardPrizes)
          .values({
            ...input,
            configId: config.id,
            entityId: entity,
          })
          .returning();
        return prize;
      } catch (error: any) {
        log.error("Error in createScratchCardPrize", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async updateScratchCardPrize(_: any, { id, input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const [updated] = await db
          .update(scratchCardPrizes)
          .set({ ...input, updatedAt: new Date() })
          .where(
            and(
              eq(scratchCardPrizes.id, id),
              eq(scratchCardPrizes.entityId, entity),
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
        log.error("Error in updateScratchCardPrize", {
          error: error.message,
          entity,
          id,
        });
        throw error;
      }
    },

    async deleteScratchCardPrize(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        await db
          .delete(scratchCardPrizes)
          .where(
            and(
              eq(scratchCardPrizes.id, id),
              eq(scratchCardPrizes.entityId, entity),
            ),
          );
        return true;
      } catch (error: any) {
        log.error("Error in deleteScratchCardPrize", {
          error: error.message,
          entity,
          id,
        });
        throw error;
      }
    },
  },
};
