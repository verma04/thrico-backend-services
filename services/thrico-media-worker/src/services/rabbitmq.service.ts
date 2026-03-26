import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";
import { config } from "../config";
import { logger } from "../utils/logger";

export class RabbitMQService {
  private static connection: AmqpConnectionManager;
  private static channelWrapper: ChannelWrapper;

  static async start() {
    this.connection = amqp.connect([config.rabbitmq.url]);
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: (channel: any) => {
        return Promise.all([
          channel.assertQueue("PROCESS_AI_ANALYSIS", { durable: true }),
        ]);
      },
    });
  }

  static async publishToQueue(queueName: string, data: any) {
    if (!this.channelWrapper) {
      await this.start();
    }
    await this.channelWrapper.sendToQueue(queueName, data);
  }
}
