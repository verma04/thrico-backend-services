import {
  spinWheelConfig,
  spinWheelPrizes,
  spinWheelPlays,
  user,
} from "@thrico/database";
import { eq, and, desc, sql } from "drizzle-orm";
import { log } from "@thrico/logging";
import checkAuth from "../../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import {
  EntityCurrencyWalletService,
  CurrencyHistoryService,
} from "@thrico/services";

export const spinResolvers = {
  Query: {
    async getSpinWheelConfig(_: any, __: any, context: any) {
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

        const config = await db.query.spinWheelConfig.findFirst({
          where: and(
            eq(spinWheelConfig.entityId, entityId),
            eq(spinWheelConfig.isActive, true),
          ),
          with: {
            prizes: {
              where: eq(spinWheelPrizes.isActive, true),
              orderBy: [desc(spinWheelPrizes.sortOrder)],
              with: { reward: true },
            },
          },
        });
        return config || null;
      } catch (error) {
        log.error("Error in getSpinWheelConfig", { error });
        throw error;
      }
    },

    async getSpinWheelStatus(_: any, __: any, context: any) {
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
          log.warn("Entity ID missing for getSpinWheelStatus", { userId });
          return {
            isActive: false,
            spinsLeftToday: 0,
            costPerSpin: 0,
            userTcBalance: 0,
          };
        }

        const config = await db.query.spinWheelConfig.findFirst({
          where: eq(spinWheelConfig.entityId, entityId),
        });

        if (!config) {
          return {
            isActive: false,
            spinsLeftToday: 0,
            costPerSpin: 0,
            userTcBalance: 0,
          };
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const playsToday = await db
          .select({ count: sql<number>`count(*)` })
          .from(spinWheelPlays)
          .where(
            and(
              eq(spinWheelPlays.userId, userId),
              eq(spinWheelPlays.entityId, entityId),
              sql`${spinWheelPlays.playedAt} >= ${startOfDay}`,
            ),
          );

        const spinsUsed = playsToday[0]?.count || 0;

        const wallet = await EntityCurrencyWalletService.getWallet({
          userId,
          entityId,
          db,
        });
        const userTcBalance = wallet ? Number(wallet.balance) : 0;

        return {
          isActive: config.isActive,
          spinsLeftToday: Math.max(0, config.maxSpinsPerDay - spinsUsed),
          costPerSpin: config.costPerSpin,
          userTcBalance,
        };
      } catch (error) {
        log.error("Error in getSpinWheelStatus", { error });
        throw error;
      }
    },
  },

  Mutation: {
    async playSpinWheel(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { entityId, userId } = auth;

        if (!userId) {
          throw new GraphQLError("User ID missing from context");
        }

        // 1. Resolve entityId if missing from token
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

        // 2. Get Config and Prizes
        const config = await db.query.spinWheelConfig.findFirst({
          where: eq(spinWheelConfig.entityId, entityId),
          with: {
            prizes: {
              where: eq(spinWheelPrizes.isActive, true),
            },
          },
        });

        if (!config || !config.isActive) {
          throw new GraphQLError("Spin wheel is not active for this entity");
        }

        // 3. Check Daily Limit
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const playsTodayCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(spinWheelPlays)
          .where(
            and(
              eq(spinWheelPlays.userId, userId),
              eq(spinWheelPlays.entityId, entityId),
              sql`${spinWheelPlays.playedAt} >= ${startOfDay}`,
            ),
          );

        if ((playsTodayCount[0]?.count || 0) >= config.maxSpinsPerDay) {
          throw new GraphQLError("Daily spin limit reached");
        }

        // 4. Check Entity Currency Wallet Balance
        const wallet = await EntityCurrencyWalletService.getWallet({
          userId,
          entityId,
          db,
        });
        const currentBalance = wallet ? Number(wallet.balance) : 0;

        if (currentBalance < config.costPerSpin) {
          throw new GraphQLError(
            `Insufficient EC balance. Cost: ${config.costPerSpin}, Balance: ${currentBalance}`,
          );
        }

        // 5. Weighted Random Selection of Prize
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

        // Fallback to last prize if random selection fails due to probability rounding
        if (!selectedPrize) {
          selectedPrize = prizes[prizes.length - 1];
        }

        // 6. Execute Transaction
        return await db.transaction(async (tx: any) => {
          // A. Debit Cost (EC)
          const debitResult = await EntityCurrencyWalletService.debitEC({
            userId,
            entityId,
            amount: config.costPerSpin,
            db: tx,
          });

          // Log debit to history
          await CurrencyHistoryService.logTransaction({
            userId,
            type: "EC_DEBIT",
            entityId,
            amount: config.costPerSpin,
            balanceBefore: debitResult.balanceBefore,
            balanceAfter: debitResult.balanceAfter,
            metadata: { activity: "SPIN_WHEEL_PLAY", configId: config.id },
          });

          // B. Credit Reward if prize is TC (we treat and award as EC as per requirement)
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
                activity: "SPIN_WHEEL_WIN",
                prizeId: selectedPrize!.id,
              },
            });
          }

          // C. Log the play
          const [play] = await tx
            .insert(spinWheelPlays)
            .values({
              userId,
              entityId,
              prizeId: selectedPrize!.id,
              prizeType: selectedPrize!.type,
              prizeValue: selectedPrize!.value,
              tcSpent: config.costPerSpin,
            })
            .returning();

          return {
            ...play,
            prize: selectedPrize,
          };
        });
      } catch (error: any) {
        log.error("Error in playSpinWheel mutation", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message || "Failed to play spin wheel");
      }
    },
  },
};
