import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";
import { log } from "@thrico/logging";

export class RabbitMQService {
  private static connection: AmqpConnectionManager;
  private static RABBITMQ_URL =
    process.env.RABBITMQ_URL ||
    "amqp://admin:mKzQiIos5h1BwfImSYMRznu6PoeZj4gu@mq-admin.thrico.network:5672";

  static getConnection(): AmqpConnectionManager {
    if (!this.connection) {
      this.connection = amqp.connect([this.RABBITMQ_URL]);
      this.connection.on("connect", () => log.info("[RabbitMQ] Connected"));
      this.connection.on("disconnect", (err) =>
        log.error("[RabbitMQ] Disconnected", { error: err.err }),
      );
    }
    return this.connection;
  }

  static createChannel(
    setupFunc?: (channel: any) => Promise<any>,
  ): ChannelWrapper {
    return this.getConnection().createChannel({
      json: true,
      setup: setupFunc,
    });
  }

  static async publishToQueue(queue: string, message: any) {
    const channel = this.createChannel(async (ch) => {
      await ch.assertQueue(queue, { durable: true });
    });

    try {
      await channel.sendToQueue(queue, message);
      log.debug(`[RabbitMQ] Message published to ${queue}`, { message });
    } catch (error: any) {
      log.error(`[RabbitMQ] Failed to publish message to ${queue}`, {
        error: error.message,
      });
      throw error;
    } finally {
      // We don't necessarily want to close the channel every time if we reuse it,
      // but for simple publishers, it's safer. AmqpConnectionManager handles reconnections.
    }
  }
}
