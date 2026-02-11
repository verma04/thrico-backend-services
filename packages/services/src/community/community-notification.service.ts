import { log } from "@thrico/logging";
import { eq, and, desc, lt } from "drizzle-orm";
import {
  communityNotifications,
  user,
  userToEntity,
  groups,
} from "@thrico/database";
import { NotificationService } from "../notification/notification.service";

export class CommunityNotificationService {
  /**
   * Get all community notifications for a user with cursor-based pagination
   */
  static async getCommunityNotifications({
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
      log.debug("Getting community notifications", { userId, cursor, limit });

      const query = db
        .select({
          id: communityNotifications.id,
          type: communityNotifications.type,
          content: communityNotifications.content,
          imageUrl: communityNotifications.imageUrl,
          isRead: communityNotifications.isRead,
          createdAt: communityNotifications.createdAt,
          sender: {
            id: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          community: {
            id: groups.id,
            title: groups.title,
            slug: groups.slug,
            cover: groups.cover,
          },
        })
        .from(communityNotifications)
        .leftJoin(
          userToEntity,
          eq(communityNotifications.senderId, userToEntity.id),
        )
        .leftJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(groups, eq(communityNotifications.communityId, groups.id))
        .where(
          and(
            eq(communityNotifications.userId, userId),
            cursor
              ? lt(communityNotifications.createdAt, new Date(cursor))
              : undefined,
          ),
        )
        .orderBy(desc(communityNotifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getCommunityNotifications", { error, userId });
      throw error;
    }
  }

  /**
   * Create a community notification (internal wrapper)
   */
  static async createCommunityNotification({
    db,
    userId,
    senderId,
    entityId,
    content,
    type,
    communityId,
    imageUrl,
    shouldSendPush = true,
    pushTitle,
    pushBody,
  }: {
    db: any;
    userId: string;
    senderId?: string;
    entityId: string;
    content: string;
    type: string;
    communityId: string;
    imageUrl?: string;
    shouldSendPush?: boolean;
    pushTitle?: string;
    pushBody?: string;
  }) {
    return NotificationService.createNotification({
      db,
      userId,
      senderId,
      entityId,
      content,
      module: "COMMUNITY",
      type,
      communityId,
      imageUrl,
      shouldSendPush,
      pushTitle,
      pushBody,
    });
  }

  /**
   * Notify user with welcome message when joining a community
   */
  static async notifyWelcome({
    userId,
    communityId,
    community,
    user: joiningUser,
    db,
    entityId,
  }: {
    userId: string;
    communityId: string;
    community: any;
    user: any;
    db: any;
    entityId: string;
  }) {
    try {
      // 1. Notify Joining User
      await this.createCommunityNotification({
        db,
        userId,
        entityId,
        type: "COMMUNITY_WELCOME",
        content: `Welcome to "${community.title}"! We're glad to have you here.`,
        shouldSendPush: true,
        pushTitle: "Welcome to the Community",
        pushBody: `You've successfully joined ${community.title}`,
        communityId,
        imageUrl: community.cover,
      });

      // 2. Notify Community Creator (Admin)
      if (community.creator && community.creator !== userId) {
        await this.createCommunityNotification({
          db,
          userId: community.creator,
          senderId: userId,
          entityId,
          type: "COMMUNITY_WELCOME",
          content: `${joiningUser.firstName} ${joiningUser.lastName} has joined your community "${community.title}".`,
          shouldSendPush: true,
          pushTitle: "New Community Member",
          pushBody: `${joiningUser.firstName} joined ${community.title}`,
          communityId,
          imageUrl: joiningUser.avatar || community.cover,
        });
      }

      log.info("Welcome notifications sent", { userId, communityId });
    } catch (error: any) {
      log.error("Failed to send welcome notifications", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }

  /**
   * Notify community creator of a join request
   */
  static async notifyJoinRequest({
    requesterId,
    communityId,
    community,
    user: requester,
    db,
    entityId,
  }: {
    requesterId: string;
    communityId: string;
    community: any;
    user: any;
    db: any;
    entityId: string;
  }) {
    try {
      if (community.creator) {
        await this.createCommunityNotification({
          db,
          userId: community.creator,
          senderId: requesterId,
          entityId,
          type: "COMMUNITY_JOIN_REQUEST",
          content: `${requester.firstName} ${requester.lastName} has requested to join your community "${community.title}".`,
          shouldSendPush: true,
          pushTitle: "New Join Request",
          pushBody: `${requester.firstName} wants to join ${community.title}`,
          communityId,
          imageUrl: requester.avatar || community.cover,
        });
      }

      log.info("Join request notification sent", { requesterId, communityId });
    } catch (error: any) {
      log.error("Failed to send join request notification", {
        error: error.message,
        communityId,
        userId: requesterId,
      });
    }
  }

  /**
   * Notify user that their community was created
   */
  static async notifyCommunityCreated({
    userId,
    communityId,
    community,
    db,
    entityId,
  }: {
    userId: string;
    communityId: string;
    community: any;
    db: any;
    entityId: string;
  }) {
    try {
      await this.createCommunityNotification({
        db,
        userId,
        entityId,
        type: "COMMUNITY_CREATED",
        content: `Congratulations! Your community "${community.title}" has been created successfully.`,
        shouldSendPush: true,
        pushTitle: "Community Created",
        pushBody: `Your community "${community.title}" is now live!`,
        communityId: community.id,
        imageUrl: community.cover,
      });

      log.info("Community created notification sent", { userId, communityId });
    } catch (error: any) {
      log.error("Failed to send community created notification", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }

  /**
   * Notify community creator of a rating
   */
  static async notifyRatingReceived({
    userId,
    communityId,
    community,
    user: rater,
    rating,
    db,
    entityId,
  }: {
    userId: string;
    communityId: string;
    community: any;
    user: any;
    rating: number;
    db: any;
    entityId: string;
  }) {
    try {
      if (community.creator) {
        await this.createCommunityNotification({
          db,
          userId: community.creator,
          senderId: userId,
          entityId,
          type: "COMMUNITY_RATING",
          content: `${rater.firstName} ${rater.lastName} has rated your community "${community.title}" with ${rating} stars.`,
          shouldSendPush: true,
          pushTitle: "New Community Rating",
          pushBody: `${rater.firstName} rated ${community.title}: ${rating}/5`,
          communityId,
          imageUrl: rater.avatar || community.cover,
        });
      }

      log.info("Rating notification sent", { userId, communityId, rating });
    } catch (error: any) {
      log.error("Failed to send rating notification", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }

  /**
   * Notify user of role update in community
   */
  static async notifyRoleUpdated({
    userId,
    communityId,
    community,
    newRole,
    db,
    entityId,
  }: {
    userId: string;
    communityId: string;
    community: any;
    newRole: string;
    db: any;
    entityId: string;
  }) {
    try {
      await this.createCommunityNotification({
        db,
        userId,
        entityId,
        type: "COMMUNITY_ROLE_UPDATED",
        content: `Your role in "${community.title}" has been updated to ${newRole}.`,
        shouldSendPush: true,
        pushTitle: "Role Updated",
        pushBody: `You are now a ${newRole} in ${community.title}`,
        communityId,
        imageUrl: community.cover,
      });

      log.info("Role update notification sent", {
        userId,
        communityId,
        newRole,
      });
    } catch (error: any) {
      log.error("Failed to send role update notification", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }

  /**
   * Notify user that their join request was approved
   */
  static async notifyJoinApproved({
    userId,
    communityId,
    community,
    db,
    entityId,
  }: {
    userId: string;
    communityId: string;
    community: any;
    db: any;
    entityId: string;
  }) {
    try {
      await this.createCommunityNotification({
        db,
        userId,
        entityId,
        type: "COMMUNITY_JOIN_APPROVED",
        content: `Your request to join "${community.title}" has been approved!`,
        shouldSendPush: true,
        pushTitle: "Join Request Approved",
        pushBody: `Welcome to ${community.title}! You are now a member.`,
        communityId,
        imageUrl: community.cover,
      });

      log.info("Join approval notification sent", { userId, communityId });
    } catch (error: any) {
      log.error("Failed to send join approval notification", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }

  /**
   * Notify that a post is pending approval in the community
   */
  static async notifyPostPending({
    userId,
    communityId,
    community,
    postTitle,
    db,
    entityId,
  }: {
    userId: string;
    communityId: string;
    community: any;
    postTitle: string;
    db: any;
    entityId: string;
  }) {
    try {
      await this.createCommunityNotification({
        db,
        userId,
        entityId,
        type: "POST_PENDING_COMMUNITY",
        content: `Your post "${postTitle}" in "${community.title}" is pending approval.`,
        shouldSendPush: true,
        pushTitle: "Post Pending Approval",
        pushBody: `Your post in ${community.title} is under review`,
        communityId,
        imageUrl: community.cover,
      });

      log.info("Post pending notification sent", { userId, communityId });
    } catch (error: any) {
      log.error("Failed to send post pending notification", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }

  /**
   * Notify that a post was created in the community
   */
  static async notifyPostCreated({
    userId,
    communityId,
    community,
    postTitle,
    authorName,
    db,
    entityId,
  }: {
    userId: string;
    communityId: string;
    community: any;
    postTitle: string;
    authorName: string;
    db: any;
    entityId: string;
  }) {
    try {
      await this.createCommunityNotification({
        db,
        userId,
        entityId,
        type: "POST_CREATED_COMMUNITY",
        content: `${authorName} posted "${postTitle}" in "${community.title}".`,
        shouldSendPush: true,
        pushTitle: "New Post in Community",
        pushBody: `${authorName} posted in ${community.title}`,
        communityId,
        imageUrl: community.cover,
      });

      log.info("Post created notification sent", { userId, communityId });
    } catch (error: any) {
      log.error("Failed to send post created notification", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }

  /**
   * Notify that a post was approved in the community
   */
  static async notifyPostApproved({
    userId,
    communityId,
    community,
    postTitle,
    db,
    entityId,
  }: {
    userId: string;
    communityId: string;
    community: any;
    postTitle: string;
    db: any;
    entityId: string;
  }) {
    try {
      await this.createCommunityNotification({
        db,
        userId,
        entityId,
        type: "POST_APPROVED_COMMUNITY",
        content: `Your post "${postTitle}" in "${community.title}" has been approved!`,
        shouldSendPush: true,
        pushTitle: "Post Approved",
        pushBody: `Your post in ${community.title} is now live`,
        communityId,
        imageUrl: community.cover,
      });

      log.info("Post approved notification sent", { userId, communityId });
    } catch (error: any) {
      log.error("Failed to send post approved notification", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }
}
