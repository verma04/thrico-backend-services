import cron from "node-cron";
import http from "http";
import dotenv from "dotenv";
import path from "path";
import { log } from "@thrico/logging";
import { getDb } from "@thrico/database";
import { checkStorageHealth } from "./jobs/storage-health";
import { resetEmailUsage } from "./jobs/email-usage-reset";
import { LogUploaderService } from "@thrico/services";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const HEALTH_PORT = process.env.CRON_HEALTH_PORT || 3015;

// Health check server
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(HEALTH_PORT, () => {
  log.info(`Cron health check endpoint listening on port ${HEALTH_PORT}`);
});

async function runCronTasks() {
  log.info("Starting Cron Job Registry...");
  
  const db = getDb();

  // Example: Run every hour
  cron.schedule("0 * * * *", async () => {
    log.info("Running hourly cleanup task...");
    try {
      // Logic for hourly cleanup can go here
    } catch (error) {
       log.error("Error in hourly cleanup task", { error });
    }
  });

  // Example: Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    log.info("Running daily maintenance task...");
    try {
      await checkStorageHealth(db);
    } catch (error) {
      log.error("Error in daily maintenance task", { error });
    }
  });

  // Reset email usage counters — runs daily at 00:05
  cron.schedule("5 0 * * *", async () => {
    log.info("Running email usage reset...");
    try {
      await resetEmailUsage(db);
    } catch (error) {
      log.error("Error in email usage reset task", { error });
    }
  });

  // Run log uploader daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    log.info("Running daily log upload task...");
    try {
      await LogUploaderService.uploadLogsToS3();
    } catch (error) {
      log.error("Error in daily log upload task", { error });
    }
  });

  // Heartbeat every 5 minutes (for monitoring)
  cron.schedule("*/5 * * * *", () => {
    log.debug("Cron health beat", { time: new Date().toISOString() });
  });

  log.info("All cron jobs registered and active.");
}

runCronTasks().catch((err) => {
  log.error("Failed to start cron jobs", { error: err.message });
  process.exit(1);
});
