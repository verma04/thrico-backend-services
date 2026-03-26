import {
  matchWinConfig,
  matchWinPlays,
  matchWinSymbols,
  matchWinCombinations,
  user,
} from "@thrico/database";
import { eq, and, sql } from "drizzle-orm";
import { log } from "@thrico/logging";
import checkAuth from "../../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import {
  EntityCurrencyWalletService,
  CurrencyHistoryService,
} from "@thrico/services";

export const matchWinResolvers = {
  Query: {
    async getMatchWinConfig(_: any, __: any, context: any) {
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

        if (!entityId) return null;

        const config = await db.query.matchWinConfig.findFirst({
          where: and(
            eq(matchWinConfig.entityId, entityId),
            eq(matchWinConfig.isActive, true),
          ),
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
        return config || null;
      } catch (error) {
        log.error("Error in getMatchWinConfig", { error });
        throw error;
      }
    },

    async getMatchWinStatus(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db } = auth;
        let { entityId, userId } = auth;

        if (!userId) throw new GraphQLError("User ID missing from context");

        if (!entityId) {
          const userRecord = await db.query.user.findFirst({
            where: eq(user.id, userId),
          });
          entityId = userRecord?.entityId;
        }

        if (!entityId) {
          log.warn("Entity ID missing for getMatchWinStatus", { userId });
          return {
            isActive: false,
            playsLeftToday: 0,
            costPerPlay: 0,
            userTcBalance: 0,
          };
        }

        const config = await db.query.matchWinConfig.findFirst({
          where: eq(matchWinConfig.entityId, entityId),
        });

        if (!config) {
          return {
            isActive: false,
            playsLeftToday: 0,
            costPerPlay: 0,
            userTcBalance: 0,
          };
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const playsToday = await db
          .select({ count: sql<number>`count(*)` })
          .from(matchWinPlays)
          .where(
            and(
              eq(matchWinPlays.userId, userId),
              eq(matchWinPlays.entityId, entityId),
              sql`${matchWinPlays.playedAt} >= ${startOfDay}`,
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
          playsLeftToday: Math.max(0, config.maxPlaysPerDay - countsUsed),
          costPerPlay: config.costPerPlay,
          userTcBalance,
        };
      } catch (error) {
        log.error("Error in getMatchWinStatus", { error });
        throw error;
      }
    },
  },

  Mutation: {
    async playMatchWin(_: any, __: any, context: any) {
      try {
        const auth = context.user || (await checkAuth(context));
        const { db, entityId, userId, thricoId } = auth;

        if (!userId || !entityId)
          throw new GraphQLError("Incomplete user context");

        // 1. Fetch Config
        const config = await db.query.matchWinConfig.findFirst({
          where: and(
            eq(matchWinConfig.entityId, entityId),
            // eq(matchWinConfig.isActive, true),
          ),
          with: {
            symbols: true,
            combinations: true,
          },
        });

        if (!config)
          throw new GraphQLError("Match & Win is currently unavailable.");

        // 2. Daily Limit Check
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const [todayPlays] = await db
          .select({ count: sql<number>`count(*)` })
          .from(matchWinPlays)
          .where(
            and(
              eq(matchWinPlays.userId, userId),
              eq(matchWinPlays.entityId, entityId),
              sql`${matchWinPlays.playedAt} >= ${startOfDay}`,
            ),
          );

        if ((todayPlays?.count || 0) >= config.maxPlaysPerDay) {
          throw new GraphQLError("Daily play limit reached");
        }

        // 3. Balance Check
        const wallet = await EntityCurrencyWalletService.getWallet({
          userId,
          entityId,
          db,
        });
        const balance = wallet ? Number(wallet.balance) : 0;
        if (balance < config.costPerPlay) {
          throw new GraphQLError("Insufficient balance for Match & Win");
        }

        // 4. Determine Prize (Weighted selection respecting maxWins)
        const winCounts = await db
          .select({
            comboId: matchWinPlays.combinationId,
            count: sql<number>`count(*)`,
          })
          .from(matchWinPlays)
          .where(eq(matchWinPlays.entityId, entityId))
          .groupBy(matchWinPlays.combinationId);

        const winCountMap = new Map(
          winCounts.map((w: any) => [w.comboId, w.count]),
        );
        const eligibleCombos = config.combinations.filter((c: any) => {
          if (!c.maxWins) return true;
          return (winCountMap.get(c.id) || 0) < c.maxWins;
        });

        if (eligibleCombos.length === 0)
          throw new GraphQLError("All prizes have been exhausted for today.");

        const totalProb = eligibleCombos.reduce(
          (sum: any, c: any) => sum + Number(c.probability),
          0,
        );
        const randomValue = Math.random() * totalProb;
        let cumulativeProb = 0;
        const selectedCombo =
          eligibleCombos.find((c: any) => {
            cumulativeProb += Number(c.probability);
            return randomValue <= cumulativeProb;
          }) || eligibleCombos[eligibleCombos.length - 1];

        // 5. Generate Visual Reels
        let reels: string[] = [];
        const getLabel = (id: string | null) =>
          config.symbols.find((s: any) => s.id === id)?.label || "???";

        if (selectedCombo.type !== "NOTHING") {
          reels = [
            getLabel(selectedCombo.symbol1Id),
            getLabel(selectedCombo.symbol2Id),
            getLabel(selectedCombo.symbol3Id),
          ];
        } else {
          // Generate NOTHING symbols that don't match any winning combination
          const allLabels = config.symbols.map((s: any) => s.label);
          const winningCombos = config.combinations
            .filter((c: any) => c.type !== "NOTHING")
            .map((c: any) => [
              getLabel(c.symbol1Id),
              getLabel(c.symbol2Id),
              getLabel(c.symbol3Id),
            ]);

          let attempts = 0;
          do {
            reels = [0, 1, 2].map(
              () => allLabels[Math.floor(Math.random() * allLabels.length)],
            );
            attempts++;
          } while (
            winningCombos.some(
              (wc: any) =>
                wc[0] === reels[0] && wc[1] === reels[1] && wc[2] === reels[2],
            ) &&
            attempts < 50
          );
        }

        // 6. Execute Transaction
        return await db.transaction(async (tx: any) => {
          const debit = await EntityCurrencyWalletService.debitEC({
            userId,
            entityId,
            amount: config.costPerPlay,
            db: tx,
          });

          await CurrencyHistoryService.logTransaction({
            userId,
            entityId,
            type: "EC_DEBIT",
            amount: config.costPerPlay,
            balanceBefore: debit.balanceBefore,
            balanceAfter: debit.balanceAfter,
            metadata: { activity: "MATCH_WIN_PLAY", configId: config.id },
          });

          if (selectedCombo.type === "TC" && selectedCombo.value > 0) {
            const credit = await EntityCurrencyWalletService.creditEC({
              userId,
              entityId,
              amount: selectedCombo.value,
              db: tx,
            });
            await CurrencyHistoryService.logTransaction({
              userId,
              entityId,
              type: "EC_CREDIT",
              amount: selectedCombo.value,
              balanceBefore: credit.balanceBefore,
              balanceAfter: credit.balanceAfter,
              metadata: {
                activity: "MATCH_WIN_WIN",
                combinationId: selectedCombo.id,
              },
            });
          }

          const [playRecord] = await tx
            .insert(matchWinPlays)
            .values({
              userId,
              entityId,
              combinationId: selectedCombo.id,
              prizeType: selectedCombo.type,
              prizeValue: selectedCombo.value,
              tcSpent: config.costPerPlay,
              symbolsWon: reels.join(","),
            })
            .returning();

          return {
            ...playRecord,
            symbolsWon: playRecord.symbolsWon
              ? playRecord.symbolsWon.split(",")
              : [],
          };
        });
      } catch (error: any) {
        log.error("Match & Win failure", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          error.message || "Failed to process Match & Win play",
        );
      }
    },
  },
};
