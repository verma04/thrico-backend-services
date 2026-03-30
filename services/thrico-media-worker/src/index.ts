import { MomentConsumer } from "./queue/consumer";
import { logger } from "./utils/logger";
import os from "os";
import fs from "fs";
import path from "path";

async function main() {
  try {
    logger.info("Starting Thrico Media Worker...");

    // Clean up any stale temp directories from previous runs
    const tempRoot = os.tmpdir();
    const staleDirs = fs.readdirSync(tempRoot).filter((f: string) => f.startsWith("moment-"));
    for (const dir of staleDirs) {
      try {
        fs.rmSync(path.join(tempRoot, dir), { recursive: true, force: true });
        logger.info(`Cleaned up stale temp directory: ${dir}`);
      } catch (e) {
        logger.warn(`Failed to clean up stale temp directory ${dir}:`, e);
      }
    }

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
