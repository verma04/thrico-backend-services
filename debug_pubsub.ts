import Redis from "ioredis";
import dotenv from "dotenv";
import path from "path";

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function debugPubSub() {
  console.log("--- Debugging Redis Pub/Sub ---");

  const redisConfig = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    connectTimeout: 5000,
    maxRetriesPerRequest: 3,
  };

  console.log("Redis Config:", {
    ...redisConfig,
    password: redisConfig.password ? "***" : undefined,
  });

  const redis = new Redis(redisConfig);
  const channel = "notification:pubsub:debug-test";

  redis.on("error", (err) => {
    console.error("Redis Client Error event:", err.message);
  });

  try {
    console.log("Connecting...");
    await new Promise((resolve, reject) => {
      redis.once("ready", resolve);
      redis.once("error", reject);
      // Timeout if not connected in 3s
      setTimeout(() => reject(new Error("Connection timed out")), 3000);
    });
    console.log("✅ Connected to Redis.");

    console.log(`Attempting to PUBLISH to channel: ${channel}`);
    const subscribers = await redis.publish(
      channel,
      JSON.stringify({ message: "test" }),
    );
    console.log(`✅ Publish successful. Subscribers received: ${subscribers}`);
  } catch (error: any) {
    console.error("❌ Failed to publish.");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    if (error.code) console.error("Error Code:", error.code);
    if (error.errno) console.error("Error Errno:", error.errno);
    if (error.syscall) console.error("Error Syscall:", error.syscall);
    console.error("Stack:", error.stack);
  } finally {
    redis.quit();
  }
}

debugPubSub();
