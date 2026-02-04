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
    cooldownSeconds,
    referenceId,
  }: {
    triggerId: string;
    moduleId: string;
    userId: string;
    entityId: string;
    cooldownSeconds?: number;
    referenceId?: string;
  }) {
    try {
      if (cooldownSeconds) {
        const cooldownKey = `gm:cooldown:${triggerId}:${userId}:${moduleId}${referenceId ? `:${referenceId}` : ""}`;
        // Set with NX (Not eXists) and EX (EXpire)
        const result = await redis.client.set(
          cooldownKey,
          "1",
          "EX",
          cooldownSeconds,
          "NX",
        );

        if (!result) {
          log.debug(
            `Gamification event skipped due to cooldown: ${triggerId}`,
            {
              userId,
              triggerId,
              moduleId,
              referenceId,
              cooldownSeconds,
            },
          );
          return;
        }
      }

      await redis.client.xadd(
        "gm:events",
        "*",
        "event",
        JSON.stringify({
          triggerId,
          moduleId,
          userId,
          entityId,
          referenceId,
        }),
      );
      log.info(`Gamification event triggered: ${triggerId}`, {
        userId,
        entityId,
        triggerId,
        moduleId,
        referenceId,
      });
    } catch (err) {
      log.error(`Failed to trigger gamification event: ${triggerId}`, {
        err,
        userId,
        entityId,
        triggerId,
        moduleId,
        referenceId,
      });
    }
  }
}
