import { AppDatabase, userRiskProfiles } from "@thrico/database";
import { eq, sql } from "drizzle-orm";
import { log } from "@thrico/logging";

export class UserRiskService {
  static async updateUserRisk(
    db: AppDatabase,
    userId: string,
    entityId: string,
    action: "WARNING" | "BLOCK" | "SUSPEND",
  ) {
    try {
      const existingProfile = await db.query.userRiskProfiles.findFirst({
        where: (ur, { and, eq }) =>
          and(eq(ur.userId, userId), eq(ur.entityId, entityId)),
      });

      if (!existingProfile) {
        await db.insert(userRiskProfiles).values({
          userId,
          entityId,
          warningCount: action === "WARNING" ? 1 : 0,
          blockedContentCount: action === "BLOCK" ? 1 : 0,
          riskScore:
            action === "SUSPEND"
              ? "100.0"
              : action === "BLOCK"
                ? "10.0"
                : "5.0",
          status: action === "SUSPEND" ? "SUSPENDED" : "ACTIVE",
          lastViolationAt: new Date(),
        });
      } else {
        const updateData: any = {
          lastViolationAt: new Date(),
          status: action === "SUSPEND" ? "SUSPENDED" : existingProfile.status,
        };

        if (action === "WARNING") {
          updateData.warningCount = sql`${userRiskProfiles.warningCount} + 1`;
          updateData.riskScore = sql`${userRiskProfiles.riskScore} + 5`;
        } else if (action === "BLOCK") {
          updateData.blockedContentCount = sql`${userRiskProfiles.blockedContentCount} + 1`;
          updateData.riskScore = sql`${userRiskProfiles.riskScore} + 10`;
        } else if (action === "SUSPEND") {
          updateData.riskScore = "100.0";
        }

        await db
          .update(userRiskProfiles)
          .set(updateData)
          .where(eq(userRiskProfiles.id, existingProfile.id));
      }

      log.info(`Updated user risk profile: ${action}`, { userId });
    } catch (error: any) {
      log.error("Failed to update user risk profile", { error: error.message });
    }
  }
}
