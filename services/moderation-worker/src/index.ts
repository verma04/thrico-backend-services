import { startWorker } from "./worker";
import { log } from "@thrico/logging";

log.info("Starting Moderation Worker...");

startWorker().catch((err) => {
  log.error("Fatal error starting worker", { error: err.message });
  process.exit(1);
});
