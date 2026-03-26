import { log } from "@thrico/logging";
import { NormalizationService, TCConversionService } from "@thrico/services";

export type CurrencyEvent = {
  type: "POINT_AWARDED" | "MANUAL_CONVERSION";
  userId: string;
  entityId: string;
  amount: number; // Point amount for POINT_AWARDED, EC amount for MANUAL_CONVERSION
  timestamp: number;
  action?: string;
  pointHistoryIds?: string[];
};

export async function processCurrencyEvent(event: CurrencyEvent, db: any) {
  const { type, userId, entityId, amount, action, pointHistoryIds } = event;

  try {
    switch (type) {
      case "POINT_AWARDED":
        log.info("Processing POINT_AWARDED event", {
          userId,
          entityId,
          points: amount,
          action,
        });

        // 1. Convert Points to EC
        const ecAmount = await NormalizationService.convertPointsToEC({
          entityId,
          rawPoints: amount,
          userId,
          db,
          action,
          pointHistoryIds,
        });

        if (ecAmount > 0) {
          // 2. Convert EC to TC
          await TCConversionService.convertECtoTC({
            userId,
            entityId,
            ecAmount,
            db,
            action,
          });
        }
        break;

      case "MANUAL_CONVERSION":
        log.info("Processing MANUAL_CONVERSION event", {
          userId,
          entityId,
          ecAmount: amount,
        });
        await TCConversionService.convertECtoTC({
          userId,
          entityId,
          ecAmount: amount,
          db,
        });
        break;

      default:
        log.warn("Unknown currency event type", { type });
    }
  } catch (error: any) {
    log.error("Failed to process currency event", {
      type,
      userId,
      entityId,
      error: error.message,
    });
    throw error;
  }
}
