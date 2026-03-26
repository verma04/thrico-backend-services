import { MomentConsumer } from "./queue/consumer";
import { logger } from "./utils/logger";

async function main() {
  try {
    logger.info("Starting Thrico Media Worker...");
    await MomentConsumer.start();

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down...");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down...");
      process.exit(0);
    });
  } catch (error: any) {
    logger.error("Failed to start Media Worker", { error: error.message });
    process.exit(1);
  }
}

main();
