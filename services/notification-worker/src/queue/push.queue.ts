import { log } from "@thrico/logging";
import { RabbitMQService, PushNotificationPayload } from "@thrico/services";
import { PushProcessor } from "src/processors/push.processor";

const PUSH_QUEUE = "PUSH_NOTIFICATIONS";

export const startPushConsumer: any = () => {
  const channel = RabbitMQService.createChannel(async (channel) => {
    await channel.assertQueue(PUSH_QUEUE, { durable: true });

    // Prefetch 10 messages
    await channel.prefetch(10);

    log.info(
      `[RabbitMQ] Firebase Push Consumer started on queue: ${PUSH_QUEUE}`,
    );

    // Consume
    channel.consume(PUSH_QUEUE, async (msg: any) => {
      if (!msg) return;

      try {
        const content = JSON.parse(
          msg.content.toString(),
        ) as PushNotificationPayload;

        log.debug("Received push notification task", {
          tokens: content.tokens.length,
          title: content.title,
        });

        await PushProcessor.processPush(content);

        channel.ack(msg);
      } catch (error: any) {
        log.error("[RabbitMQ] Error consuming push notification", {
          error: error.message,
        });
        // In case of failure, we might want to dead-letter the message
        // For now, ack to prevent infinite loops on malformed messages.
        channel.ack(msg);
      }
    });
  });

  return channel;
};
