import { userBadges } from "@thrico/database";
import { and, eq } from "drizzle-orm";
import { log } from "@thrico/logging";
import { GamificationNotificationService } from "@thrico/services";
import { AppDatabase } from "@thrico/database";

export class BadgeService {
  static async processActionBadges(
    tx: any,
    db: AppDatabase,
    gUser: any,
    actionBadges: any[],
  ) {
    for (const badge of actionBadges) {
      if (!badge.isActive) {
        continue;
      }
      let userBadge = await tx.query.userBadges.findFirst({
        where: and(
          eq(userBadges.userId, gUser.id),
          eq(userBadges.badgeId, badge.id),
        ),
      });

      if (!userBadge) {
        log.info("Awarding new action badge (starting progress)", {
          userId: gUser.user,
          badgeId: badge.id,
          badgeName: badge.name,
        });
        userBadge = (
          await tx
            .insert(userBadges)
            .values({
              userId: gUser.id,
              badgeId: badge.id,
              progress: 1,
              isCompleted: badge.targetValue === 1,
            })
            .returning()
        )[0];

        if (userBadge.isCompleted) {
          log.info("Badge completed!", {
            userId: gUser.user,
            badgeName: badge.name,
          });
          await GamificationNotificationService.notifyBadgeUnlocked({
            db,
            userId: gUser.user,
            entityId: gUser.entityId,
            badgeName: badge.name,
            badgeDescription: badge.description,
            badgeImageUrl: badge.icon,
          });
        }
      } else if (!userBadge.isCompleted) {
        const newProgress = userBadge.progress + 1;
        const isNowCompleted = newProgress >= badge.targetValue;

        log.info("Updating action badge progress", {
          userId: gUser.user,
          badgeName: badge.name,
          progress: `${newProgress}/${badge.targetValue}`,
        });

        await tx
          .update(userBadges)
          .set({
            progress: newProgress,
            isCompleted: isNowCompleted,
            ...(isNowCompleted ? { earnedAt: new Date() } : {}),
          })
          .where(eq(userBadges.id, userBadge.id));

        if (isNowCompleted) {
          log.info("Badge completed!", {
            userId: gUser.user,
            badgeName: badge.name,
          });
          await GamificationNotificationService.notifyBadgeUnlocked({
            db,
            userId: gUser.user,
            entityId: gUser.entityId,
            badgeName: badge.name,
            badgeDescription: badge.description,
            badgeImageUrl: badge.icon,
          });
        }
      }
    }
  }
}
