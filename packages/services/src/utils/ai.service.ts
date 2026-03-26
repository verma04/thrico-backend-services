import { log } from "@thrico/logging";

export interface CaptionAnalysis {
  category: string;
  keywords: string[];
  sentiment: number;
}

export class AIService {
  private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private static readonly EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims
  private static readonly CHAT_MODEL = "gpt-4o-mini";

  static async generateEmbedding(text: string): Promise<number[]> {
    if (!this.OPENAI_API_KEY) {
      log.warn("OPENAI_API_KEY not found, returning zero vector");
      return new Array(1536).fill(0);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.EMBEDDING_MODEL,
        }),
      });

      const result = (await response.json()) as any;
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data[0].embedding;
    } catch (error) {
      log.error("Error generating embedding", { error, text });
      return new Array(1536).fill(0);
    }
  }

  static async analyzeCaption(caption: string): Promise<CaptionAnalysis> {
    if (!this.OPENAI_API_KEY) {
      log.warn("OPENAI_API_KEY not found, returning default analysis");
      return { category: "General", keywords: [], sentiment: 0.5 };
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: this.CHAT_MODEL,
            messages: [
              {
                role: "system",
                content: `Analyze the following video caption. 
              1. Detect the category (e.g., Business, Fitness, Education, Motivation, Tech, Entertainment).
              2. Extract 5-10 keywords.
              3. Detect sentiment score between 0.0 (negative) to 1.0 (positive).
              Return ONLY a JSON object with keys: category (string), keywords (string array), sentiment (float).`,
              },
              {
                role: "user",
                content: caption,
              },
            ],
            response_format: { type: "json_object" },
          }),
        },
      );

      const result = (await response.json()) as any;
      if (result.error) {
        throw new Error(result.error.message);
      }

      const analysis = JSON.parse(result.choices[0].message.content);
      return {
        category: analysis.category || "General",
        keywords: analysis.keywords || [],
        sentiment: analysis.sentiment || 0.5,
      };
    } catch (error) {
      log.error("Error analyzing caption", { error, caption });
      return { category: "General", keywords: [], sentiment: 0.5 };
    }
  }
}
