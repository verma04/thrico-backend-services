import { log } from "@thrico/logging";
import { NormalizationService } from "./normalization.service";
import { TCConversionService } from "./tc-conversion.service";
import { RedemptionService, RedemptionResult } from "./redemption.service";
import { EntityCurrencyWalletService } from "./entity-currency-wallet.service";
import { GlobalWalletService } from "./global-wallet.service";
import { CurrencyHistoryService } from "./currency-history.service";
import { CurrencyCapService } from "./currency-cap.service";

export class CurrencyManager {
  /**
   * Process point award and handle automated conversion pipeline
   */
  static async processPointAward({
    userId,
    entityId,
    rawPoints,
    db,
  }: {
    userId: string;
    entityId: string;
    rawPoints: number;
    db: any;
  }) {
    try {
      // 1. Points to EC
      const ecAmount = await NormalizationService.convertPointsToEC({
        entityId,
        rawPoints,
        userId,
        db,
      });

      if (ecAmount <= 0) return { ecAmount: 0, tcAmount: 0 };

      // 2. EC to TC (if enabled/allowed)
      const { tcAmount, converted } = await TCConversionService.convertECtoTC({
        userId,
        entityId,
        ecAmount,
        db,
      });

      return { ecAmount, tcAmount: converted ? tcAmount : 0 };
    } catch (error: any) {
      log.error("Error in CurrencyManager.processPointAward", {
        userId,
        entityId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle reward redemption
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
    return RedemptionService.redeemReward({
      userId,
      entityId,
      rewardCostEC,
      rewardId,
      metadata,
      db,
    });
  }

  /**
   * Get comprehensive wallet summary for a user
   */
  static async getUserWalletSummary({
    userId,
    db,
  }: {
    userId: string;
    db: any;
  }) {
    const [tcWallet, entityWallets] = await Promise.all([
      GlobalWalletService.getWallet({ thricoId: userId, db }),
      EntityCurrencyWalletService.getAllWallets({ userId, db }),
    ]);

    return {
      tcWallet,
      entityWallets,
    };
  }

  /**
   * Get specific entity wallet
   */
  static async getEntityWallet({
    userId,
    entityId,
    db,
  }: {
    userId: string;
    entityId: string;
    db: any;
  }) {
    return EntityCurrencyWalletService.getWallet({ userId, entityId, db });
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(params: {
    userId: string;
    entityId?: string;
    limit?: number;
    lastKey?: Record<string, any>;
  }) {
    return CurrencyHistoryService.getTransactionHistory(params);
  }

  /**
   * Get redemption history
   */
  static async getRedemptionHistory(params: {
    userId: string;
    entityId?: string;
    limit?: number;
    lastKey?: Record<string, any>;
  }) {
    return CurrencyHistoryService.getRedemptionHistory(params);
  }
}
