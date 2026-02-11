import { log } from "@thrico/logging";
import { NotificationAggregatorService } from "@thrico/services";
import { getDb } from "@thrico/database";
import { DatabaseRegion } from "@thrico/shared";

/**
 * Periodically flushes notification aggregation buckets from Redis to the database.
 * This worker ensures that high-volume events like likes and comments are
 * summarized before creating notifications.
 */
export async function startAggregationWorker() {
  log.info("🚀 Notification Aggregation Worker initialized");

  const regions: DatabaseRegion[] = [
    DatabaseRegion.IND,
    DatabaseRegion.US,
    DatabaseRegion.UAE,
  ];

  // Run the flush process every 60 seconds.
  setInterval(async () => {
    try {
      log.info("⏰ Aggregation worker interval triggered");
      for (const region of regions) {
        log.debug(`Checking aggregation buckets for region: ${region}`);
        const db = getDb(region);
        await NotificationAggregatorService.flushBuckets(db);
      }
    } catch (error) {
      log.error("Fatal error in aggregation background job", { error });
    }
  }, 60 * 1000);
}
