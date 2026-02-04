import {
  AppDatabase,
  pointRules,
  badges,
  gamificationUser,
} from "@thrico/database";
import { Redis } from "ioredis";
import { log } from "@thrico/logging";
import { eq, and } from "drizzle-orm";
import { UserService } from "../services/userService";
import { PointService } from "../services/pointService";
import { BadgeService } from "../services/badgeService";
import { LeaderboardService } from "../services/leaderboardService";

export type GamificationEvent = {
  triggerId: string;
  moduleId: string;
  userId: string;
  entityId: string;
  metadata?: any;
};

export async function processEvent(
  event: GamificationEvent,
  db: AppDatabase,
  redis: Redis,
) {
  const { triggerId, moduleId, userId, entityId } = event;
  log.info("Processing event", { triggerId, userId });

  // 1. Idempotency Check
  const eventHash =
    event.metadata?.eventId || `evt:${triggerId}:${userId}:${Date.now()}`;
  const idempotencyKey = `gm:idemp:${eventHash}`;
  const isDuplicate = await redis.set(idempotencyKey, "1", "EX", 86400, "NX");
  if (!isDuplicate) {
    log.warn("Duplicate event detected, skipping", { idempotencyKey });
    return;
  }

  // 2. Load Rules Concurrently
  const [rules, actionBadges] = await Promise.all([
    db.query.pointRules.findMany({
      where: and(
        eq(pointRules.entityId, entityId),
        eq(pointRules.module, moduleId),
        eq(pointRules.action, triggerId),
        eq(pointRules.isActive, true),
      ),
    }),
    db.query.badges.findMany({
      where: and(
        eq(badges.entityId, entityId),
        eq(badges.type, "ACTION"),
        eq(badges.module, moduleId),
        eq(badges.action, triggerId),
        eq(badges.isActive, true),
      ),
    }),
  ]);

  if (!rules?.length && !actionBadges?.length) {
    log.warn("No active point rules or action badges found for event", {
      triggerId,
      moduleId,
    });
    return;
  }

  try {
    let totalAwardedPoints = 0;

    await db.transaction(async (tx) => {
      // 3. User Management
      const gUser = await UserService.getOrCreateGamificationUser(
        tx,
        userId,
        entityId,
      );

      // Validate gUser was created successfully
      if (!gUser || !gUser.id) {
        throw new Error(
          `Failed to get or create gamification user for userId: ${userId}, entityId: ${entityId}`,
        );
      }

      log.info("Gamification user ready", {
        gUserId: gUser.id,
        userId: gUser.user,
        entityId: gUser.entityId,
        totalPoints: gUser.totalPoints,
      });

      // 4. Point Awarding
      const { totalAwardedPoints: awarded, finalTotalPoints } =
        await PointService.awardPoints(tx, redis, gUser, rules, event);

      totalAwardedPoints = awarded;

      // 5. Action Badge Processing
      await BadgeService.processActionBadges(tx, db, gUser, actionBadges);

      // 6. Points-based Progression (Ranks & Point Badges)
      if (totalAwardedPoints > 0) {
        await tx
          .update(gamificationUser)
          .set({
            totalPoints: finalTotalPoints,
            updatedAt: new Date(),
          })
          .where(eq(gamificationUser.id, gUser.id));

        await PointService.checkRankProgression(
          tx,
          db,
          gUser,
          finalTotalPoints,
          entityId,
        );
        await PointService.checkPointsBadges(
          tx,
          db,
          gUser,
          finalTotalPoints,
          entityId,
        );
      }
    });

    // 7. Async Updates (Leaderboards)
    if (totalAwardedPoints > 0) {
      await LeaderboardService.updateLeaderboards(
        redis,
        userId,
        entityId,
        totalAwardedPoints,
      );

      log.info("User rewarded successfully", {
        userId,
        points: totalAwardedPoints,
      });
    }
  } catch (error: any) {
    log.error("Failed to reward user", {
      userId,
      entityId,
      triggerId,
      moduleId,
      error: error.message,
      errorStack: error.stack,
      constraint: error.constraint,
    });
    throw error;
  }
}
