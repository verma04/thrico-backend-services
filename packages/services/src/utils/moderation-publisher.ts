import { RabbitMQService } from "./rabbitmq.service";
import { log } from "@thrico/logging";

export interface ModerationPayload {
  userId: string;
  entityId: string;
  contentId: string;
  contentType: "POST" | "COMMENT" | "MESSAGE";
  text: string;
  timestamp: string;
}

export class ModerationPublisher {
  private static MODERATION_QUEUE = "CONTENT_CREATED_MODERATION";

  static async publish(params: {
    userId: string;
    entityId: string;
    contentId: string;
    contentType: "POST" | "COMMENT" | "MESSAGE";
    text: string;
  }) {
    try {
      const payload: ModerationPayload = {
        ...params,
        timestamp: new Date().toISOString(),
      };

      await RabbitMQService.publishToQueue(this.MODERATION_QUEUE, payload);

      log.info(
        `[ModerationPublisher] Published ${params.contentType} to moderation queue`,
        {
          contentId: params.contentId,
          userId: params.userId,
        },
      );
    } catch (error: any) {
      log.error(`[ModerationPublisher] Failed to publish to moderation queue`, {
        error: error.message,
        contentId: params.contentId,
      });
      // We don't throw here to avoid blocking the main content creation flow
    }
  }
}
