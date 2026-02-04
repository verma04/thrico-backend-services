import { AppDatabase } from "@thrico/database";
import { log } from "@thrico/logging";
import { NotificationService as CommonNotificationService } from "@thrico/services";

export class NotificationService {
  static async sendGamificationNotification(
    db: AppDatabase,
    userId: string,
    entityId: string,
    eventData: {
      type: "POINTS_EARNED" | "BADGE_EARNED" | "RANK_UP" | "LEVEL_UP";
      title: string;
      message: string;
      points?: number;
      badge?: any;
      rank?: any;
      payload?: any;
    },
    gamificationUserId?: string,
  ) {
    try {
      log.info("🔔 delegating gamification notification to common service", {
        userId,
        entityId,
        eventType: eventData.type,
      });

      // Map local gamification types to DB notification types if needed
      const notificationType =
        eventData.type === "BADGE_EARNED" ? "BADGE_UNLOCKED" : eventData.type;

      await CommonNotificationService.createNotification({
        db,
        userId,
        entityId,
        content: eventData.message,
        notificationType: notificationType as any,
        shouldSendPush: true,
        pushTitle: eventData.title,
        pushBody: eventData.message,
      });

      log.info(
        "✅ Gamification notification sent successfully via common service",
      );
    } catch (error: any) {
      log.error("Failed to send gamification notification", {
        userId,
        entityId,
        error: error.message,
      });
    }
  }
}
