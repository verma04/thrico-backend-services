import {
  scratchCardConfig,
  scratchCardPrizes,
  scratchCardPlays,
  user,
} from "@thrico/database";
import { eq, and, sql, desc } from "drizzle-orm";
import { log } from "@thrico/logging";
import checkAuth from "../../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import {
  EntityCurrencyWalletService,
  CurrencyHistoryService,
} from "@thrico/services";

export const scratchResolvers = {
  Query: {
    async getScratchCardConfig(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { entityId } = auth;

        if (!entityId && auth.userId) {
          const userRecord = await db.query.user.findFirst({
            where: eq(user.id, auth.userId),
          });
          entityId = userRecord?.entityId;
        }

        if (!entityId) {
          return null;
        }

        const config = await db.query.scratchCardConfig.findFirst({
          where: and(
            eq(scratchCardConfig.entityId, entityId),
            eq(scratchCardConfig.isActive, true),
          ),
          with: {
            prizes: {
              where: eq(scratchCardPrizes.isActive, true),
            },
          },
        });
        return config || null;
      } catch (error) {
        log.error("Error in getScratchCardConfig", { error });
        throw error;
      }
    },

    async getScratchCardStatus(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { entityId, userId } = auth;

        if (!userId) {
          throw new GraphQLError("User ID missing from context");
        }

        if (!entityId) {
          const userRecord = await db.query.user.findFirst({
            where: eq(user.id, userId),
          });
          entityId = userRecord?.entityId;
        }

        if (!entityId) {
          log.warn("Entity ID missing for getScratchCardStatus", { userId });
          return {
            isActive: false,
            scratchesLeftToday: 0,
            costPerScratch: 0,
            userTcBalance: 0,
          };
        }

        const config = await db.query.scratchCardConfig.findFirst({
          where: eq(scratchCardConfig.entityId, entityId),
        });

        if (!config) {
          return {
            isActive: false,
            scratchesLeftToday: 0,
            costPerScratch: 0,
            userTcBalance: 0,
          };
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const playsToday = await db
          .select({ count: sql<number>`count(*)` })
          .from(scratchCardPlays)
          .where(
            and(
              eq(scratchCardPlays.userId, userId),
              eq(scratchCardPlays.entityId, entityId),
              sql`${scratchCardPlays.playedAt} >= ${startOfDay}`,
            ),
          );

        const countsUsed = playsToday[0]?.count || 0;

        const wallet = await EntityCurrencyWalletService.getWallet({
          userId,
          entityId,
          db,
        });
        const userTcBalance = wallet ? Number(wallet.balance) : 0;

        return {
          isActive: config.isActive,
          scratchesLeftToday: Math.max(
            0,
            config.maxScratchesPerDay - countsUsed,
          ),
          costPerScratch: config.costPerScratch,
          userTcBalance,
        };
      } catch (error) {
        log.error("Error in getScratchCardStatus", { error });
        throw error;
      }
    },

    async getAllScratchCards(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { entityId, userId } = auth;

        if (!userId) {
          throw new GraphQLError("User ID missing from context");
        }

        if (!entityId) {
          const userRecord = await db.query.user.findFirst({
            where: eq(user.id, userId),
          });
          entityId = userRecord?.entityId;
        }

        if (!entityId) {
          return {
            scratchedCards: [],
            unscratchedCount: 0,
            totalDailyLimit: 0,
            costPerScratch: 0,
            isActive: false,
          };
        }

        // Fetch config
        const config = await db.query.scratchCardConfig.findFirst({
          where: eq(scratchCardConfig.entityId, entityId),
        });

        if (!config) {
          return {
            scratchedCards: [],
            unscratchedCount: 0,
            totalDailyLimit: 0,
            costPerScratch: 0,
            isActive: false,
          };
        }

        // Fetch all scratched (redeemed) cards for this user, with prize details
        const scratchedCards = await db.query.scratchCardPlays.findMany({
          where: and(
            eq(scratchCardPlays.userId, userId),
            eq(scratchCardPlays.entityId, entityId),
          ),
          with: {
            prize: true,
          },
          orderBy: [desc(scratchCardPlays.playedAt)],
        });

        // Calculate unscratched count for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayPlays = scratchedCards.filter(
          (play: { playedAt: Date }) => new Date(play.playedAt) >= startOfDay,
        );

        const unscratchedCount = Math.max(
          0,
          config.maxScratchesPerDay - todayPlays.length,
        );

        return {
          scratchedCards,
          unscratchedCount,
          totalDailyLimit: config.maxScratchesPerDay,
          costPerScratch: config.costPerScratch,
          isActive: config.isActive,
        };
      } catch (error) {
        log.error("Error in getAllScratchCards", { error });
        throw error;
      }
    },
  },

  Mutation: {
    async playScratchCard(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { entityId, userId } = auth;

        if (!userId) {
          throw new GraphQLError("User ID missing from context");
        }

        if (!entityId) {
          const userRecord = await db.query.user.findFirst({
            where: eq(user.id, userId),
          });
          if (userRecord) {
            entityId = userRecord.entityId;
          }
        }

        if (!entityId) {
          throw new GraphQLError("Missing entity identity");
        }

        const config = await db.query.scratchCardConfig.findFirst({
          where: eq(scratchCardConfig.entityId, entityId),
          with: {
            prizes: {
              where: eq(scratchCardPrizes.isActive, true),
            },
          },
        });

        if (!config || !config.isActive) {
          throw new GraphQLError("Scratch card is not active for this entity");
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const playsTodayCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(scratchCardPlays)
          .where(
            and(
              eq(scratchCardPlays.userId, userId),
              eq(scratchCardPlays.entityId, entityId),
              sql`${scratchCardPlays.playedAt} >= ${startOfDay}`,
            ),
          );

        if ((playsTodayCount[0]?.count || 0) >= config.maxScratchesPerDay) {
          throw new GraphQLError("Daily scratch limit reached");
        }

        const wallet = await EntityCurrencyWalletService.getWallet({
          userId,
          entityId,
          db,
        });
        const currentBalance = wallet ? Number(wallet.balance) : 0;

        if (currentBalance < config.costPerScratch) {
          throw new GraphQLError(
            `Insufficient EC balance. Cost: ${config.costPerScratch}, Balance: ${currentBalance}`,
          );
        }

        const prizes = config.prizes;
        if (!prizes || prizes.length === 0) {
          throw new GraphQLError("No active prizes configured");
        }

        const randomValue = Math.random() * 100;
        let cumulativeProbability = 0;
        let selectedPrize = null;

        for (const prize of prizes) {
          cumulativeProbability += Number(prize.probability);
          if (randomValue <= cumulativeProbability) {
            selectedPrize = prize;
            break;
          }
        }

        if (!selectedPrize) {
          selectedPrize = prizes[prizes.length - 1];
        }

        return await db.transaction(async (tx: any) => {
          const debitResult = await EntityCurrencyWalletService.debitEC({
            userId,
            entityId,
            amount: config.costPerScratch,
            db: tx,
          });

          // Log debit to history
          await CurrencyHistoryService.logTransaction({
            userId,
            type: "EC_DEBIT",
            entityId,
            amount: config.costPerScratch,
            balanceBefore: debitResult.balanceBefore,
            balanceAfter: debitResult.balanceAfter,
            metadata: { activity: "SCRATCH_CARD_PLAY", configId: config.id },
          });

          if (selectedPrize!.type === "TC" && selectedPrize!.value > 0) {
            const creditResult = await EntityCurrencyWalletService.creditEC({
              userId,
              entityId,
              amount: selectedPrize!.value,
              db: tx,
            });

            // Log credit to history
            await CurrencyHistoryService.logTransaction({
              userId,
              type: "EC_CREDIT",
              entityId,
              amount: selectedPrize!.value,
              balanceBefore: creditResult.balanceBefore,
              balanceAfter: creditResult.balanceAfter,
              metadata: {
                activity: "SCRATCH_CARD_WIN",
                prizeId: selectedPrize!.id,
              },
            });
          }

          const [play] = await tx
            .insert(scratchCardPlays)
            .values({
              userId,
              entityId,
              prizeId: selectedPrize!.id,
              prizeType: selectedPrize!.type,
              prizeValue: selectedPrize!.value,
              tcSpent: config.costPerScratch,
            })
            .returning();

          return {
            ...play,
            prize: selectedPrize,
          };
        });
      } catch (error: any) {
        log.error("Error in playScratchCard mutation", {
          error: error.message,
        });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message || "Failed to play scratch card");
      }
    },
  },
};
