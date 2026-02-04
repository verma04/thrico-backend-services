import { log } from "@thrico/logging";

import { startConsumer } from "./queue/moderation.queue";

export const startWorker = async () => {
  log.info("Moderation Worker Started");

  startConsumer();
};
