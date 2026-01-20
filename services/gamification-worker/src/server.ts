import { redis } from "@thrico/database";
import { getDb } from "@thrico/database";
import { log } from "@thrico/logging";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import { processEvent } from "./processors/eventProcessor";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const STREAM_KEY = "gm:events";
const GROUP_NAME = "gamification_workers";
const CONSUMER_NAME = `consumer_${Math.random().toString(36).substr(2, 9)}`;
const HEALTH_PORT = process.env.HEALTH_PORT || 3000;

// Health check endpoint
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", consumer: CONSUMER_NAME }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(HEALTH_PORT, () => {
  log.info(`Health check endpoint listening on port ${HEALTH_PORT}`);
});

async function init() {
  const client = redis.client;
  const db = getDb();

  log.info("Gamification Worker starting...", { consumer: CONSUMER_NAME });

  // Ensure consumer group exists
  try {
    await client.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "$", "MKSTREAM");
    log.info("Consumer group created");
  } catch (err: any) {
    if (err.message.includes("BUSYGROUP")) {
      log.info("Consumer group already exists");
    } else {
      log.error("Error creating consumer group", { error: err.message });
    }
  }

  // Processing loop
  while (true) {
    try {
      // Read new messages
      const streams = (await client.xreadgroup(
        "GROUP",
        GROUP_NAME,
        CONSUMER_NAME,
        "COUNT",
        "10",
        "BLOCK",
        "5000",
        "STREAMS",
        STREAM_KEY,
        ">"
      )) as [string, [string, string[]][]][] | null;

      if (streams) {
        for (const [, messages] of streams) {
          for (const [id, [_, eventJson]] of messages) {
            try {
              const event = JSON.parse(eventJson);
              await processEvent(event, db, client);
              // Acknowledge message
              await client.xack(STREAM_KEY, GROUP_NAME, id);
            } catch (error: any) {
              log.error("Error processing event", { id, error: error.message });
            }
          }
        }
      }

      // Also check for pending messages (PEL) that timed out
      // (Simplified: just handle new ones for now)
    } catch (error: any) {
      log.error("Error in consumption loop", { error: error.message });
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

init().catch((err) => {
  log.error("Fatal worker error", { error: err.message });
  process.exit(1);
});
