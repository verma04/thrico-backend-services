import { log } from "@thrico/logging";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import { startConsumer } from "./queue/push.queue";

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const HEALTH_PORT = process.env.HEALTH_PORT || 3005;

// Health check endpoint
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "firebase-push" }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(HEALTH_PORT, () => {
  log.info(`Health check endpoint listening on port ${HEALTH_PORT}`);
});

async function init() {
  log.info("🔥 Firebase Push Worker starting...");

  try {
    startConsumer();
    log.info("Firebase Push Worker initialized successfully");
  } catch (error: any) {
    log.error("Failed to start Firebase Push Worker", { error: error.message });
    process.exit(1);
  }
}

init().catch((err) => {
  log.error("Fatal worker error", { error: err.message });
  process.exit(1);
});
