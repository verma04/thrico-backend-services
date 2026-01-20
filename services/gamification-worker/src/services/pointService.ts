import {
  AppDatabase,
  pointRules,
  userPointsHistory,
  gamificationUser,
  ranks,
  userRankHistory,
  badges,
  userBadges,
} from "@thrico/database";
import { and, eq, lte, desc } from "drizzle-orm";
import { Redis } from "ioredis";
import { log } from "@thrico/logging";

export class PointService {
  static async awardPoints(
    tx: any,
    redis: Redis,
    gUser: any,
    rules: any[],
    event: any
  ) {
    // Validate gUser has required fields
    if (!gUser || !gUser.id) {
      const error = new Error("Invalid gamification user - missing ID");
      log.error("Cannot award points - invalid gUser", {
        gUser,
        event,
      });
      throw error;
    }

    log.info("Awarding points", {
      gUserId: gUser.id,
      userId: gUser.user,
      rulesCount: rules.length,
    });
    let totalAwardedPoints = 0;
    let finalTotalPoints = gUser.totalPoints;

    for (const rule of rules) {
      try {
        // Trigger Check (FIRST_TIME vs RECURRING)
        if (rule.trigger === "FIRST_TIME") {
          const alreadyAwarded = await tx.query.userPointsHistory.findFirst({
            where: and(
              eq(userPointsHistory.userId, gUser.id),
              eq(userPointsHistory.pointRuleId, rule.id)
            ),
          });

          if (alreadyAwarded) {
            log.info("Rule already awarded (FIRST_TIME)", {
              userId: gUser.user,
              ruleId: rule.id,
            });
            continue;
          }
        }

        // Cooldown Check
        const ruleCooldownKey = `gm:cooldown:${gUser.user}:${rule.id}`;
        const onCooldown = await redis.exists(ruleCooldownKey);
        if (onCooldown) {
          log.info("User on cooldown for this rule", {
            userId: gUser.user,
            ruleId: rule.id,
          });
          continue;
        }

        // Award points
        totalAwardedPoints += rule.points;
        finalTotalPoints += rule.points;

        // Verify gamification user exists in the database before inserting point history
        log.info(
          "Verifying gamification user exists before point history insert",
          {
            gUserId: gUser.id,
          }
        );

        const userExists = await tx.query.gamificationUser.findFirst({
          where: eq(gamificationUser.id, gUser.id),
        });

        if (!userExists) {
          const error = new Error(
            `Gamification user ${gUser.id} does not exist in database before point history insert. This indicates a transaction isolation issue.`
          );
          log.error("Gamification user not found in database", {
            gUserId: gUser.id,
            userId: gUser.user,
            entityId: gUser.entityId,
          });
          throw error;
        }

        log.info(
          "Gamification user verified, proceeding with point history insert",
          {
            gUserId: gUser.id,
            userExistsId: userExists.id,
          }
        );

        // Log points history
        log.info("Inserting point history", {
          userId: gUser.id,
          pointRuleId: rule.id,
          pointsEarned: rule.points,
        });

        await tx.insert(userPointsHistory).values({
          userId: gUser.id,
          pointRuleId: rule.id,
          pointsEarned: rule.points,
          metadata: event.metadata,
        });

        // Set Cooldown
        await redis.set(ruleCooldownKey, "1", "EX", 5);
      } catch (error: any) {
        log.error("Error awarding points for rule", {
          ruleId: rule.id,
          gUserId: gUser.id,
          userId: gUser.user,
          error: error.message,
          constraint: error.constraint,
        });
        throw error;
      }
    }

    return { totalAwardedPoints, finalTotalPoints };
  }

  static async checkRankProgression(
    tx: any,
    gUser: any,
    finalTotalPoints: number,
    entityId: string
  ) {
    const nextRank = await tx.query.ranks.findFirst({
      where: and(
        eq(ranks.entityId, entityId),
        eq(ranks.isActive, true),
        lte(ranks.minPoints, finalTotalPoints)
      ),
      orderBy: [desc(ranks.minPoints)],
    });

    if (nextRank && nextRank.id !== gUser.currentRankId) {
      await tx
        .update(gamificationUser)
        .set({ currentRankId: nextRank.id })
        .where(eq(gamificationUser.id, gUser.id));

      await tx.insert(userRankHistory).values({
        userId: gUser.id,
        fromRankId: gUser.currentRankId,
        toRankId: nextRank.id,
        achievedAt: new Date(),
      });
      log.info("User promoted to new rank", {
        userId: gUser.user,
        rank: nextRank.name,
      });
    }
  }

  static async checkPointsBadges(
    tx: any,
    gUser: any,
    finalTotalPoints: number,
    entityId: string
  ) {
    const pointBadges = await tx.query.badges.findMany({
      where: and(
        eq(badges.entityId, entityId),
        eq(badges.type, "POINTS"),
        lte(badges.targetValue, finalTotalPoints),
        eq(badges.isActive, true)
      ),
    });

    for (const badge of pointBadges) {
      const alreadyHas = await tx.query.userBadges.findFirst({
        where: and(
          eq(userBadges.userId, gUser.id),
          eq(userBadges.badgeId, badge.id)
        ),
      });

      if (!alreadyHas) {
        await tx.insert(userBadges).values({
          userId: gUser.id,
          badgeId: badge.id,
          progress: finalTotalPoints,
          isCompleted: true,
          earnedAt: new Date(),
        });
        log.info("Point badge awarded!", {
          userId: gUser.user,
          badgeName: badge.name,
        });
      }
    }
  }
}
