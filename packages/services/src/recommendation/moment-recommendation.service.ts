import {
  moments,
  user,
  momentViews,
  momentReactions,
  momentWishlist,
  aboutUser,
} from "@thrico/database";
import { and, desc, eq, sql, lt, exists } from "drizzle-orm";
import { log } from "@thrico/logging";
import { MomentService } from "../moment/moment.service";

export class MomentRecommendationService {
  /**
   * Updates a user's embedding based on their watch history.
   * Formula: average of embeddings of moments the user watched fully (>80%).
   */
  static async updateUserEmbedding(userId: string, db: any) {
    try {
      // Fetch embeddings of moments the user watched > 80% (completed)
      const topWatchedMoments = await db
        .select({
          embedding: moments.embedding,
        })
        .from(momentViews)
        .innerJoin(moments, eq(momentViews.momentId, moments.id))
        .where(
          and(eq(momentViews.userId, userId), eq(momentViews.completed, true)),
        )
        .orderBy(desc(momentViews.timestamp))
        .limit(50);

      const validEmbeddings = topWatchedMoments
        .map((m: any) => m.embedding)
        .filter((e: any) => e !== null && Array.isArray(e) && e.length > 0);

      if (validEmbeddings.length === 0) return;

      // Average vectors
      const dimensions = validEmbeddings[0].length;
      const averageEmbedding = new Array(dimensions).fill(0);

      for (const emb of validEmbeddings) {
        for (let i = 0; i < dimensions; i++) {
          averageEmbedding[i] += emb[i];
        }
      }

      for (let i = 0; i < dimensions; i++) {
        averageEmbedding[i] /= validEmbeddings.length;
      }

      // Update user table
      await db
        .update(user)
        .set({
          embedding: averageEmbedding,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

      log.info(`Updated embedding for user: ${userId}`, {
        momentsCount: validEmbeddings.length,
      });
    } catch (error) {
      log.error("Error updating user embedding", { error, userId });
      throw error;
    }
  }

  /**
   * Gets personalized feed using a hybrid score:
   * (Similarity * 0.5) + (Engagement * 0.3) + (Popularity * 0.2)
   */
  static async getPersonalizedFeed(
    input: { cursor?: string; limit?: number },
    entityId: string,
    userId: string,
    db: any,
  ) {
    try {
      const { cursor, limit = 10 } = input;

      if (!db || typeof db.select !== "function") {
        log.error("Invalid database instance passed to getPersonalizedFeed", {
          dbType: typeof db,
          hasDb: !!db,
        });
        throw new Error("Database instance error: db.select is not a function");
      }

      // 1. Get user embedding
      const [userData] = await db
        .select({ embedding: user.embedding })
        .from(user)
        .where(eq(user.id, userId));

      const userEmbedding = userData?.embedding;
      const hasUserVector =
        userEmbedding &&
        Array.isArray(userEmbedding) &&
        userEmbedding.length > 0;

      // Base query parts
      const selectFields = {
        moment: moments,
        owner: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          headline: aboutUser.headline,
        },
        isLiked: exists(
          db
            .select()
            .from(momentReactions)
            .where(
              and(
                eq(momentReactions.momentId, moments.id),
                eq(momentReactions.userId, userId),
              ),
            ),
        ),
        isWishlisted: exists(
          db
            .select()
            .from(momentWishlist)
            .where(
              and(
                eq(momentWishlist.momentId, moments.id),
                eq(momentWishlist.userId, userId),
              ),
            ),
        ),
      };

      if (!hasUserVector) {
        // Fallback to popular/recent
        const results = await db
          .select({
            ...selectFields,
            similarity: sql<number>`0`,
          })
          .from(moments)
          .leftJoin(user, eq(moments.userId, user.id))
          .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
          .where(
            and(
              eq(moments.entityId, entityId),
              eq(moments.status, "PUBLISHED"),
              cursor
                ? sql`${moments.createdAt} < ${MomentService.decodeCursor(cursor).createdAt}`
                : undefined,
            ),
          )
          .orderBy(desc(moments.totalViews), desc(moments.createdAt))
          .limit(limit + 1);

        return MomentService.formatMomentConnection(results, limit, userId);
      }

      const userVectorStr = `[${userEmbedding.join(",")}]`;

      // Optimized query with similarity score
      const results = await db
        .select({
          ...selectFields,
          similarity: sql<number>`1 - (thrico_moments.embedding <=> ${userVectorStr}::vector)`,
          finalScore: sql<number>`
            (1 - (thrico_moments.embedding <=> ${userVectorStr}::vector)) * 0.5 +
            ((thrico_moments.total_reactions + thrico_moments.total_comments)::float / (thrico_moments.total_views + 1)) * 0.3 +
            (thrico_moments.total_views::float / 1000) * 0.2
          `,
        })
        .from(moments)
        .leftJoin(user, eq(moments.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(
          and(
            eq(moments.entityId, entityId),
            eq(moments.status, "PUBLISHED"),
            cursor
              ? sql`${moments.createdAt} < ${MomentService.decodeCursor(cursor).createdAt}`
              : undefined,
          ),
        )
        .orderBy(sql`finalScore DESC`)
        .limit(limit + 1);

      return MomentService.formatMomentConnection(results, limit, userId);
    } catch (error) {
      log.error("Error fetching personalized feed", { error, userId });
      throw error;
    }
  }
}
