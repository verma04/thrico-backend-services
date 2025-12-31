import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";

const RABBITMQ_URL = "amqp://admin:secret@domain-queue.thrico.network:5672";

let connection: AmqpConnectionManager;

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
  console.log("[RabbitMQ] Creating channel...");
  return getConnection().createChannel({
    json: true,
    setup: (channel: any) => {
      console.log("[RabbitMQ] Channel setup");
      return setupFunc ? setupFunc(channel) : Promise.resolve();
    },
  });
};
