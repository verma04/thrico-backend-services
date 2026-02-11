import { log } from "@thrico/logging";
import { and, desc, eq, lt } from "drizzle-orm";
import { networkNotifications, user, userToEntity } from "@thrico/database";
import { NotificationService } from "../notification/notification.service";
import { RabbitMQService } from "../utils/rabbitmq.service";

export interface NotifyCloseFriendParams {
  creatorId: string;
  entityId: string;
  type: string;
  contentId: string;
  title: string;
  module: "COMMUNITY" | "FEED" | "JOB" | "LISTING";
}

export class NetworkNotificationService {
  private static CLOSE_FRIEND_QUEUE_NAME = "CLOSE_FRIEND_NOTIFICATIONS";

  /**
   * Get network-specific notifications for a user (connections, close friend stories)
   */
  static async getNetworkNotifications({
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
      log.debug("Getting network notifications", { userId, cursor, limit });

      const query = db
        .select({
          id: networkNotifications.id,
          type: networkNotifications.type,
          content: networkNotifications.content,
          isRead: networkNotifications.isRead,
          createdAt: networkNotifications.createdAt,
          notificationType: networkNotifications.type,
          sender: {
            id: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
        })
        .from(networkNotifications)
        .leftJoin(
          userToEntity,
          eq(networkNotifications.senderId, userToEntity.id),
        )
        .leftJoin(user, eq(userToEntity.userId, user.id))
        .where(
          and(
            eq(networkNotifications.userId, userId),
            cursor
              ? lt(networkNotifications.createdAt, new Date(cursor))
              : undefined,
          ),
        )
        .orderBy(desc(networkNotifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getNetworkNotifications", { error, userId });
      throw error;
    }
  }

  /**
   * Notify user of a connection request
   */
  static async notifyConnectionRequest({
    db,
    userId,
    senderId,
    entityId,
    senderName,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    senderName: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "NETWORK",
        type: "CONNECTION_REQUEST",
        content: `${senderName} sent you a connection request.`,
        shouldSendPush: true,
        pushTitle: "New Connection Request",
        pushBody: `${senderName} wants to connect with you`,
      });

      log.info("Connection request notification sent", { userId, senderId });
    } catch (error: any) {
      log.error("Failed to send connection request notification", {
        error: error.message,
        userId,
        senderId,
      });
    }
  }

  /**
   * Notify user that their connection request was accepted
   */
  static async notifyConnectionAccepted({
    db,
    userId,
    senderId,
    entityId,
    accepterName,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    accepterName: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "NETWORK",
        type: "CONNECTION_ACCEPTED",
        content: `${accepterName} accepted your connection request.`,
        shouldSendPush: true,
        pushTitle: "Connection Accepted",
        pushBody: `You are now connected with ${accepterName}`,
      });

      log.info("Connection accepted notification sent", { userId, senderId });
    } catch (error: any) {
      log.error("Failed to send connection accepted notification", {
        error: error.message,
        userId,
        senderId,
      });
    }
  }

  /**
   * Publish close friend story notification task to queue
   */
  static async publishCloseFriendNotification({
    creatorId,
    entityId,
    type,
    contentId,
    title,
    module,
  }: NotifyCloseFriendParams) {
    try {
      log.debug("Publishing close friend notification task", {
        creatorId,
        type,
        contentId,
      });

      const payload = {
        creatorId,
        entityId,
        type,
        contentId,
        title,
        timestamp: new Date().toISOString(),
        module,
      };

      await RabbitMQService.publishToQueue(
        this.CLOSE_FRIEND_QUEUE_NAME,
        payload,
      );

      log.info("Close friend notification task published", {
        creatorId,
        type,
        contentId,
      });
    } catch (error: any) {
      log.error("Failed to publish close friend notification task", {
        error: error.message,
        creatorId,
        type,
        contentId,
      });
      // Don't throw to avoid breaking main flow
    }
  }

  /**
   * Alias for backward compatibility
   * @deprecated Use publishCloseFriendNotification instead
   */
  static async notifySubscribers(params: NotifyCloseFriendParams) {
    return this.publishCloseFriendNotification(params);
  }
}
