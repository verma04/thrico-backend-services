import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";
import { log } from "@thrico/logging";
import { getDb } from "@thrico/database";
import {
  processContentCreated,
  ContentCreatedPayload,
} from "../processors/contentCreatedProcessor";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ||
  "amqp://admin:mKzQiIos5h1BwfImSYMRznu6PoeZj4gu@mq-admin.thrico.network:5672";

let connection: AmqpConnectionManager;

export const getConnection = () => {
  if (!connection) {
    connection = amqp.connect([RABBITMQ_URL]);
    connection.on("connect", () => log.info("[RabbitMQ] Connected"));
    connection.on("disconnect", (err) =>
      log.error("[RabbitMQ] Disconnected", { error: err.err }),
    );
  }
  return connection;
};

export const createChannel = (
  setupFunc?: (channel: any) => Promise<any>,
): ChannelWrapper => {
  return getConnection().createChannel({
    json: true,
    setup: setupFunc,
  });
};

const MODERATION_QUEUE = "CONTENT_CREATED_MODERATION";

export const startConsumer = () => {
  const channel = createChannel(async (channel) => {
    await channel.assertQueue(MODERATION_QUEUE, { durable: true });

    // Prefetch 5 messages
    await channel.prefetch(5);

    log.info("[RabbitMQ] Content Moderation Consumer started");

    // Consume
    channel.consume(MODERATION_QUEUE, async (msg: any) => {
      if (!msg) return;

      try {
        const content = JSON.parse(
          msg.content.toString(),
        ) as ContentCreatedPayload;

        // Get fresh DB connection (or from pool)
        const db = getDb();

        await processContentCreated(db, content);

        channel.ack(msg);
      } catch (error: any) {
        log.error("[RabbitMQ] Error consuming message", {
          error: error.message,
        });
        // Nack but requeue? Or dead letter?
        // For simplicity: ack to prevent loop if it's a code error.
        // In production, use DLQ.
        channel.ack(msg);
      }
    });
  });

  return channel;
};
