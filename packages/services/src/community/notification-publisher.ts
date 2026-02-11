import { RabbitMQService } from "../utils/rabbitmq.service";
import { log } from "@thrico/logging";
import { CommunityNotificationService } from "./community-notification.service";

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

  static async publishWelcomeMessage(params: {
    userId: string;
    communityId: string;
    community: any;
    user: any;
    db: any;
    entityId: string;
  }) {
    return CommunityNotificationService.notifyWelcome(params);
  }

  /**
   * @deprecated Use CommunityNotificationService.notifyJoinRequest instead
   */
  static async publishJoinRequest(params: {
    requesterId: string;
    communityId: string;
    community: any;
    user: any;
    db: any;
    entityId: string;
  }) {
    return CommunityNotificationService.notifyJoinRequest(params);
  }

  /**
   * @deprecated Use CommunityNotificationService.notifyCommunityCreated instead
   */
  static async publishCommunityCreated(params: {
    userId: string;
    communityId: string;
    community: any;
    user: any;
    db: any;
    entityId: string;
  }) {
    return CommunityNotificationService.notifyCommunityCreated(params);
  }

  /**
   * @deprecated Use CommunityNotificationService.notifyRatingReceived instead
   */
  static async publishRatingReceived(params: {
    userId: string;
    communityId: string;
    community: any;
    user: any;
    rating: number;
    db: any;
    entityId: string;
  }) {
    return CommunityNotificationService.notifyRatingReceived(params);
  }

  /**
   * @deprecated Use CommunityNotificationService.notifyRoleUpdated instead
   */
  static async publishRoleUpdated(params: {
    userId: string;
    communityId: string;
    community: any;
    newRole: string;
    db: any;
    entityId: string;
  }) {
    return CommunityNotificationService.notifyRoleUpdated(params);
  }

  static async publishJoinApproved(params: {
    userId: string;
    communityId: string;
    community: any;
    db: any;
    entityId: string;
  }) {
    return CommunityNotificationService.notifyJoinApproved(params);
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
