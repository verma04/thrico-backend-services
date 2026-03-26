import { createChannel } from "./email-rabbit";

const EMAIL_SEND_QUEUE = "EMAIL_SEND";
const EMAIL_BULK_QUEUE = "EMAIL_BULK";

const emailSendChannel = createChannel((channel) => {
  return Promise.all([
    channel.assertQueue(EMAIL_SEND_QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": "EMAIL_SEND_dlq",
      },
    }),
    channel.assertQueue(EMAIL_BULK_QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": "EMAIL_BULK_dlq",
      },
    }),
  ]);
});

/**
 * Queue a single email for sending.
 */
export async function queueEmail(data: {
  entityId: string;
  to: string;
  subject: string;
  html: string;
  from: string;
}) {
  try {
    console.log("[RabbitMQ] Queuing email send:", data.to);
    await emailSendChannel.sendToQueue(EMAIL_SEND_QUEUE, data, {
      persistent: true,
    } as any);
  } catch (error) {
    console.error("[RabbitMQ] Error queuing email:", error);
    throw error;
  }
}

/**
 * Queue a bulk email batch for sending.
 */
export async function queueBulkEmails(data: {
  entityId: string;
  recipients: string[];
  subject: string;
  html: string;
  from: string;
}) {
  try {
    console.log(
      `[RabbitMQ] Queuing bulk email to ${data.recipients.length} recipients`,
    );
    await emailSendChannel.sendToQueue(EMAIL_BULK_QUEUE, data, {
      persistent: true,
    } as any);
  } catch (error) {
    console.error("[RabbitMQ] Error queuing bulk email:", error);
    throw error;
  }
}
