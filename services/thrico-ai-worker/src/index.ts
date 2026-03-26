import { AIConsumer } from "./queue/consumer";
import { log } from "@thrico/logging";

async function main() {
  try {
    log.info("Starting Thrico AI Worker...");
    await AIConsumer.start();
    log.info("Thrico AI Worker is running and waiting for messages.");
  } catch (error) {
    log.error("Failed to start AI Worker", { error });
    process.exit(1);
  }
}

main();
