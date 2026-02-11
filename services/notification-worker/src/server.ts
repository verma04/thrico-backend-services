import { log } from "@thrico/logging";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import { startConsumer as startCloseFriendConsumer } from "./queue/notification.queue";
import { startPushConsumer } from "./queue/push.queue";
import { startAggregationWorker } from "./processors/aggregation-worker";

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const HEALTH_PORT = process.env.NOTIFICATION_WORKER_HEALTH_PORT || 3006;

// Health check endpoint
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "healthy", service: "notification-worker" }),
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(HEALTH_PORT, () => {
  log.info(`Health check endpoint listening on port ${HEALTH_PORT}`);
});

async function init() {
  log.info("🔔 Notification Worker starting (Consolidated)...");

  try {
    // 1. Start Close Friend Notification Consumer
    startCloseFriendConsumer();

    // 2. Start Firebase Push Notification Consumer
    startPushConsumer();

    // 3. Start Notification Aggregation Worker
    startAggregationWorker();

    log.info(
      "Notification Worker initialized successfully with all sub-workers",
    );
  } catch (error: any) {
    log.error("Failed to start Notification Worker", { error: error.message });
    process.exit(1);
  }
}

init().catch((err) => {
  log.error("Fatal worker error", { error: err.message });
  process.exit(1);
});
