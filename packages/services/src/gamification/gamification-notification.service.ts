import { log } from "@thrico/logging";
import { NotificationService } from "../notification/notification.service";

export class GamificationNotificationService {
  /**
   * Notify user of points earned
   */
  static async notifyPointsEarned({
    db,
    userId,
    entityId,
    points,
    reason,
  }: {
    db: any; // Can be db or tx
    userId: string;
    entityId: string;
    points: number;
    reason: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        module: "GAMIFICATION",
        type: "POINTS_EARNED",
        content: `You earned ${points} points for ${reason}!`,
        shouldSendPush: true,
        pushTitle: "Points Earned!",
        pushBody: `You earned ${points} points for ${reason}!`,
        points,
      });

      log.info("Points earned notification sent", { userId, points });
    } catch (error: any) {
      log.error("Failed to send points earned notification", {
        error: error.message,
        userId,
        points,
      });
    }
  }

  /**
   * Notify user of leaderboard achievement
   */
  static async notifyLeaderboardAchievement({
    db,
    userId,
    entityId,
    type,
    position,
    period, // 'daily' | 'weekly'
  }: {
    db: any;
    userId: string;
    entityId: string;
    type: "TOP_3" | "TOP_10";
    position: number;
    period: string;
  }) {
    try {
      const isTop3 = type === "TOP_3";
      const title = isTop3
        ? "Leaderboard Achievement! 🏆"
        : "Leaderboard Progress! 📈";
      const message = isTop3
        ? `You're now #${position} on today's leaderboard!`
        : `You've climbed to #${position} on today's leaderboard!`;

      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        module: "GAMIFICATION",
        type: "LEADERBOARD",
        content: message,
        shouldSendPush: true,
        pushTitle: title,
        pushBody: message,
        imageUrl: "/gamification_leaderboard.png",
      });

      log.info("Leaderboard notification sent", { userId, type, position });
    } catch (error: any) {
      log.error("Failed to send leaderboard notification", {
        error: error.message,
        userId,
        type,
        position,
      });
    }
  }

  /**
   * Notify user of badge unlocked
   */
  static async notifyBadgeUnlocked({
    db,
    userId,
    entityId,
    badgeName,
    badgeDescription,
    badgeImageUrl,
  }: {
    db: any;
    userId: string;
    entityId: string;
    badgeName: string;
    badgeDescription?: string;
    badgeImageUrl?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        module: "GAMIFICATION",
        type: "BADGE_UNLOCKED",
        content: `Congratulations! You unlocked the "${badgeName}" badge!${badgeDescription ? ` ${badgeDescription}` : ""}`,
        shouldSendPush: true,
        pushTitle: "Badge Unlocked",
        pushBody: `Congratulations! You unlocked the "${badgeName}" badge!${badgeDescription ? ` ${badgeDescription}` : ""}`,
        imageUrl: badgeImageUrl,
      });

      log.info("Badge unlocked notification sent", { userId, badgeName });
    } catch (error: any) {
      log.error("Failed to send badge unlocked notification", {
        error: error.message,
        userId,
        badgeName,
      });
    }
  }

  /**
   * Notify user of rank up
   */
  static async notifyRankUp({
    db,
    userId,
    entityId,
    newRank,
    oldRank,
  }: {
    db: any;
    userId: string;
    entityId: string;
    newRank: string;
    oldRank?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        module: "GAMIFICATION",
        type: "RANK_UP",
        content: `Congratulations! You've been promoted to ${newRank}${oldRank ? ` from ${oldRank}` : ""}!`,
        shouldSendPush: true,
        pushTitle: "Rank Up!",
        pushBody: `Congratulations! You've been promoted to ${newRank}${oldRank ? ` from ${oldRank}` : ""}!`,
      });

      log.info("Rank up notification sent", { userId, newRank });
    } catch (error: any) {
      log.error("Failed to send rank up notification", {
        error: error.message,
        userId,
        newRank,
      });
    }
  }

  /**
   * Get all gamification notifications for a user
   */
  static async getGamificationNotifications({
    db,
    userId,
    cursor,
    limit = 10,
  }: {
    db: any;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    try {
      const { lt, desc, and, eq } = await import("drizzle-orm");
      const { gamificationNotifications } = await import("@thrico/database");

      log.debug("Getting gamification notifications", {
        userId,
        cursor,
        limit,
      });

      const query = db
        .select({
          id: gamificationNotifications.id,
          type: gamificationNotifications.type,
          content: gamificationNotifications.content,
          isRead: gamificationNotifications.isRead,
          createdAt: gamificationNotifications.createdAt,
          points: gamificationNotifications.points,
          badgeName: gamificationNotifications.badgeName,
          badgeImageUrl: gamificationNotifications.badgeImageUrl,
          rankName: gamificationNotifications.rankName,
        })
        .from(gamificationNotifications)
        .where(
          and(
            eq(gamificationNotifications.userId, userId),
            cursor
              ? lt(gamificationNotifications.createdAt, new Date(cursor))
              : undefined,
          ),
        )
        .orderBy(desc(gamificationNotifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getGamificationNotifications", { error, userId });
      throw error;
    }
  }
}
