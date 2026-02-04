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
      basicStats: {
        totalReactions: feed.totalReactions || 0,
        totalComments: totalComments[0]?.count || 0,
        totalShares: feed.totalReShare || 0,
        createdAt: feed.createdAt
          ? new Date(feed.createdAt).toISOString()
          : new Date().toISOString(),
      },
      reactionBreakdown: reactions,
      commentsOverTime: [], // Placeholder
      engagementByConnections: [
        {
          isConnection: true,
          reactions: 0,
          comments: 0,
        },
        {
          isConnection: false,
          reactions: 0,
          comments: 0,
        },
      ], // Placeholder
      impressions: 0, // Placeholder
      reach: 0, // Placeholder
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
