import { sql, lte } from "drizzle-orm";
import { emailUsage } from "@thrico/database";
import { log } from "@thrico/logging";

/**
 * Monthly Email Usage Reset
 * 
 * Resets email usage counters for all entities whose billing period has ended.
 * Creates new usage records for the upcoming period.
 * Should be run daily to catch any period expirations.
 */
export async function resetEmailUsage(db: any) {
  try {
    const now = new Date();

    // Find all usage records where the period has ended
    const expiredRecords = await db.query.emailUsage.findMany({
      where: lte(emailUsage.periodEnd, now),
    });

    if (expiredRecords.length === 0) {
      log.info("[Email Usage Reset] No expired periods found.");
      return;
    }

    log.info(
      `[Email Usage Reset] Found ${expiredRecords.length} expired usage periods.`,
    );

    for (const record of expiredRecords) {
      // Create a new period
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await db.insert(emailUsage).values({
        entity: record.entity,
        emailsSent: 0,
        numberOfEmailsPerMonth: record.numberOfEmailsPerMonth, // Carry over the limit
        periodStart,
        periodEnd,
      });

      // Delete OLD record (optional: you could archive instead)
      await db.delete(emailUsage).where(sql`${emailUsage.id} = ${record.id}`);

      log.info(
        `[Email Usage Reset] Reset usage for entity ${record.entity}. Previous sent: ${record.emailsSent}`,
      );
    }

    log.info("[Email Usage Reset] Complete.");
  } catch (error) {
    log.error("[Email Usage Reset] Error:", { error });
    throw error;
  }
}
