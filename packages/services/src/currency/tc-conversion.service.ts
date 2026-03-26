import { entityCurrencyConfig, user } from "@thrico/database";
import { eq } from "drizzle-orm";
import { log } from "@thrico/logging";
import { EntityCurrencyWalletService } from "./entity-currency-wallet.service";
import { GlobalWalletService } from "./global-wallet.service";
import { CurrencyHistoryService } from "./currency-history.service";
import { CurrencyCapService } from "./currency-cap.service";

export class TCConversionService {
  /**
   * Convert Entity Currency → TC Coins
   * Platform-controlled conversion with cap enforcement
   *
   * Flow:
   * 1. Check entity allows TC conversion
   * 2. Check conversion caps
   * 3. Apply entity-specific conversion rate
   * 4. Record EC conversion on entity wallet
   * 5. Credit TC wallet
   * 6. Log to DynamoDB
   * 7. Update cap counters
   */
  static async convertECtoTC({
    userId,
    entityId,
    ecAmount,
    db,
    action,
  }: {
    userId: string;
    entityId: string;
    ecAmount: number;
    db: any;
    action?: string;
  }): Promise<{ tcAmount: number; converted: boolean }> {
    try {
      if (ecAmount <= 0) {
        return { tcAmount: 0, converted: false };
      }

      // 0. Fetch thricoId for Global Wallet and History
      const userRecord = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { thricoId: true },
      });
      const thricoId = userRecord?.thricoId || userId;

      // 1. Get entity's currency config
      const config = await db.query.entityCurrencyConfig.findFirst({
        where: eq(entityCurrencyConfig.entityId, entityId),
      });

      // If no config or TC not allowed, skip conversion
      if (!config || !config.tcCoinsAllowed) {
        log.debug("TC conversion not enabled for entity", { entityId });
        return { tcAmount: 0, converted: false };
      }

      // 2. Calculate TC amount using conversion rate
      const conversionRate = Number(config.tcConversionRate) || 1.0;
      let tcAmount = ecAmount * conversionRate;

      // 3. Check conversion caps
      const capCheck = await CurrencyCapService.checkTCConversionCap({
        userId,
        entityId,
        amount: tcAmount,
        db,
      });

      if (!capCheck.allowed) {
        log.info("TC conversion capped", {
          userId,
          entityId,
          reason: capCheck.reason,
        });
        return { tcAmount: 0, converted: false };
      }

      // Cap the amount if needed
      tcAmount = Math.min(tcAmount, capCheck.maxAllowed);

      if (tcAmount <= 0) {
        return { tcAmount: 0, converted: false };
      }

      // 4. Record the EC→TC conversion on entity wallet
      // await EntityCurrencyWalletService.recordTCConversion({
      //   userId,
      //   entityId,
      //   ecAmount,
      //   db,
      // });

      // 5. Credit TC to global wallet
      const { balanceBefore, balanceAfter } =
        await GlobalWalletService.creditTC({
          thricoId: thricoId,
          amount: tcAmount,
          db,
        });

      // 6. Log to GLOBAL Transaction Table (GlobalCurrencyTransaction)
      await CurrencyHistoryService.logGlobalTransaction({
        thricoId,
        type: "EC_TO_TC",
        amount: tcAmount,
        balanceBefore,
        balanceAfter,
        metadata: {
          ecAmount,
          conversionRate,
          entityId,
          action,
        },
      });

      // 7. Update cap counters
      // await CurrencyCapService.recordTCConversion({
      //   userId,
      //   entityId,
      //   amount: tcAmount,
      // });

      log.info("EC converted to TC", {
        userId,
        entityId,
        ecAmount,
        tcAmount,
        conversionRate,
      });

      return { tcAmount, converted: true };
    } catch (err: any) {
      log.error("Failed to convert EC to TC", {
        err: err.message,
        userId,
        entityId,
        ecAmount,
      });
      return { tcAmount: 0, converted: false };
    }
  }
}
