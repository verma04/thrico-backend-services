import { RabbitMQService } from "../utils/rabbitmq.service";
import { log } from "@thrico/logging";
import { NotificationService } from "../notification/notification.service";

export interface CommunityEventPayload {
  eventName:
    | "COMMUNITY_WELCOME"
    | "COMMUNITY_JOIN_REQUEST"
    | "COMMUNITY_CREATED"
    | "COMMUNITY_RATING_RECEIVED"
    | "COMMUNITY_ROLE_UPDATED"
    | "COMMUNITY_JOIN_APPROVED";
  userId: string;
  communityId: string;
  community: any;
  user: any;
  timestamp: string;
  details?: any;
}

export class CommunityNotificationPublisher {
  private static QUEUE_NAME = "COMMUNITY_EVENTS";

  static async publishWelcomeMessage({
    userId,
    communityId,
    community,
    user,
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
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        notificationType: "COMMUNITY_WELCOME",
        content: `Welcome to "${community.title}"! We're glad to have you here.`,
        shouldSendPush: true,
        pushTitle: "Welcome to the Community",
        pushBody: `You've successfully joined ${community.title}`,
        communityId,
        commNotifType: "WELCOME",
        imageUrl: community.cover,
      });

      // 2. Notify Community Creator (Admin)
      if (community.creator && community.creator !== userId) {
        await NotificationService.createNotification({
          db,
          userId: community.creator,
          entityId,
          notificationType: "COMMUNITY_WELCOME",
          content: `${user.firstName} ${user.lastName} has joined your community "${community.title}".`,
          shouldSendPush: true,
          pushTitle: "New Community Member",
          pushBody: `${user.firstName} joined ${community.title}`,
          communityId,
          commNotifType: "MEMBER_JOINED",
          imageUrl: user.avatar || community.cover,
        });
      }

      const payload: CommunityEventPayload = {
        eventName: "COMMUNITY_WELCOME",
        userId,
        communityId,
        community,
        user,
        timestamp: new Date().toISOString(),
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error("[CommunityNotification] Failed to process welcome message", {
        error: error.message,
        communityId,
        userId,
      });
    }
  }

  static async publishJoinRequest({
    requesterId,
    communityId,
    community,
    user,
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
      // Notify Community Creator (Admin)
      if (community.creator) {
        await NotificationService.createNotification({
          db,
          userId: community.creator,
          entityId,
          notificationType: "COMMUNITY_JOIN_REQUEST",
          content: `${user.firstName} ${user.lastName} has requested to join your community "${community.title}".`,
          shouldSendPush: true,
          pushTitle: "New Join Request",
          pushBody: `${user.firstName} wants to join ${community.title}`,
          communityId,
          commNotifType: "JOIN_REQUEST",
          imageUrl: user.avatar || community.cover,
        });
      }

      const payload: CommunityEventPayload = {
        eventName: "COMMUNITY_JOIN_REQUEST",
        userId: requesterId,
        communityId,
        community,
        user,
        timestamp: new Date().toISOString(),
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error("[CommunityNotification] Failed to process join request", {
        error: error.message,
        communityId,
        userId: requesterId,
      });
    }
  }

  static async publishCommunityCreated({
    userId,
    communityId,
    community,
    user,
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
      // 1. Create in-app notification and trigger push via RabbitMQ
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        notificationType: "COMMUNITY_CREATED",
        content: `Congratulations! Your community "${community.title}" has been created successfully.`,
        shouldSendPush: true,
        pushTitle: "Community Created",
        pushBody: `Your community "${community.title}" is now live!`,
        communityId: community.id,
        commNotifType: "CREATED",
        imageUrl: community.cover,
      });

      // 2. Publish to COMMUNITY_EVENTS for other subscribers
      const payload: CommunityEventPayload = {
        eventName: "COMMUNITY_CREATED",
        userId,
        communityId,
        community,
        user,
        timestamp: new Date().toISOString(),
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error(
        "[CommunityNotification] Failed to process community creation",
        {
          error: error.message,
          communityId,
          userId,
        },
      );
    }
  }

  static async publishRatingReceived({
    userId,
    communityId,
    community,
    user,
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
      // Notify Community Creator (Admin)
      if (community.creator) {
        await NotificationService.createNotification({
          db,
          userId: community.creator,
          entityId,
          notificationType: "COMMUNITY_RATING",
          content: `${user.firstName} ${user.lastName} has rated your community "${community.title}" with ${rating} stars.`,
          shouldSendPush: true,
          pushTitle: "New Community Rating",
          pushBody: `${user.firstName} rated ${community.title}: ${rating}/5`,
          communityId,
          commNotifType: "RATING_RECEIVED",
          imageUrl: user.avatar || community.cover,
        });
      }

      const payload: CommunityEventPayload = {
        eventName: "COMMUNITY_RATING_RECEIVED",
        userId,
        communityId,
        community,
        user,
        timestamp: new Date().toISOString(),
        details: { rating },
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error(
        "[CommunityNotification] Failed to process rating notification",
        {
          error: error.message,
          communityId,
          userId,
        },
      );
    }
  }

  static async publishRoleUpdated({
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
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        notificationType: "COMMUNITY_ROLE_UPDATED",
        content: `Your role in "${community.title}" has been updated to ${newRole}.`,
        shouldSendPush: true,
        pushTitle: "Role Updated",
        pushBody: `You are now a ${newRole} in ${community.title}`,
        communityId,
        commNotifType: "ROLE_UPDATED",
        imageUrl: community.cover,
      });

      const payload: CommunityEventPayload = {
        eventName: "COMMUNITY_ROLE_UPDATED",
        userId,
        communityId,
        community,
        user: null, // User is the recipient
        timestamp: new Date().toISOString(),
        details: { newRole },
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error(
        "[CommunityNotification] Failed to process role update notification",
        {
          error: error.message,
          communityId,
          userId,
        },
      );
    }
  }

  static async publishJoinApproved({
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
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        notificationType: "COMMUNITY_JOIN_APPROVED",
        content: `Your request to join "${community.title}" has been approved!`,
        shouldSendPush: true,
        pushTitle: "Join Request Approved",
        pushBody: `Welcome to ${community.title}! You are now a member.`,
        communityId,
        commNotifType: "JOIN_APPROVED",
        imageUrl: community.cover,
      });

      const payload: CommunityEventPayload = {
        eventName: "COMMUNITY_JOIN_APPROVED",
        userId,
        communityId,
        community,
        user: null, // User is the recipient
        timestamp: new Date().toISOString(),
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error(
        "[CommunityNotification] Failed to process join approval notification",
        {
          error: error.message,
          communityId,
          userId,
        },
      );
    }
  }

  private static async publish(payload: CommunityEventPayload) {
    try {
      await RabbitMQService.publishToQueue(this.QUEUE_NAME, payload);
      log.info(`[CommunityNotification] Published ${payload.eventName}`, {
        communityId: payload.communityId,
        userId: payload.userId,
      });
    } catch (error: any) {
      log.error(
        `[CommunityNotification] Failed to publish ${payload.eventName}`,
        {
          error: error.message,
          communityId: payload.communityId,
        },
      );
    }
  }
}
