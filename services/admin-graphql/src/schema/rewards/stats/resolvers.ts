import {
  spinWheelPlays,
  scratchCardPlays,
  matchWinPlays,
} from "@thrico/database";
import { eq, and, sql, gte, count } from "drizzle-orm";
import checkAuth from "../../../utils/auth/checkAuth.utils";
import { log } from "@thrico/logging";

export const spinScratchStatsResolvers = {
  Query: {
    async getSpinScratchStats(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Total spin stats
        const [spinTotals] = await db
          .select({
            totalPlays: count().mapWith(Number),
            totalTcBurned:
              sql<number>`COALESCE(sum(${spinWheelPlays.tcSpent}), 0)`.mapWith(
                Number,
              ),
            totalTcRewarded:
              sql<number>`COALESCE(sum(CASE WHEN ${spinWheelPlays.prizeType} = 'TC' THEN ${spinWheelPlays.prizeValue} ELSE 0 END), 0)`.mapWith(
                Number,
              ),
          })
          .from(spinWheelPlays)
          .where(eq(spinWheelPlays.entityId, entity));

        // Total scratch stats
        const [scratchTotals] = await db
          .select({
            totalPlays: count().mapWith(Number),
            totalTcBurned:
              sql<number>`COALESCE(sum(${scratchCardPlays.tcSpent}), 0)`.mapWith(
                Number,
              ),
            totalTcRewarded:
              sql<number>`COALESCE(sum(CASE WHEN ${scratchCardPlays.prizeType} = 'TC' THEN ${scratchCardPlays.prizeValue} ELSE 0 END), 0)`.mapWith(
                Number,
              ),
          })
          .from(scratchCardPlays)
          .where(eq(scratchCardPlays.entityId, entity));

        // Total match win stats
        const [matchWinTotals] = await db
          .select({
            totalPlays: count().mapWith(Number),
            totalTcBurned:
              sql<number>`COALESCE(sum(${matchWinPlays.tcSpent}), 0)`.mapWith(
                Number,
              ),
            totalTcRewarded:
              sql<number>`COALESCE(sum(CASE WHEN ${matchWinPlays.prizeType} = 'TC' THEN ${matchWinPlays.prizeValue} ELSE 0 END), 0)`.mapWith(
                Number,
              ),
          })
          .from(matchWinPlays)
          .where(eq(matchWinPlays.entityId, entity));

        // Today spin stats
        const [spinToday] = await db
          .select({
            plays: count().mapWith(Number),
            tcBurned:
              sql<number>`COALESCE(sum(${spinWheelPlays.tcSpent}), 0)`.mapWith(
                Number,
              ),
            tcRewarded:
              sql<number>`COALESCE(sum(CASE WHEN ${spinWheelPlays.prizeType} = 'TC' THEN ${spinWheelPlays.prizeValue} ELSE 0 END), 0)`.mapWith(
                Number,
              ),
          })
          .from(spinWheelPlays)
          .where(
            and(
              eq(spinWheelPlays.entityId, entity),
              gte(spinWheelPlays.playedAt, today),
            ),
          );

        // Today scratch stats
        const [scratchToday] = await db
          .select({
            plays: count().mapWith(Number),
            tcBurned:
              sql<number>`COALESCE(sum(${scratchCardPlays.tcSpent}), 0)`.mapWith(
                Number,
              ),
            tcRewarded:
              sql<number>`COALESCE(sum(CASE WHEN ${scratchCardPlays.prizeType} = 'TC' THEN ${scratchCardPlays.prizeValue} ELSE 0 END), 0)`.mapWith(
                Number,
              ),
          })
          .from(scratchCardPlays)
          .where(
            and(
              eq(scratchCardPlays.entityId, entity),
              gte(scratchCardPlays.playedAt, today),
            ),
          );

        // Today match win stats
        const [matchWinToday] = await db
          .select({
            plays: count().mapWith(Number),
            tcBurned:
              sql<number>`COALESCE(sum(${matchWinPlays.tcSpent}), 0)`.mapWith(
                Number,
              ),
            tcRewarded:
              sql<number>`COALESCE(sum(CASE WHEN ${matchWinPlays.prizeType} = 'TC' THEN ${matchWinPlays.prizeValue} ELSE 0 END), 0)`.mapWith(
                Number,
              ),
          })
          .from(matchWinPlays)
          .where(
            and(
              eq(matchWinPlays.entityId, entity),
              gte(matchWinPlays.playedAt, today),
            ),
          );

        const totalTcBurned =
          (spinTotals?.totalTcBurned || 0) +
          (scratchTotals?.totalTcBurned || 0) +
          (matchWinTotals?.totalTcBurned || 0);
        const totalTcRewarded =
          (spinTotals?.totalTcRewarded || 0) +
          (scratchTotals?.totalTcRewarded || 0) +
          (matchWinTotals?.totalTcRewarded || 0);

        return {
          totalSpins: spinTotals?.totalPlays || 0,
          totalScratches: scratchTotals?.totalPlays || 0,
          totalMatchWins: matchWinTotals?.totalPlays || 0,
          totalTcBurned,
          totalTcRewarded,
          netTcBurned: totalTcBurned - totalTcRewarded,
          spinStatsToday: {
            plays: spinToday?.plays || 0,
            tcBurned: spinToday?.tcBurned || 0,
            tcRewarded: spinToday?.tcRewarded || 0,
          },
          scratchStatsToday: {
            plays: scratchToday?.plays || 0,
            tcBurned: scratchToday?.tcBurned || 0,
            tcRewarded: scratchToday?.tcRewarded || 0,
          },
          matchWinStatsToday: {
            plays: matchWinToday?.plays || 0,
            tcBurned: matchWinToday?.tcBurned || 0,
            tcRewarded: matchWinToday?.tcRewarded || 0,
          },
        };
      } catch (error: any) {
        log.error("Error in getSpinScratchStats", {
          error: error.message,
          entity,
        });
        throw error;
      }
    },
  },
};
