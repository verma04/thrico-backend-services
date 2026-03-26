import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";
import { config } from "../config";
import { log } from "@thrico/logging";
import { AIService } from "@thrico/services";
import { getDb, moments } from "@thrico/database";
import { eq } from "drizzle-orm";

export class AIConsumer {
  private static connection: AmqpConnectionManager;
  private static channelWrapper: ChannelWrapper;

  static async start() {
    this.connection = amqp.connect([config.rabbitmq.url]);

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: (channel: any) => {
        return Promise.all([
          channel.assertQueue(config.rabbitmq.queue, { durable: true }),
          channel.prefetch(config.ai.maxConcurrentJobs),
          channel.consume(config.rabbitmq.queue, (data: any) =>
            this.processMessage(data),
          ),
        ]);
      },
    });

    log.info("AI Worker Consumer started", { queue: config.rabbitmq.queue });
  }

  private static async processMessage(message: any) {
    if (!message) return;

    try {
      const payload = JSON.parse(message.content.toString());
      const { momentId, caption } = payload;

      if (!momentId || !caption) {
        this.channelWrapper.ack(message);
        return;
      }

      log.info("Processing AI analysis for moment", { momentId });

      try {
        const [analysis, embedding] = await Promise.all([
          AIService.analyzeCaption(caption),
          AIService.generateEmbedding(caption),
        ]);

        const db = getDb();
        await db
          .update(moments)
          .set({
            detectedCategory: analysis.category,
            extractedKeywords: analysis.keywords,
            sentimentScore: analysis.sentiment,
            embedding: embedding,
            updatedAt: new Date(),
          })
          .where(eq(moments.id, momentId));

        log.info("AI analysis completed successfully", { momentId });
        this.channelWrapper.ack(message);
      } catch (innerError: any) {
        log.error("AI analysis failed", {
          momentId,
          error: innerError.message,
        });
        this.channelWrapper.ack(message);
      }
    } catch (outerError: any) {
      log.error("Outer AI consumer error", { error: outerError.message });
      this.channelWrapper.nack(message, false, true);
    }
  }
}
