import { redis } from "@thrico/database";
import { log } from "@thrico/logging";

export class AutomationEventService {
  /**
   * Triggers an automation event by pushing it to Redis stream
   */
  static async triggerEvent({
    eventName,
    userId,
    entityId,
    metadata,
  }: {
    eventName: string;
    userId: string;
    entityId: string;
    metadata?: any;
  }) {
    try {
      await redis.client.xadd(
        "automation:events",
        "*",
        "event",
        JSON.stringify({
          eventName,
          userId,
          entityId,
          metadata,
          timestamp: new Date().toISOString(),
        }),
      );
      log.info(`Automation event triggered: ${eventName}`, {
        userId,
        entityId,
        eventName,
      });
    } catch (err) {
      log.error(`Failed to trigger automation event: ${eventName}`, {
        err,
        userId,
        entityId,
      });
    }
  }
}
