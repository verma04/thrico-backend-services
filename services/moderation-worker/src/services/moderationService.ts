import {
  AppDatabase,
  moderationLogs,
  moderationDecisionEnum,
} from "@thrico/database";
import { log } from "@thrico/logging";
import { AiClassificationResult } from "./aiClassificationService";
import { DecisionAction } from "./decisionEngine";
import { UserRiskService } from "./userRiskService";

export class ModerationService {
  static async logAndAct(
    db: AppDatabase,
    params: {
      userId: string;
      entityId: string;
      contentId: string;
      contentType: string;
      aiResult: AiClassificationResult;
      decision: DecisionAction;
    },
  ) {
    const { userId, entityId, contentId, contentType, aiResult, decision } =
      params;

    try {
      // 1. Log to moderation_logs
      await db.insert(moderationLogs).values({
        userId,
        entityId,
        contentId,
        contentType,
        aiScore: aiResult.score.toString(),
        aiLabel: aiResult.label,
        aiCategories: aiResult.categories,
        decision: decision as any, // Enum cast
        actionTaken: `Marked as ${decision}`,
      });

      // 2. Perform Action (Update Content Status) - This usually requires dynamic table access or separate services
      // For V1, we will just log. In a real system, we'd inject a ContentService or use raw SQL to update the specific table (posts, comments, etc).
      // Since we don't have a unified Content table yet, we'll skip the DB update on content table here
      // OR we can emit an event "CONTENT_MODERATED" for the origin service to handle.
      // For this demo, we assume "Shadow Hide" and "Block" should just trigger User Risk updates.

      log.info(`Moderation Decision: ${decision}`, { userId, contentId });

      // 3. Update User Risk Profile
      if (
        decision === DecisionAction.WARNING ||
        decision === DecisionAction.BLOCK ||
        decision === DecisionAction.SUSPEND
      ) {
        await UserRiskService.updateUserRisk(
          db,
          userId,
          entityId,
          decision as any,
        );
      }
    } catch (error: any) {
      log.error("Error in ModerationService", { error: error.message });
      throw error;
    }
  }
}
