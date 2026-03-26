import { log } from "@thrico/logging";
import { desc, lt, and, eq } from "drizzle-orm";
import { momentNotifications, user, moments } from "@thrico/database";
import { NotificationService } from "../notification/notification.service";

export class MomentNotificationService {
  /**
   * Get moment-specific notifications for a user (likes, comments, etc.)
   */
  static async getMomentNotifications({
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
      log.debug("Getting moment notifications", { userId, cursor, limit });

      const query = db
        .select({
          id: momentNotifications.id,
          type: momentNotifications.type,
          content: momentNotifications.content,
          isRead: momentNotifications.isRead,
          createdAt: momentNotifications.createdAt,
          sender: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          momentId: momentNotifications.momentId,
        })
        .from(momentNotifications)
        .leftJoin(user, eq(momentNotifications.senderId, user.id))
        .where(
          and(
            eq(momentNotifications.userId, userId),
            cursor
              ? lt(momentNotifications.createdAt, new Date(cursor))
              : undefined,
          ),
        )
        .orderBy(desc(momentNotifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getMomentNotifications", { error, userId });
      throw error;
    }
  }

  /**
   * Notify user of a comment on their moment
   */
  static async notifyMomentComment({
    db,
    userId,
    senderId,
    entityId,
    momentId,
    commenterName,
    momentCaption,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    momentId: string;
    commenterName: string;
    momentCaption?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "MOMENT",
        type: "MOMENT_COMMENT",
        content: `${commenterName} commented on your moment${momentCaption ? `: "${momentCaption.substring(0, 50)}..."` : ""}.`,
        momentId,
        shouldSendPush: true,
        pushTitle: "New Comment on Moment",
        pushBody: `${commenterName} commented on your moment`,
      });

      log.info("Moment comment notification sent", { userId, momentId });
    } catch (error: any) {
      log.error("Failed to send moment comment notification", {
        error: error.message,
        userId,
        momentId,
      });
    }
  }

  /**
   * Notify user of a like on their moment
   */
  static async notifyMomentLike({
    db,
    userId,
    senderId,
    entityId,
    momentId,
    likerName,
    momentCaption,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    momentId: string;
    likerName: string;
    momentCaption?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "MOMENT",
        type: "MOMENT_LIKE",
        content: `${likerName} liked your moment${momentCaption ? `: "${momentCaption.substring(0, 50)}..."` : ""}.`,
        momentId,
        shouldSendPush: true,
        pushTitle: "New Like on Moment",
        pushBody: `${likerName} liked your moment`,
      });

      log.info("Moment like notification sent", { userId, momentId });
    } catch (error: any) {
      log.error("Failed to send moment like notification", {
        error: error.message,
        userId,
        momentId,
      });
    }
  }
}
