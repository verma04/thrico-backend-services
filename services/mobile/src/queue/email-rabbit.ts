import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ||
  "amqp://admin:mKzQiIos5h1BwfImSYMRznu6PoeZj4gu@mq-admin.thrico.network:5672";

let connection: AmqpConnectionManager;
const CUSTOM_DOMAIN_QUEUE = "CUSTOM_DOMAIN";
export const getConnection = () => {
  if (!connection) {
    connection = amqp.connect([RABBITMQ_URL]);
    connection.on("connect", () => console.log("[RabbitMQ] Connected"));
    connection.on("disconnect", (err) =>
      console.error("[RabbitMQ] Disconnected", err.err)
    );
  }
  return connection;
};

export const createChannel = (
  setupFunc?: (channel: any) => Promise<any>
): ChannelWrapper => {
  return getConnection().createChannel({
    json: true,
    setup: setupFunc,
  });
};

const DOMAIN_CHANGE_QUEUE = "DOMAIN_CHANGE";
const domainChannel = createChannel((channel) => {
  return Promise.all([
    channel.assertQueue(CUSTOM_DOMAIN_QUEUE, { durable: true }),
    channel.assertQueue(DOMAIN_CHANGE_QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": "DOMAIN_CHANGE_dlq",
      },
    }),
  ]);
});

export async function changeDomain(data: any) {
  try {
    console.log("[RabbitMQ] Sending change domain event:", data);
    await domainChannel.sendToQueue(DOMAIN_CHANGE_QUEUE, { data }, {
      persistent: true,
    } as any);
  } catch (error) {
    console.error("[RabbitMQ] Error changing domain:", error);
  }
}

export async function customDomainQueue(data: any) {
  try {
    console.log("[RabbitMQ] Sending custom domain event:", data);
    await domainChannel.sendToQueue(CUSTOM_DOMAIN_QUEUE, data, {
      persistent: true,
    } as any);
  } catch (error) {
    console.error("[RabbitMQ] Error sending custom domain:", error);
  }
}
