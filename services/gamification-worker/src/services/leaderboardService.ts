import { Redis } from "ioredis";
import { log } from "@thrico/logging";

export class LeaderboardService {
  static async updateLeaderboards(
    redis: Redis,
    userId: string,
    entityId: string,
    points: number
  ) {
    if (points <= 0) return;

    const dailyKey = `gm:leaderboard:daily:${entityId}:${
      new Date().toISOString().split("T")[0]
    }`;
    await redis.zincrby(dailyKey, points, userId);

    log.info("Leaderboards updated", { userId, awardedPoints: points });
  }
}
