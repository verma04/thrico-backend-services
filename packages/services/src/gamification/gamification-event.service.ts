import { redis } from "@thrico/database";
import { log } from "@thrico/logging";

export class GamificationEventService {
  /**
   * Triggers a gamification event by pushing it to Redis stream
   */
  static async triggerEvent({
    triggerId,
    moduleId,
    userId,
    entityId,
  }: {
    triggerId: string;
    moduleId: string;
    userId: string;
    entityId: string;
  }) {
    try {
      await redis.client.xadd(
        "gm:events",
        "*",
        "event",
        JSON.stringify({
          triggerId,
          moduleId,
          userId,
          entityId,
        })
      );
      log.info(`Gamification event triggered: ${triggerId}`, {
        userId,
        entityId,
        triggerId,
        moduleId,
      });
    } catch (err) {
      log.error(`Failed to trigger gamification event: ${triggerId}`, {
        err,
        userId,
        entityId,
        triggerId,
        moduleId,
      });
    }
  }
}
