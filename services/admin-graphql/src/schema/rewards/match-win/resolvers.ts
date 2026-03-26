import {
  matchWinConfig,
  matchWinSymbols,
  matchWinCombinations,
  matchWinPlays,
} from "@thrico/database";
import { eq, and, desc } from "drizzle-orm";
import checkAuth from "../../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";

// ─── helpers ────────────────────────────────────────────────────────────────

async function getConfigForEntity(db: any, entity: string) {
  return db.query.matchWinConfig.findFirst({
    where: eq(matchWinConfig.entityId, entity),
    with: {
      symbols: true,
      combinations: {
        with: {
          symbol1: true,
          symbol2: true,
          symbol3: true,
        },
      },
    },
  });
}

// ─── resolvers ──────────────────────────────────────────────────────────────

export const matchWinResolvers = {
  Query: {
    async getMatchWinConfig(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        return (await getConfigForEntity(db, entity)) ?? null;
      } catch (error: any) {
        log.error("Error in getMatchWinConfig", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async getMatchWinPlays(_: any, { pagination }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      const { page = 1, limit = 20 } = pagination || {};
      const offset = (page - 1) * limit;
      try {
        return await db.query.matchWinPlays.findMany({
          where: eq(matchWinPlays.entityId, entity),
          limit,
          offset,
          orderBy: [desc(matchWinPlays.playedAt)],
          with: { user: true, combination: true },
        });
      } catch (error: any) {
        log.error("Error in getMatchWinPlays", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },
  },

  Mutation: {
    // ── Initialization ───────────────────────────────────────────────────
    async initializeMatchWinConfig(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        let config = await db.query.matchWinConfig.findFirst({
          where: eq(matchWinConfig.entityId, entity),
        });

        if (!config) {
          const [created] = await db
            .insert(matchWinConfig)
            .values({
              entityId: entity,
              costPerPlay: 25,
              maxPlaysPerDay: 5,
              isActive: false,
            })
            .returning();
          config = created;
        }

        const configId = config.id;

        // 1. Seed Symbols
        const defaultSymbols = [
          {
            key: "s1",
            label: "Star",
            icon: "star",
            color: "#FBBF24",
            sortOrder: 1,
          },
          {
            key: "s2",
            label: "Coin",
            icon: "coins",
            color: "#2d1889ff",
            sortOrder: 2,
          },
          {
            key: "s3",
            label: "Gift",
            icon: "gift",
            color: "#fb24dbff",
            sortOrder: 3,
          },
        ];

        const symbolMap: Record<string, string> = {};

        for (const s of defaultSymbols) {
          const existing = await db.query.matchWinSymbols.findFirst({
            where: and(
              eq(matchWinSymbols.configId, configId),
              eq(matchWinSymbols.key, s.key),
            ),
          });
          if (existing) {
            symbolMap[s.key] = existing.id;
          } else {
            const [created] = await db
              .insert(matchWinSymbols)
              .values({ ...s, configId, entityId: entity })
              .returning();
            symbolMap[s.key] = created.id;
          }
        }

        // 2. Seed Combinations
        const defaultCombos = [
          {
            key: "c1",
            symbol1: "s1",
            symbol2: "s1",
            symbol3: "s1",
            type: "TC",
            value: 100,
            probability: "5.00",
          },
          {
            key: "c2",
            symbol1: "s2",
            symbol2: "s2",
            symbol3: "s2",
            type: "TC",
            value: 50,
            probability: "10.00",
          },
          {
            key: "c3",
            symbol1: "s3",
            symbol2: "s3",
            symbol3: "s3",
            type: "TC",
            value: 75,
            probability: "8.00",
          },
          {
            key: "any",
            symbol1: null,
            symbol2: null,
            symbol3: null,
            type: "NOTHING",
            value: 0,
            probability: "77.00",
          },
        ];

        for (const c of defaultCombos) {
          const existing = await db.query.matchWinCombinations.findFirst({
            where: and(
              eq(matchWinCombinations.configId, configId),
              eq(matchWinCombinations.key, c.key),
            ),
          });
          if (!existing) {
            await db.insert(matchWinCombinations).values({
              configId,
              entityId: entity,
              key: c.key,
              symbol1Id: c.symbol1 ? symbolMap[c.symbol1] : null,
              symbol2Id: c.symbol2 ? symbolMap[c.symbol2] : null,
              symbol3Id: c.symbol3 ? symbolMap[c.symbol3] : null,
              type: c.type as any,
              value: c.value,
              probability: c.probability,
            });
          }
        }

        return await getConfigForEntity(db, entity);
      } catch (error: any) {
        log.error("Error in initializeMatchWinConfig", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    // ── Config ────────────────────────────────────────────────────────────
    async upsertMatchWinConfig(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const existing = await db.query.matchWinConfig.findFirst({
          where: eq(matchWinConfig.entityId, entity),
          with: { symbols: true, combinations: true },
        });

        // Economy validation when activating
        if (input.isActive === true && existing) {
          const combos = existing.combinations ?? [];
          if (!combos.length) {
            throw new GraphQLError(
              "At least one combination is required before activating.",
            );
          }
          let totalProb = 0;
          let expectedValue = 0;
          let hasNothing = false;
          const cost = input.costPerPlay ?? existing.costPerPlay;

          for (const c of combos) {
            const prob = Number(c.probability ?? 0);
            totalProb += prob;
            expectedValue += (prob * Number(c.value ?? 0)) / 100;
            if (c.type === "NOTHING") hasNothing = true;
          }

          if (Math.abs(totalProb - 100) > 0.1) {
            throw new GraphQLError(
              `Total probability must be 100%. Current: ${totalProb.toFixed(2)}%`,
            );
          }
          if (!hasNothing) {
            throw new GraphQLError(
              "At least one combination must be type NOTHING (no reward).",
            );
          }
          if (expectedValue >= cost) {
            throw new GraphQLError(
              `Economy Protection: Expected Value (${expectedValue.toFixed(2)}) must be less than Cost Per Play (${cost}).`,
            );
          }
        }

        const updateData: any = { updatedAt: new Date() };
        if (input.costPerPlay !== undefined)
          updateData.costPerPlay = input.costPerPlay;
        if (input.maxPlaysPerDay !== undefined)
          updateData.maxPlaysPerDay = input.maxPlaysPerDay;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.festivalMode !== undefined)
          updateData.festivalMode = input.festivalMode;

        if (existing) {
          await db
            .update(matchWinConfig)
            .set(updateData)
            .where(eq(matchWinConfig.id, existing.id));
          return await getConfigForEntity(db, entity);
        }

        const [created] = await db
          .insert(matchWinConfig)
          .values({ ...updateData, entityId: entity })
          .returning();

        return await getConfigForEntity(db, created.entityId);
      } catch (error: any) {
        log.error("Error in upsertMatchWinConfig", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    // ── Symbols ────────────────────────────────────────────────────────────
    async upsertMatchWinSymbol(_: any, { configId, input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const config = await db.query.matchWinConfig.findFirst({
          where: and(
            eq(matchWinConfig.id, configId),
            eq(matchWinConfig.entityId, entity),
          ),
        });
        if (!config) throw new GraphQLError("Config not found.");

        // Check if symbol with this key already exists
        const existing = await db.query.matchWinSymbols.findFirst({
          where: and(
            eq(matchWinSymbols.configId, configId),
            eq(matchWinSymbols.key, input.key),
          ),
        });

        if (existing) {
          const [updated] = await db
            .update(matchWinSymbols)
            .set({
              label: input.label,
              icon: input.icon ?? existing.icon,
              color: input.color ?? existing.color,
              sortOrder: input.sortOrder ?? existing.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(matchWinSymbols.id, existing.id))
            .returning();
          return updated;
        }

        const [created] = await db
          .insert(matchWinSymbols)
          .values({
            configId,
            entityId: entity,
            key: input.key,
            label: input.label,
            icon: input.icon,
            color: input.color,
            sortOrder: input.sortOrder ?? 0,
          })
          .returning();
        return created;
      } catch (error: any) {
        log.error("Error in upsertMatchWinSymbol", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async deleteMatchWinSymbol(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const symbol = await db.query.matchWinSymbols.findFirst({
          where: and(
            eq(matchWinSymbols.id, id),
            eq(matchWinSymbols.entityId, entity),
          ),
        });
        if (!symbol) throw new GraphQLError("Symbol not found.");

        await db.delete(matchWinSymbols).where(eq(matchWinSymbols.id, id));
        return true;
      } catch (error: any) {
        log.error("Error in deleteMatchWinSymbol", {
          error: error.message,
          entity,
          id,
        });
        throw error;
      }
    },

    // ── Combinations ──────────────────────────────────────────────────────
    async upsertMatchWinCombination(
      _: any,
      { configId, input }: any,
      context: any,
    ) {
      const { entity, db } = await checkAuth(context);
      try {
        const config = await db.query.matchWinConfig.findFirst({
          where: and(
            eq(matchWinConfig.id, configId),
            eq(matchWinConfig.entityId, entity),
          ),
        });
        if (!config) throw new GraphQLError("Config not found.");

        // For non-NOTHING types, validate all 3 symbol IDs are provided and belong to this config
        if (input.type !== "NOTHING") {
          const symbolIds = [input.symbol1Id, input.symbol2Id, input.symbol3Id];
          if (symbolIds.some((sid) => !sid)) {
            throw new GraphQLError(
              "All 3 symbol slots (symbol1Id, symbol2Id, symbol3Id) are required for a winning combination.",
            );
          }
          for (const sid of symbolIds) {
            const sym = await db.query.matchWinSymbols.findFirst({
              where: and(
                eq(matchWinSymbols.id, sid),
                eq(matchWinSymbols.configId, configId),
              ),
            });
            if (!sym)
              throw new GraphQLError(`Symbol ${sid} not found in this config.`);
          }
        }

        const existing = await db.query.matchWinCombinations.findFirst({
          where: and(
            eq(matchWinCombinations.configId, configId),
            eq(matchWinCombinations.key, input.key),
          ),
        });

        const values: any = {
          key: input.key,
          configId,
          entityId: entity,
          symbol1Id: input.symbol1Id ?? null,
          symbol2Id: input.symbol2Id ?? null,
          symbol3Id: input.symbol3Id ?? null,
          type: input.type,
          value: input.value,
          probability: String(input.probability),
          maxWins: input.maxWins ?? null,
          rewardId: input.rewardId ?? null,
          updatedAt: new Date(),
        };

        if (existing) {
          const [updated] = await db
            .update(matchWinCombinations)
            .set(values)
            .where(eq(matchWinCombinations.id, existing.id))
            .returning();

          return db.query.matchWinCombinations.findFirst({
            where: eq(matchWinCombinations.id, updated.id),
            with: { symbol1: true, symbol2: true, symbol3: true },
          });
        }

        const [created] = await db
          .insert(matchWinCombinations)
          .values(values)
          .returning();

        return db.query.matchWinCombinations.findFirst({
          where: eq(matchWinCombinations.id, created.id),
          with: { symbol1: true, symbol2: true, symbol3: true },
        });
      } catch (error: any) {
        log.error("Error in upsertMatchWinCombination", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },

    async deleteMatchWinCombination(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const combo = await db.query.matchWinCombinations.findFirst({
          where: and(
            eq(matchWinCombinations.id, id),
            eq(matchWinCombinations.entityId, entity),
          ),
        });
        if (!combo) throw new GraphQLError("Combination not found.");

        await db
          .delete(matchWinCombinations)
          .where(eq(matchWinCombinations.id, id));
        return true;
      } catch (error: any) {
        log.error("Error in deleteMatchWinCombination", {
          error: error.message,
          entity,
          id,
        });
        throw error;
      }
    },
  },
};
