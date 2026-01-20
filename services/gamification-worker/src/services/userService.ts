import { AppDatabase, gamificationUser } from "@thrico/database";
import { and, eq } from "drizzle-orm";
import { log } from "@thrico/logging";

export class UserService {
  static async getOrCreateGamificationUser(
    tx: any,
    userId: string,
    entityId: string
  ) {
    try {
      let gUser = await tx.query.gamificationUser.findFirst({
        where: and(
          eq(gamificationUser.user, userId),
          eq(gamificationUser.entityId, entityId)
        ),
      });

      if (gUser) {
        log.info("Found existing gamification user", {
          gUserId: gUser.id,
          userId: gUser.user,
          entityId: gUser.entityId,
        });

        // Validate the user object has required fields
        if (!gUser.id) {
          throw new Error("Gamification user missing ID");
        }

        return gUser;
      }

      // Create new gamification user
      log.info("Creating new gamification user", {
        userId,
        entityId,
      });

      const [newUser] = await tx
        .insert(gamificationUser)
        .values({
          user: userId,
          entityId: entityId,
          totalPoints: 0,
        })
        .returning();

      if (!newUser || !newUser.id) {
        throw new Error("Failed to create gamification user - no ID returned");
      }

      log.info("Created new gamification user", {
        gUserId: newUser.id,
        userId: newUser.user,
        entityId: newUser.entityId,
      });

      return newUser;
    } catch (error: any) {
      log.error("Error in getOrCreateGamificationUser", {
        userId,
        entityId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
