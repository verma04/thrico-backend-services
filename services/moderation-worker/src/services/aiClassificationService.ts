import { log } from "@thrico/logging";
import { AppDatabase, moderationSettings } from "@thrico/database";
import { eq } from "drizzle-orm";

export interface AiClassificationResult {
  score: number; // Derived score (0-1, high is bad) for decision engine
  label: "safe" | "spam" | "offensive" | "harassment";
  confidence: number; // Raw confidence from model
  reason?: string;
  categories: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AiClassificationService {
  /**
   * AI analysis using the local AI Gateway.
   */
  static async analyzeContent(
    db: AppDatabase,
    entityId: string,
    text: string,
  ): Promise<AiClassificationResult> {
    log.info("AI Analyzing content...", { textLength: text.length });

    // Fetch moderation settings
    const settings = await db.query.moderationSettings.findFirst({
      where: eq(moderationSettings.entityId, entityId),
    });

    if (settings && !settings.autoModerationEnabled) {
      log.info(
        "Auto-moderation is disabled for this entity. Skipping AI check.",
      );
      return {
        score: 0,
        label: "safe",
        confidence: 1,
        categories: [],
      };
    }

    const aiGatewayUrl =
      process.env.AI_GATEWAY_URL || "http://15.206.196.90:2712";
    const apiKey = process.env.AI_GATEWAY_KEY || "your_secure_api_key_here";

    const payload: any = { text };

    if (settings?.aiClassificationDefinitions) {
      payload.definitions = settings.aiClassificationDefinitions;
    }

    const response = await fetch(`${aiGatewayUrl}/ai/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      log.error("AI Gateway error", {
        status: response.status,
        url: aiGatewayUrl,
      });
      throw new Error(`AI Gateway responded with status: ${response.status}`);
    }

    const data = (await response.json()) as {
      confidence: number;
      classification: "safe" | "spam" | "offensive" | "harassment";
      reason?: string;
      categories?: string[];
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    // The API returns { confidence: number, classification: string }
    // classification: 'safe', 'spam', 'offensive', 'harassment'
    // Logic: If 'safe', the score should be (1 - confidence). Otherwise, the score is confidence.
    let score = 0.05;
    if (data.classification === "safe") {
      score = 1 - data.confidence;
    } else {
      score = data.confidence;
    }

    return {
      score: score,
      label: data.classification || "safe",
      confidence: data.confidence,
      reason: data.reason,
      categories: data.categories || [data.classification].filter(Boolean),
      usage: data.usage,
    };
  }
}
