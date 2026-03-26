import {
  AppDatabase,
  moderationLogs,
  moderationDecisionEnum,
  aiModerationLogs,
  aiTokenUsage,
  userFeed,
  feedComment,
  marketPlace,
  groups,
  events,
  shopProducts,
  offers,
  jobs,
  discussionForum,
  discussionForumComment
} from "@thrico/database";
import { eq } from "drizzle-orm";
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

      // 2. Log to ai_moderation_logs
      await db.insert(aiModerationLogs).values({
        contentId,
        entityId,
        classification: aiResult.label,
        confidence: aiResult.score.toString(),
        model: "llava", // using llava/llama3 or whatever is standard in ai-gateway
      });

      // 3. Log token usage randomly/mocked for now since Gateway doesn't return it
      await db.insert(aiTokenUsage).values({
        entityId,
        module: "moderation",
        tokens: 150, // rough estimate
        model: "llava",
      });

      // 4. Perform Action (Update Content Status)
      // Map AI Result to Moderation Status
      let modStatus: "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED" | "FLAGGED" | "FAILED" = "APPROVED";
      if (decision === DecisionAction.BLOCK || decision === DecisionAction.SUSPEND) {
        modStatus = "REJECTED";
      } else if (decision === DecisionAction.WARNING || decision === DecisionAction.SHADOW_HIDE) {
        modStatus = "FLAGGED";
      }

      const modResult = JSON.stringify({ label: aiResult.label, score: aiResult.score });

      if (contentType === "POST") {
        await db.update(userFeed)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(userFeed.id, contentId));
      } else if (contentType === "COMMENT") {
        await db.update(feedComment)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(feedComment.id, contentId));
      } else if (contentType === "MARKETPLACE") {
        await db.update(marketPlace)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(marketPlace.id, contentId));
      } else if (contentType === "COMMUNITY") {
        await db.update(groups)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(groups.id, contentId));
      } else if (contentType === "EVENT") {
        await db.update(events)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(events.id, contentId));
      } else if (contentType === "SHOP") {
        await db.update(shopProducts)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(shopProducts.id, contentId));
      } else if (contentType === "OFFER") {
        await db.update(offers)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(offers.id, contentId));
      } else if (contentType === "JOB") {
        await db.update(jobs)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(jobs.id, contentId));
      } else if (contentType === "DISCUSSION_FORUM") {
        await db.update(discussionForum)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(discussionForum.id, contentId));
      } else if (contentType === "DISCUSSION_FORUM_COMMENT") {
        await db.update(discussionForumComment)
          .set({ moderationStatus: modStatus, moderationResult: modResult, moderatedAt: new Date() })
          .where(eq(discussionForumComment.id, contentId));
      }

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

  static async markAsFailed(db: AppDatabase, contentId: string, contentType: string) {
    try {
      if (contentType === "POST") {
        await db.update(userFeed)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(userFeed.id, contentId));
      } else if (contentType === "COMMENT") {
        await db.update(feedComment)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(feedComment.id, contentId));
      } else if (contentType === "MARKETPLACE") {
        await db.update(marketPlace)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(marketPlace.id, contentId));
      } else if (contentType === "COMMUNITY") {
        await db.update(groups)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(groups.id, contentId));
      } else if (contentType === "EVENT") {
        await db.update(events)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(events.id, contentId));
      } else if (contentType === "SHOP") {
        await db.update(shopProducts)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(shopProducts.id, contentId));
      } else if (contentType === "OFFER") {
        await db.update(offers)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(offers.id, contentId));
      } else if (contentType === "JOB") {
        await db.update(jobs)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(jobs.id, contentId));
      } else if (contentType === "DISCUSSION_FORUM") {
        await db.update(discussionForum)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(discussionForum.id, contentId));
      } else if (contentType === "DISCUSSION_FORUM_COMMENT") {
        await db.update(discussionForumComment)
          .set({ moderationStatus: "FAILED", moderatedAt: new Date() })
          .where(eq(discussionForumComment.id, contentId));
      }
    } catch (error: any) {
      log.error("Error marking content as FAILED", { contentId, error: error.message });
    }
  }
}

