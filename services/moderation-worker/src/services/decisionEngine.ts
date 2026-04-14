import { moderationDecisionEnum } from "@thrico/database";

export enum DecisionAction {
  ALLOW = "ALLOW",
  SHADOW_HIDE = "SHADOW_HIDE",
  WARNING = "WARNING",
  BLOCK = "BLOCK",
  SUSPEND = "SUSPEND", // For user
}

export class DecisionEngine {
  /**
   * Applies business rules to AI result.
   * - harassment -> SUSPEND
   * - offensive -> BLOCK
   * - spam -> BLOCK (if high confidence) or SHADOW_HIDE
   * - else -> based on score
   */
  static decide(score: number, label: "safe" | "spam" | "offensive" | "harassment" | "unclassifiable", settings?: any): DecisionAction {
    if (label === "harassment") return DecisionAction.SUSPEND;
    if (label === "offensive") return DecisionAction.BLOCK;
    
    if (label === "spam") {
      if (settings && !settings.spamDetectionEnabled) {
        return DecisionAction.ALLOW;
      }
      const threshold = settings?.spamThreshold ? settings.spamThreshold / 100 : 0.8;
      if (score > threshold) return DecisionAction.BLOCK;
      return DecisionAction.SHADOW_HIDE;
    }

    // Default score-based logic
    if (score < 0.3) return DecisionAction.ALLOW;
    if (score < 0.6) return DecisionAction.SHADOW_HIDE;
    if (score < 0.85) return DecisionAction.WARNING;
    return DecisionAction.BLOCK;
  }
}
