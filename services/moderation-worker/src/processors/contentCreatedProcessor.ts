import { AppDatabase, user } from "@thrico/database";
import { eq } from "drizzle-orm";
import { log } from "@thrico/logging";
import { AiClassificationService } from "../services/aiClassificationService";
import { DecisionEngine } from "../services/decisionEngine";
import { ModerationService } from "../services/moderationService";

export interface ContentCreatedPayload {
  userId: string;
  entityId: string;
  contentId: string;
  contentType: string; // POST, COMMENT
  text: string;
  timestamp: string;
}

export const processContentCreated = async (
  db: AppDatabase,
  payload: ContentCreatedPayload,
) => {
  try {
    log.info("Processing content for moderation", {
      contentId: payload.contentId,
      userId: payload.userId,
    });

    // 0. Verify the user exists in the database first
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, payload.userId),
    });

    if (!dbUser) {
      log.error("Cannot process moderation - user not found in database", {
        userId: payload.userId,
        entityId: payload.entityId,
        contentId: payload.contentId,
      });
      return;
    }

    // 1. AI Analysis
    const aiResult = await AiClassificationService.analyzeContent(payload.text);

    // 2. Decision Engine
    const decision = DecisionEngine.decide(aiResult.score);

    // 3. Log and Act
    await ModerationService.logAndAct(db, {
      userId: payload.userId,
      entityId: payload.entityId,
      contentId: payload.contentId,
      contentType: payload.contentType,
      aiResult,
      decision,
    });
  } catch (error: any) {
    log.error("Failed to process content created event", {
      error: error.message,
      contentId: payload.contentId,
    });
    // Maybe retry? For now, just log.
  }
};
