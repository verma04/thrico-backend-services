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
   * Applies business rules to AI score.
   * < 0.3	Allow
   * 0.3 – 0.6	Shadow hide
   * 0.6 – 0.85	Warning
   * > 0.85	Block
   */
  static decide(score: number): DecisionAction {
    if (score < 0.3) return DecisionAction.ALLOW;
    if (score < 0.6) return DecisionAction.SHADOW_HIDE;
    if (score < 0.85) return DecisionAction.WARNING;
    return DecisionAction.BLOCK;
  }
}
