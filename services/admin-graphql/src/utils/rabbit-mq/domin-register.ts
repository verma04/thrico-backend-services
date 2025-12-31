import { createChannel } from "./client";

const DOMAIN_REGISTER_QUEUE = "DOMAIN_REGISTER";



const domainChannel = createChannel((channel) => {
  return Promise.all([
    channel.assertQueue(DOMAIN_REGISTER_QUEUE, { durable: true }),

  ]);
});

async function registerDomain(data: any) {
  try {
    console.log(data, "dsd");
    await domainChannel.sendToQueue(DOMAIN_REGISTER_QUEUE, data, {
      persistent: true,
    } as any);
  } catch (error) {
    console.error("[RabbitMQ] Error registering domain:", error);
  }
}


export { registerDomain,  };
