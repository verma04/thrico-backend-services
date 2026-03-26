import { NotificationService } from "../notification/notification.service";
import { log } from "@thrico/logging";

export class RewardNotificationService {
  /**
   * Send notification when a user successfully redeems a reward
   */
  static async publishRewardRedeemed({
    userId,
    entityId,
    rewardId,
    rewardTitle,
    voucherCode,
    db,
  }: {
    userId: string;
    entityId: string;
    rewardId: string;
    rewardTitle: string;
    voucherCode?: string;
    db: any;
  }) {
    try {
      // Build notification content
      let content = `You have successfully redeemed "${rewardTitle}".`;
      let pushBody = `Your reward "${rewardTitle}" has been redeemed!`;

      if (voucherCode) {
        content = `You have successfully redeemed "${rewardTitle}". Your voucher code: ${voucherCode}`;
        pushBody = `Your voucher code: ${voucherCode}`;
      }

      // Send notification to the user
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        module: "GAMIFICATION",
        type: "REWARD_REDEEMED",
        content,
        shouldSendPush: true,
        pushTitle: "Reward Redeemed! 🎉",
        pushBody,
      }).catch((err) => {
        log.error("Failed to send reward redemption notification", {
          userId,
          rewardId,
          error: err.message,
        });
      });

      log.info("Reward redemption notification sent", {
        userId,
        rewardId,
        rewardTitle,
      });
    } catch (error: any) {
      log.error("Error in publishRewardRedeemed", {
        error: error.message,
        userId,
        rewardId,
      });
    }
  }
}
