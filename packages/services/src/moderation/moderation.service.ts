import { eq, and } from "drizzle-orm";
import { bannedWords, blockedLinks } from "@thrico/database";
import { GraphQLError } from "graphql";

export class ModerationService {
  /**
   * Checks if the given fields contain any banned words or blocked links.
   * Throws a GraphQLError if any violations are found.
   */
  static async checkContent({
    entityId,
    db,
    content,
  }: {
    entityId: string;
    db: any;
    content: Record<string, string | null | undefined>;
  }) {
    // Collect all text from fields
    const textPieces = Object.values(content).filter(Boolean) as string[];
    if (textPieces.length === 0) return;

    const fullText = textPieces.join(" ");

    // 1. Fetch banned words for this entity
    const words = await db.query.bannedWords.findMany({
      where: and(
        eq(bannedWords.entityId, entityId),
        eq(bannedWords.isActive, true),
      ),
    });

    if (words.length > 0) {
      // Create a regex for all banned words for efficiency
      // Escape special characters in words
      const escapedWords = words.map((bw: any) =>
        bw.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      );
      // Word boundary check might be better but let's stick to user request's "exists"
      const bannedRegex = new RegExp(`(${escapedWords.join("|")})`, "gi");

      const match = fullText.match(bannedRegex);
      if (match) {
        throw new GraphQLError(`Content contains a banned word: ${match[0]}`, {
          extensions: { code: "BANNED_WORD_FOUND", http: { status: 400 } },
        });
      }
    }

    // 2. Fetch blocked links for this entity
    const links = await db.query.blockedLinks.findMany({
      where: and(
        eq(blockedLinks.entityId, entityId),
        eq(blockedLinks.isBlocked, true),
      ),
    });

    for (const link of links) {
      if (link.type === "DOMAIN") {
        if (fullText.toLowerCase().includes(link.url.toLowerCase())) {
          throw new GraphQLError(
            `Content contains a blocked domain: ${link.url}`,
            {
              extensions: { code: "BLOCKED_LINK_FOUND", http: { status: 400 } },
            },
          );
        }
      } else if (link.type === "URL") {
        if (fullText.includes(link.url)) {
          throw new GraphQLError(
            `Content contains a blocked link: ${link.url}`,
            {
              extensions: { code: "BLOCKED_LINK_FOUND", http: { status: 400 } },
            },
          );
        }
      } else if (link.type === "PATTERN") {
        try {
          const regex = new RegExp(link.url, "gi");
          if (regex.test(fullText)) {
            throw new GraphQLError(`Content matches a blocked pattern`, {
              extensions: { code: "BLOCKED_LINK_FOUND", http: { status: 400 } },
            });
          }
        } catch (e) {
          // Skip invalid regex
        }
      }
    }
  }
}
