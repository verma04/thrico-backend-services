import { createChannel } from "./email-rabbit";

const OTP_EMAIL_QUEUE = "OTP_EMAIL";

const otpChannel = createChannel((channel) => {
  return Promise.all([channel.assertQueue(OTP_EMAIL_QUEUE, { durable: true })]);
});

const sendEmailOtp = async (email: string, otp: string, name: string) => {
  try {
    console.log(
      `[QUEUE] Pushing OTP ${otp} to RabbitMQ queue ${OTP_EMAIL_QUEUE} for ${email}`
    );

    await otpChannel.sendToQueue(OTP_EMAIL_QUEUE, { email, otp, name }, {
      persistent: true,
    } as any);

    console.log("[QUEUE] OTP pushed to RabbitMQ successfully");
  } catch (error) {
    console.error("[QUEUE] Exception pushing OTP to RabbitMQ:", error);
  }
};

export default sendEmailOtp;
