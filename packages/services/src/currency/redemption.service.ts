import { entityCurrencyConfig, user } from "@thrico/database";
import { eq } from "drizzle-orm";
import { log } from "@thrico/logging";
import { EntityCurrencyWalletService } from "./entity-currency-wallet.service";
import { GlobalWalletService } from "./global-wallet.service";
import { CurrencyCapService } from "./currency-cap.service";
import { CurrencyHistoryService } from "./currency-history.service";

export interface RedemptionResult {
  success: boolean;
  ecUsed: number;
  tcUsed: number;
  remaining: number;
  redemptionId?: string;
  error?: string;
}

export class RedemptionService {
  /**
   * Industry-standard redemption logic:
   *
   * 1. Entity Currency (EC) is used FIRST
   * 2. TC Coins = discount only (NOT direct redemption)
   * 3. TC Coins capped at entity's maxTcPercentage of order cost (1-30%)
   * 4. User must have local entity activity (if entity requires it)
   * 5. All caps are enforced
   */
  static async redeemReward({
    userId,
    entityId,
    rewardCostEC,
    rewardId,
    metadata,
    db,
  }: {
    userId: string;
    entityId: string;
    rewardCostEC: number;
    rewardId?: string;
    metadata?: Record<string, any>;
    db: any;
  }): Promise<RedemptionResult> {
    try {
      if (rewardCostEC <= 0) {
        return {
          success: false,
          ecUsed: 0,
          tcUsed: 0,
          remaining: 0,
          error: "Invalid reward cost",
        };
      }

      // 0. Fetch thricoId for logging
      const userRecord = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { thricoId: true },
      });
      const thricoId = userRecord?.thricoId || userId;

      // 1. Get entity config
      const config = await db.query.entityCurrencyConfig.findFirst({
        where: eq(entityCurrencyConfig.entityId, entityId),
      });

      // 2. Get user's EC balance at this entity
      const ecWallet = await EntityCurrencyWalletService.getWallet({
        userId,
        entityId,
        db,
      });

      const ecBalance = Number(ecWallet?.balance || 0);

      // 3. Check minimum entity activity requirement
      if (config?.minEntityActivityRequired && ecBalance <= 0) {
        return {
          success: false,
          ecUsed: 0,
          tcUsed: 0,
          remaining: rewardCostEC,
          error:
            "Minimum entity activity required. You must earn EC at this entity first.",
        };
      }

      // 4. Calculate how much EC to use (use all available, up to cost)
      const ecToUse = Math.max(0, Math.min(ecBalance, rewardCostEC));
      let remainingAfterEC = rewardCostEC - ecToUse;
      let tcToUse = 0;

      // 5. Check if entity allows TC coins for the remaining amount
      if (remainingAfterEC > 0 && config?.tcCoinsAllowed) {
        // Platform policy: Users can only discount 10-30% with TC
        const minTcPct = Number(config.minTcPercentage ?? 10);
        const maxTcPct = Number(config.maxTcPercentage ?? 30);

        // Clamp to 10-30% as per "System Design Flow"
        const safeMinPct = Math.max(10, minTcPct);
        const safeMaxPct = Math.min(30, maxTcPct);

        // The max TC value that can be used as a discount
        const maxTcEquivalent = rewardCostEC * (safeMaxPct / 100);

        // Get user's TC balance
        const tcWallet = await GlobalWalletService.getWallet({
          thricoId,
          db,
        });
        const tcBalance = Number(tcWallet?.balance || 0);

        // TC to use = min(remaining, maxTcEquivalent, tcBalance)
        const potentialTcUse = Math.max(
          0,
          Math.min(remainingAfterEC, maxTcEquivalent, tcBalance),
        );

        // Check redemption caps
        if (potentialTcUse > 0) {
          const capCheck = await CurrencyCapService.checkRedemptionCap({
            userId,
            entityId,
            tcAmount: potentialTcUse,
            db,
          });

          if (capCheck.allowed) {
            tcToUse = Math.min(potentialTcUse, capCheck.maxAllowed);
          }
        }

        remainingAfterEC -= tcToUse;
      }

      // 6. If still remaining, user cannot complete the redemption
      if (remainingAfterEC > 0) {
        return {
          success: false,
          ecUsed: 0,
          tcUsed: 0,
          remaining: remainingAfterEC,
          error: `Insufficient balance. Need ${remainingAfterEC} more EC at this entity.`,
        };
      }

      // 7. Execute the redemption — debit wallets in a transaction
      const finalResult = await db.transaction(async (tx: any) => {
        if (ecToUse > 0) {
          const { balanceBefore, balanceAfter } =
            await EntityCurrencyWalletService.debitEC({
              userId,
              entityId,
              amount: ecToUse,
              db: tx,
            });

          await CurrencyHistoryService.logTransaction({
            userId,
            type: "EC_DEBIT",
            entityId,
            amount: ecToUse,
            balanceBefore,
            balanceAfter,
            metadata: { rewardId, reason: "redemption" },
          });
        }

        if (tcToUse > 0) {
          const { balanceBefore, balanceAfter } =
            await GlobalWalletService.debitTC({
              thricoId,
              amount: tcToUse,
              db: tx,
            });

          await CurrencyHistoryService.logGlobalTransaction({
            thricoId,
            type: "TC_DEBIT",
            entityId,
            amount: tcToUse,
            balanceBefore,
            balanceAfter,
            metadata: { rewardId, reason: "redemption" },
          });

          // Record redemption against caps
          await CurrencyCapService.recordRedemption({
            userId,
            entityId,
            tcAmount: tcToUse,
          });
        }

        // 8. Log redemption to DynamoDB (or Postgres if this is what this service does)
        const redemptionId = await CurrencyHistoryService.logRedemption({
          userId,
          entityId,
          rewardId,
          ecUsed: ecToUse,
          tcUsed: tcToUse,
          totalCost: rewardCostEC,
          status: "COMPLETED",
          metadata: metadata || {},
        });

        return {
          success: true,
          ecUsed: ecToUse,
          tcUsed: tcToUse,
          remaining: 0,
          redemptionId: redemptionId || undefined,
        };
      });

      log.info("Reward redeemed successfully", {
        userId,
        entityId,
        ecUsed: ecToUse,
        tcUsed: tcToUse,
        rewardCostEC,
        redemptionId: finalResult.redemptionId,
      });

      return finalResult;
    } catch (err: any) {
      log.error("Redemption failed", {
        err: err.message,
        userId,
        entityId,
        rewardCostEC,
      });
      return {
        success: false,
        ecUsed: 0,
        tcUsed: 0,
        remaining: rewardCostEC,
        error: err.message,
      };
    }
  }

  /**
   * Preview a redemption without executing it
   * Returns what the user would pay
   */
  static async previewRedemption({
    userId,
    entityId,
    rewardCostEC,
    db,
  }: {
    userId: string;
    entityId: string;
    rewardCostEC: number;
    db: any;
  }): Promise<{
    canRedeem: boolean;
    ecAvailable: number;
    tcAvailable: number;
    ecToUse: number;
    tcToUse: number;
    remaining: number;
    maxTcPercentage: number;
  }> {
    const config = await db.query.entityCurrencyConfig.findFirst({
      where: eq(entityCurrencyConfig.entityId, entityId),
    });

    // Fetch thricoId for TC wallet
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { thricoId: true },
    });
    const thricoId = userRecord?.thricoId || userId;

    const ecWallet = await EntityCurrencyWalletService.getWallet({
      userId,
      entityId,
      db,
    });
    const tcWallet = await GlobalWalletService.getWallet({
      thricoId: thricoId,
      db,
    });

    const ecBalance = Number(ecWallet?.balance || 0);
    const tcBalance = Number(tcWallet?.balance || 0);
    // Platform policy: 10-30% discount range
    const maxTcPct = Number(config?.maxTcPercentage ?? 30);
    const safeMaxPct = Math.max(10, Math.min(30, maxTcPct));

    const ecToUse = Math.min(ecBalance, rewardCostEC);
    let remaining = rewardCostEC - ecToUse;
    let tcToUse = 0;

    if (remaining > 0 && config?.tcCoinsAllowed && safeMaxPct > 0) {
      const maxTcEquivalent = rewardCostEC * (safeMaxPct / 100);
      tcToUse = Math.min(remaining, maxTcEquivalent, tcBalance);
      remaining -= tcToUse;
    }

    return {
      canRedeem: remaining <= 0,
      ecAvailable: ecBalance,
      tcAvailable: tcBalance,
      ecToUse,
      tcToUse,
      remaining: Math.max(0, remaining),
      maxTcPercentage: safeMaxPct,
    };
  }
}
