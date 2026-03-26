import { eq, and, sql, desc } from "drizzle-orm";
import { rewards, vouchers, redemptions, user } from "@thrico/database";
import { log } from "@thrico/logging";
import { RedemptionService } from "../currency/redemption.service";
import { RewardNotificationService } from "./reward-notification.service";

export class RewardsService {
  /**
   * List available rewards for a specific entity
   */
  static async listRewards({
    entityId,
    db,
    status = "ACTIVE",
  }: {
    entityId: string;
    db: any;
    status?: string;
  }) {
    try {
      return await db.query.rewards.findMany({
        where: and(eq(rewards.entityId, entityId), eq(rewards.status, status)),
        orderBy: [desc(rewards.createdAt)],
      });
    } catch (error) {
      log.error("Error in listRewards service", { error, entityId });
      throw error;
    }
  }

  /**
   * Get a specific reward by ID
   */
  static async getRewardById({ id, db }: { id: string; db: any }) {
    try {
      return await db.query.rewards.findFirst({
        where: eq(rewards.id, id),
      });
    } catch (error) {
      log.error("Error in getRewardById service", { error, id });
      throw error;
    }
  }

  /**
   * Redeem a reward for a user
   */
  static async redeemReward({
    userId,
    entityId,
    rewardId,
    db,
  }: {
    userId: string;
    entityId: string;
    rewardId: string;
    db: any;
  }) {
    try {
      // 1. Fetch reward details
      const reward = await this.getRewardById({ id: rewardId, db });
      if (!reward || reward.status !== "ACTIVE") {
        throw new Error("Reward not found or inactive");
      }

      // 2. Check limits (Per-user limit)
      const userRedemptions = await db
        .select({ count: sql<number>`count(*)` })
        .from(redemptions)
        .where(
          and(
            eq(redemptions.userId, userId),
            eq(redemptions.rewardId, rewardId),
          ),
        );

      if (userRedemptions[0]?.count >= reward.perUserLimit) {
        throw new Error(
          `You have already reached the redemption limit for this reward.`,
        );
      }

      // 3. Check inventory if required
      let voucherId: string | null = null;
      if (reward.inventoryRequired) {
        const availableVoucher = await db.query.vouchers.findFirst({
          where: and(
            eq(vouchers.rewardId, rewardId),
            eq(vouchers.isUsed, false),
          ),
        });

        if (!availableVoucher) {
          throw new Error("Reward is currently out of stock.");
        }
        voucherId = availableVoucher.id;
      }

      // 4. Use RedemptionService to handle currency debiting (EC first, then TC discount)
      // Note: In our rewards table, tcCost represents the base cost in EC-equivalent terms
      // which follows the platform redemption logic.
      const redemptionResult = await RedemptionService.redeemReward({
        userId,
        entityId,
        rewardCostEC: reward.tcCost,
        rewardId,
        db,
      });

      if (!redemptionResult.success) {
        throw new Error(redemptionResult.error || "Redemption failed");
      }

      // 5. Update inventory and log redemption mapping
      let voucherCode: string | undefined;
      if (voucherId) {
        await db
          .update(vouchers)
          .set({
            isUsed: true,
            assignedTo: userId,
            assignedAt: new Date(),
          })
          .where(eq(vouchers.id, voucherId));

        const v = await db.query.vouchers.findFirst({
          where: eq(vouchers.id, voucherId),
        });
        voucherCode = v?.code;
      }

      // 6. Record in rewards log (this is already partially done by RedemptionService
      // but we use our dedicated redemptions_log table as well for rewards)
      await db.insert(redemptions).values({
        userId,
        rewardId,
        entityId,
        ecUsed: redemptionResult.ecUsed,
        tcUsed: redemptionResult.tcUsed,
        totalCost: reward.tcCost,
        status: "COMPLETED",
        metadata: JSON.stringify({
          voucherCode,
          redemptionId: redemptionResult.redemptionId,
        }),
      });

      // Send push notification to user
      await RewardNotificationService.publishRewardRedeemed({
        userId,
        entityId,
        rewardId,
        rewardTitle: reward.title,
        voucherCode,
        db,
      });

      return {
        success: true,
        voucherCode,
        redemptionId: redemptionResult.redemptionId,
      };
    } catch (error: any) {
      log.error("Error in redeemReward service", {
        error: error.message,
        userId,
        rewardId,
      });
      throw error;
    }
  }

  /**
   * Get user redemptions history
   */
  static async getUserRedemptions({
    userId,
    entityId,
    db,
  }: {
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      return await db.query.redemptions.findMany({
        where: and(
          eq(redemptions.userId, userId),
          eq(redemptions.entityId, entityId),
        ),
        with: {
          reward: true,
        },
        orderBy: [desc(redemptions.createdAt)],
      });
    } catch (error) {
      log.error("Error in getUserRedemptions service", { error, userId });
      throw error;
    }
  }
}
