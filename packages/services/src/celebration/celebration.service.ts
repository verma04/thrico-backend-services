import { celebration } from "@thrico/database";
import { GamificationEventService } from "../gamification/gamification-event.service";
import { log } from "@thrico/logging";

export class CelebrationService {
  static async addCelebration({
    db,
    entityId,
    input,
  }: {
    db: any;
    entityId: string;
    input: any;
  }) {
    try {
      const newCelebration = await db
        .insert(celebration)
        .values({
          ...input,
          entityId: entityId,
          userId: input.userId,
        })
        .returning();

      // Gamification trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-cel-add",
        moduleId: "celebrate",
        userId: input.userId,
        entityId,
      });

      return newCelebration[0];
    } catch (error) {
      log.error("addCelebration failed", { error });
      throw new Error(`addCelebration failed: ${error}`);
    }
  }
}
