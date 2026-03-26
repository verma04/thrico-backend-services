import { Redis } from "ioredis";
import { log } from "@thrico/logging";

/**
 * Publishes a currency event (POINT_AWARDED) to the redis stream
 * for the currency-worker to consume.
 */
export async function triggerCurrencyProcessing(
  redis: Redis,
  userId: string,
  entityId: string,
  totalAwardedPoints: number,
  action: string,
  pointHistoryIds: string[],
) {
  try {
    if (totalAwardedPoints <= 0) return;

    await redis.xadd(
      "currency:events",
      "*",
      "event",
      JSON.stringify({
        type: "POINT_AWARDED",
        userId,
        entityId,
        amount: totalAwardedPoints,
        timestamp: Date.now(),
        action,
        pointHistoryIds,
      }),
    );

    log.info("Currency processing triggered", {
      userId,
      entityId,
      points: totalAwardedPoints,
      action,
      pointHistoryIds,
    });
  } catch (currencyError: any) {
    log.error("Failed to trigger currency processing", {
      userId,
      entityId,
      points: totalAwardedPoints,
      error: currencyError.message,
    });
    // We don't throw here to avoid failing the main gamification event
    // Ideally, this should go to a dead-letter queue or retry mechanism
  }
}
