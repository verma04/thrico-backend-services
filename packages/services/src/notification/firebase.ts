import { log } from "@thrico/logging";
import { RabbitMQService } from "../utils/rabbitmq.service";

export interface PushNotificationPayload {
  tokens: string[];
  title: string;
  body: string;
  payload?: any;
}

export class FirebaseService {
  private static PUSH_QUEUE = "PUSH_NOTIFICATIONS";

  static async sendToDevices(data: PushNotificationPayload) {
    try {
      log.debug("Publishing push notification to queue", {
        tokenCount: data.tokens.length,
        title: data.title,
      });

      await RabbitMQService.publishToQueue(this.PUSH_QUEUE, data);

      return { success: true, queued: true };
    } catch (error: any) {
      log.error("Failed to publish push notification to queue", {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }
}
