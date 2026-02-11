import { Redis } from "ioredis";
import { log } from "@thrico/logging";
import { GamificationNotificationService } from "@thrico/services";
import { AppDatabase } from "@thrico/database";

export class LeaderboardService {
  static async updateLeaderboards(
    redis: Redis,
    db: AppDatabase,
    userId: string,
    entityId: string,
    points: number,
  ) {
    if (points <= 0) return;

    const dailyKey = `gm:leaderboard:daily:${entityId}:${
      new Date().toISOString().split("T")[0]
    }`;

    // Get previous rank before update
    const previousRank = await redis.zrevrank(dailyKey, userId);
    const previousPosition = previousRank !== null ? previousRank + 1 : null;

    // Update score
    await redis.zincrby(dailyKey, points, userId);

    // Get new rank after update
    const newRank = await redis.zrevrank(dailyKey, userId);
    const newPosition = newRank !== null ? newRank + 1 : null;

    log.info("Leaderboards updated", {
      userId,
      awardedPoints: points,
      previousPosition,
      newPosition,
    });

    // Send notifications for significant position changes
    if (
      newPosition !== null &&
      (previousPosition === null || newPosition < previousPosition)
    ) {
      // Notify for reaching top 3
      if (
        newPosition <= 3 &&
        (previousPosition === null || previousPosition > 3)
      ) {
        await GamificationNotificationService.notifyLeaderboardAchievement({
          db,
          userId,
          entityId,
          type: "TOP_3",
          position: newPosition,
          period: "daily",
        });
      }
      // Notify for reaching top 10 (but not if already notified for top 3)
      else if (
        newPosition <= 10 &&
        (previousPosition === null || previousPosition > 10)
      ) {
        await GamificationNotificationService.notifyLeaderboardAchievement({
          db,
          userId,
          entityId,
          type: "TOP_10",
          position: newPosition,
          period: "daily",
        });
      }
    }
  }
}
