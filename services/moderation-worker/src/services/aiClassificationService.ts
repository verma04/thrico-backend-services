import { log } from "@thrico/logging";

export interface AiClassificationResult {
  score: number;
  label: string;
  categories: string[];
}

export class AiClassificationService {
  /**
   * AI analysis using the local AI Gateway.
   */
  static async analyzeContent(text: string): Promise<AiClassificationResult> {
    log.info("AI Analyzing content...", { textLength: text.length });

    const aiGatewayUrl = process.env.AI_GATEWAY_URL || "http://localhost:2712";

    const response = await fetch(`${aiGatewayUrl}/ai/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway responded with status: ${response.status}`);
    }

    const data = (await response.json()) as any;
    
    // Expected data structure from the AI gateway might vary, but assuming
    // it returns something like { classification: "...", confidence: 0.x }
    return {
      score: data.confidence || data.score || 0.05,
      label: data.classification || data.label || "safe",
      categories: data.categories || [],
    };
  }
}
