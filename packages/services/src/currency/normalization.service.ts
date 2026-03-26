import {
  entityCurrencyConfig,
  userToEntity,
  gamificationUser,
  groupMember,
  user,
} from "@thrico/database";
import { eq, and } from "drizzle-orm";
import { log } from "@thrico/logging";
import { EntityCurrencyWalletService } from "./entity-currency-wallet.service";
import { CurrencyHistoryService } from "./currency-history.service";

export class NormalizationService {
  /**
   * Convert raw activity points → Entity Currency
   * Uses the entity's normalization factor from entityCurrencyConfig
   *
   * Formula: EC = rawPoints ÷ normalizationFactor
   */
  static async convertPointsToEC({
    entityId,
    rawPoints,
    userId,
    db,
    action,
    pointHistoryIds,
  }: {
    entityId: string;
    rawPoints: number;
    userId: string;
    db: any;
    pointHistoryIds?: string[];
    action?: string;
  }): Promise<number> {
    try {
      if (rawPoints <= 0) {
        return 0;
      }

      // 1. Check User Eligibility (Membership & Status)
      const membership = await db.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity.userId, userId),
          eq(userToEntity.entityId, entityId),
        ),
        with: {
          user: true,
        },
      });

      let thricoId = membership?.user?.thricoId;

      // if (!membership || membership.status !== "APPROVED") {
      //   log.info("User not eligible for EC (not approved member)", {
      //     userId,
      //     entityId,
      //   });
      //   return 0;
      // }

      // 2. Get entity's normalization config
      const config = await db.query.entityCurrencyConfig.findFirst({
        where: eq(entityCurrencyConfig.entityId, entityId),
      });

      console.log(config);

      // 3. Activity Guard check
      if (config?.minEntityActivityRequired) {
        const gUser = await db.query.gamificationUser.findFirst({
          where: and(
            eq(gamificationUser.user, userId),
            eq(gamificationUser.entityId, entityId),
          ),
          with: {
            user: true,
          },
        });

        // Threshold: e.g. 50 points total activity required
        if (!gUser || gUser.totalsPoints < 50) {
          log.info("User hasn't reached minimum activity threshold for EC", {
            userId,
            entityId,
            totalPoints: gUser?.totalPoints ?? 0,
          });
          return 0;
        }
      }

      // Default: 10:1 conversion if no config exists
      const normFactor = config?.normalizationFactor ?? 10;
      const ecAmount = rawPoints / normFactor;

      if (ecAmount <= 0) {
        return 0;
      }

      // Credit to entity wallet
      const { balanceBefore, balanceAfter } =
        await EntityCurrencyWalletService.creditEC({
          userId,
          entityId,
          amount: ecAmount,
          db,
        });

      // Log to DynamoDB using Thrico ID if available, otherwise fallback to internal ID
      await CurrencyHistoryService.logTransaction({
        userId: userId,
        type: "POINTS_TO_EC",
        entityId,
        amount: ecAmount,
        balanceBefore,
        balanceAfter,
        metadata: {
          rawPoints,
          normalizationFactor: normFactor,
          action,
          pointHistoryIds,
        },
      });

      log.info("Points converted to EC", {
        userId,
        entityId,
        rawPoints,
        normFactor,
        ecAmount,
      });

      return ecAmount;
    } catch (err: any) {
      log.error("Failed to convert points to EC", {
        err: err.message,
        userId,
        entityId,
        rawPoints,
      });
      return 0;
    }
  }
}
