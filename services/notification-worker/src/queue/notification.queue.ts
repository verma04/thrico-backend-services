import { log } from "@thrico/logging";
import { RabbitMQService } from "@thrico/services";
import { CloseFriendNotificationProcessor } from "src/processors/closefriend-notification.processor";

const CLOSE_FRIEND_QUEUE = "CLOSE_FRIEND_NOTIFICATIONS";

export const startConsumer: any = () => {
  const channel = RabbitMQService.createChannel(async (channel) => {
    await channel.assertQueue(CLOSE_FRIEND_QUEUE, { durable: true });

    // Prefetch 10 messages
    await channel.prefetch(10);

    log.info(
      `[RabbitMQ] Notification Worker Consumer started on queue: ${CLOSE_FRIEND_QUEUE}`,
    );

    // Consume
    channel.consume(CLOSE_FRIEND_QUEUE, async (msg: any) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());

        console.log(content);

        log.debug("Received close friend notification task", {
          creatorId: content.creatorId,
          type: content.type,
        });

        await CloseFriendNotificationProcessor.process(content);

        channel.ack(msg);
      } catch (error: any) {
        log.error("[RabbitMQ] Error consuming close friend notification", {
          error: error.message,
        });
        // Ack to prevent infinite loops on malformed messages.
        channel.ack(msg);
      }
    });
  });

  return channel;
};
