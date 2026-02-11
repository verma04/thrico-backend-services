import { log } from "@thrico/logging";
import { desc, lt, and, eq } from "drizzle-orm";
import { feedNotifications, user, userFeed } from "@thrico/database";
import { NotificationService } from "../notification/notification.service";

export class FeedNotificationService {
  /**
   * Get feed-specific notifications for a user (comments, likes, reposts, polls)
   */
  static async getFeedNotifications({
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
      log.debug("Getting feed notifications", { userId, cursor, limit });

      const query = db
        .select({
          id: feedNotifications.id,
          type: feedNotifications.type,
          content: feedNotifications.content,
          isRead: feedNotifications.isRead,
          createdAt: feedNotifications.createdAt,
          sender: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          feed: userFeed,
        })
        .from(feedNotifications)
        .leftJoin(user, eq(feedNotifications.senderId, user.id))
        .leftJoin(userFeed, eq(feedNotifications.feedId, userFeed.id))
        .where(
          and(
            eq(feedNotifications.userId, userId),
            cursor
              ? lt(feedNotifications.createdAt, new Date(cursor))
              : undefined,
          ),
        )
        .orderBy(desc(feedNotifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getFeedNotifications", { error, userId });
      throw error;
    }
  }

  /**
   * Notify user of a comment on their feed
   */
  static async notifyFeedComment({
    db,
    userId,
    senderId,
    entityId,
    feedId,
    commenterName,
    feedContent,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    feedId: string;
    commenterName: string;
    feedContent?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "FEED",
        type: "FEED_COMMENT",
        content: `${commenterName} commented on your post${feedContent ? `: "${feedContent.substring(0, 50)}..."` : ""}.`,
        feedId,
        shouldSendPush: true,
        pushTitle: "New Comment",
        pushBody: `${commenterName} commented on your post`,
      });

      log.info("Feed comment notification sent", { userId, feedId });
    } catch (error: any) {
      log.error("Failed to send feed comment notification", {
        error: error.message,
        userId,
        feedId,
      });
    }
  }

  /**
   * Notify user of a like on their feed
   */
  static async notifyFeedLike({
    db,
    userId,
    senderId,
    entityId,
    feedId,
    likerName,
    feedContent,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    feedId: string;
    likerName: string;
    feedContent?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "FEED",
        type: "FEED_LIKE",
        content: `${likerName} liked your post${feedContent ? `: "${feedContent.substring(0, 50)}..."` : ""}.`,
        feedId,
        shouldSendPush: true,
        pushTitle: "New Like",
        pushBody: `${likerName} liked your post`,
      });

      log.info("Feed like notification sent", { userId, feedId });
    } catch (error: any) {
      log.error("Failed to send feed like notification", {
        error: error.message,
        userId,
        feedId,
      });
    }
  }

  /**
   * Notify user of a repost of their feed
   */
  static async notifyFeedRepost({
    db,
    userId,
    senderId,
    entityId,
    feedId,
    reposterName,
    feedContent,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    feedId: string;
    reposterName: string;
    feedContent?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "FEED",
        type: "FEED_REPOST",
        content: `${reposterName} reposted your post${feedContent ? `: "${feedContent.substring(0, 50)}..."` : ""}.`,
        feedId,
        shouldSendPush: true,
        pushTitle: "New Repost",
        pushBody: `${reposterName} reposted your post`,
      });

      log.info("Feed repost notification sent", { userId, feedId });
    } catch (error: any) {
      log.error("Failed to send feed repost notification", {
        error: error.message,
        userId,
        feedId,
      });
    }
  }

  /**
   * Notify user of a vote on their poll
   */
  static async notifyPollVote({
    db,
    userId,
    senderId,
    entityId,
    feedId,
    voterName,
    pollQuestion,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    feedId: string;
    voterName: string;
    pollQuestion?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "FEED",
        type: "POLL_VOTE",
        content: `${voterName} voted on your poll${pollQuestion ? `: "${pollQuestion.substring(0, 50)}..."` : ""}.`,
        feedId,
        shouldSendPush: true,
        pushTitle: "New Poll Vote",
        pushBody: `${voterName} voted on your poll`,
      });

      log.info("Poll vote notification sent", { userId, feedId });
    } catch (error: any) {
      log.error("Failed to send poll vote notification", {
        error: error.message,
        userId,
        feedId,
      });
    }
  }
}
