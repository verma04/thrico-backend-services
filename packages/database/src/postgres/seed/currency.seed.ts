import { getDb } from "../connection";
import {
  entityCurrencyConfig,
  activityCaps,
  tcConversionCaps,
  redemptionCaps,
} from "../schema/user/currency";
import { entity } from "../schema/tenant/entity/details";
import { eq } from "drizzle-orm";
import { log } from "@thrico/logging";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file at the monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../../../../.env") });

async function seedCurrency() {
  const db = getDb();
  log.info("Starting currency seeding...");

  try {
    // 1. Fetch all existing entities
    const entities = await db
      .select({ id: entity.id, name: entity.name })
      .from(entity);

    if (entities.length === 0) {
      log.warn("No entities found to seed currency for.");
      return;
    }

    log.info(
      `Found ${entities.length} entities. Seeding currency configurations...`,
    );

    for (const ent of entities) {
      log.info(`Seeding for entity: ${ent.name} (${ent.id})`);

      // 2. Seed Entity Currency Config
      const existingConfig = await db.query.entityCurrencyConfig.findFirst({
        where: eq(entityCurrencyConfig.entityId, ent.id),
      });

      if (!existingConfig) {
        await db.insert(entityCurrencyConfig).values({
          entityId: ent.id,
          currencyName: "Coins",
          normalizationFactor: 10, // 10 points = 1 EC
          tcConversionRate: "1.0000", // 1 EC = 1 TC
          tcCoinsAllowed: true,
          minTcPercentage: 10,
          maxTcPercentage: 30, // 30% max discount
          minEntityActivityRequired: true,
        });
        log.info(`  - Created entityCurrencyConfig`);
      }

      // 3. Seed Activity Caps
      const activityTypes = [
        "LIKE_FEED",
        "COMMENT_FEED",
        "POST_FEED",
        "ATTEND_EVENT",
      ];
      for (const type of activityTypes) {
        const existingCap = await db.query.activityCaps.findFirst({
          where: eq(activityCaps.entityId, ent.id),
        });
        // Note: Simple check, ideally check by activityType too
        if (!existingCap) {
          await db.insert(activityCaps).values({
            entityId: ent.id,
            activityType: type,
            dailyCap: 50,
            weeklyCap: 300,
            monthlyCap: 1000,
          });
        }
      }
      log.info(`  - Seeded Activity Caps`);

      // 4. Seed TC Conversion Caps
      const existingTcCap = await db.query.tcConversionCaps.findFirst({
        where: eq(tcConversionCaps.entityId, ent.id),
      });

      if (!existingTcCap) {
        await db.insert(tcConversionCaps).values({
          entityId: ent.id,
          maxTcPerDay: "100.0000",
          maxTcPerMonth: "2000.0000",
          maxTcPerEntity: "10000.0000",
        });
        log.info(`  - Created tcConversionCaps`);
      }

      // 5. Seed Redemption Caps
      const existingRedemptionCap = await db.query.redemptionCaps.findFirst({
        where: eq(redemptionCaps.entityId, ent.id),
      });

      if (!existingRedemptionCap) {
        await db.insert(redemptionCaps).values({
          entityId: ent.id,
          maxTcPerOrder: "50.0000",
          maxTcPerMonth: "500.0000",
        });
        log.info(`  - Created redemptionCaps`);
      }
    }

    log.info("Currency seeding completed successfully.");
  } catch (error: any) {
    log.error("Currency seeding failed", { error: error.message });
    throw error;
  }
}

export { seedCurrency };

// If run directly
if (require.main === module) {
  seedCurrency()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
