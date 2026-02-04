import { log } from "@thrico/logging";

export interface AiClassificationResult {
  score: number;
  label: string;
  categories: string[];
}

export class AiClassificationService {
  /**
   * Mock AI analysis that returns random scores mostly safe, but occasionally toxic.
   * In production, this would call OpenAI or Perspective API.
   */
  static async analyzeContent(text: string): Promise<AiClassificationResult> {
    log.info("AI Analyzing content...", { textLength: text.length });

    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Mock logic: detect "toxic" keyword
    if (
      text.toLowerCase().includes("toxic") ||
      text.toLowerCase().includes("hate")
    ) {
      return {
        score: 0.95,
        label: "toxic",
        categories: ["hate_speech", "abuse"],
      };
    }

    if (text.toLowerCase().includes("spam")) {
      return {
        score: 0.7,
        label: "spam",
        categories: ["spam"],
      };
    }

    // Default safe
    return {
      score: 0.05,
      label: "safe",
      categories: [],
    };
  }
}
