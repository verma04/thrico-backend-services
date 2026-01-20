import { eq, sql } from "drizzle-orm";
import { feedReactions, feedComment, userFeed } from "@thrico/database";

export class FeedStatsService {
  static async getFeedStats({
    feedId,
    currentUserId,
    db,
  }: {
    feedId: string;
    currentUserId: string;
    db: any;
  }) {
    const feed = await db.query.userFeed.findFirst({
      where: eq(userFeed.id, feedId),
    });

    if (!feed) {
      throw new Error("Feed not found");
    }

    const reactions = await db
      .select({
        reactionsType: feedReactions.reactionsType,
        count: sql<number>`count(*)::int`,
      })
      .from(feedReactions)
      .where(eq(feedReactions.feedId, feedId))
      .groupBy(feedReactions.reactionsType);

    const totalComments = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(feedComment)
      .where(eq(feedComment.feedId, feedId));

    return {
      feedId,
      totalReactions: feed.totalReactions,
      totalComments: totalComments[0]?.count || 0,
      totalShares: feed.totalReShare || 0,
      reactionBreakdown: reactions,
    };
  }

  static async reportFeed({
    feedId,
    currentUserId,
    reason,
    db,
  }: {
    feedId: string;
    currentUserId: string;
    reason: string;
    db: any;
  }) {
    // Implement report logic here
    // This should insert into a reports table
    console.warn("reportFeed not fully implemented");
    return {
      success: true,
      message: "Report feed endpoint reached (placeholder)",
    };
  }
}
