import { createChannel } from "./email-rabbit";

const MENTORSHIP_NOTIFICATION = "MENTORSHIP_NOTIFICATION";

const mentorshipChannel = createChannel((channel) => {
  return Promise.all([
    channel.assertQueue(MENTORSHIP_NOTIFICATION, { durable: true }),
  ]);
});

export const sendMentorshipNotification = async (data: any) => {
  try {
    console.log(
      `[QUEUE] Pushing Mentorship Notification to RabbitMQ queue ${MENTORSHIP_NOTIFICATION}`,
      data,
    );

    await mentorshipChannel.sendToQueue(MENTORSHIP_NOTIFICATION, data, {
      persistent: true,
    } as any);

    console.log(
      "[QUEUE] Mentorship Notification pushed to RabbitMQ successfully",
    );
  } catch (error) {
    console.error(
      "[QUEUE] Exception pushing Mentorship Notification to RabbitMQ:",
      error,
    );
  }
};
