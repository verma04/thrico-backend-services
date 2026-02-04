import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";
import { log } from "@thrico/logging";

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

const NOTIFICATION_QUEUE = "GAMIFICATION_NOTIFICATION";

const notifChannel = createChannel((channel) => {
  return Promise.all([
    channel.assertQueue(NOTIFICATION_QUEUE, { durable: true }),
  ]);
});

export interface NotificationPayload {
  userId: string;
  entityId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  entity: {
    name: string;
    logo?: string;
    domain?: string;
  };
  event: {
    type: "POINTS_EARNED" | "BADGE_EARNED" | "RANK_UP" | "LEVEL_UP";
    title: string;
    message: string;
    points?: number;
    badge?: any;
    rank?: any;
    payload?: any;
  };
  timestamp: string;
}

export const pushNotification = async (payload: NotificationPayload) => {
  try {
    log.info("Pushing notification to RabbitMQ", {
      userId: payload.userId,
      type: payload.event.type,
    });

    await notifChannel.sendToQueue(NOTIFICATION_QUEUE, payload, {
      persistent: true,
    } as any);
  } catch (error: any) {
    log.error("Failed to push notification to RabbitMQ", {
      error: error.message,
    });
  }
};
