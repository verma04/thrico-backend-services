import { sql, eq, and } from "drizzle-orm";
import { userFeed, feedComment } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  addFeedAdmin,
  addFeedCommentAdmin,
  getAllFeedEntity,
  likeFeedAdmin,
} from "../../logic/feed/admin";

export const feedResolvers = {
  Query: {
    async getAllFeed(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { offset, limit } = input || {};
        return getAllFeedEntity({ db, offset, limit, entity });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async numberOfFeeds(_: any, {}: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const count = await db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(userFeed)
          .where(eq(userFeed.entity, entity));

        return count[0]?.count || 0;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getFeedComment(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        // Assuming access control is checked via feed visibility or merely auth for now per user implementation

        const results = await db.query.feedComment.findMany({
          where: eq(feedComment.feedId, input.id),
          orderBy: (posts: any, { desc }: any) => [desc(posts.createdAt)],
          with: {
            feed: true,
            user: {
              with: {
                about: true,
              },
            },
          },
        });

        return results;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addFeed(_: any, { input }: any, context: any) {
      const { db, entity } = await checkAuth(context);
      return addFeedAdmin({ input, db, entity });
    },

    async likeFeed(_: any, { input }: any, context: any) {
      const { db, entity } = await checkAuth(context);
      return likeFeedAdmin({
        input,
        entity,
        db,
      });
    },

    async addComment(_: any, { input }: any, context: any) {
      const { db, entity } = await checkAuth(context);
      return addFeedCommentAdmin({
        input,
        entity,
        db,
      });
    },

    async deleteCommentFeed(_: any, { input }: any, context: any) {
      const { db, entity } = await checkAuth(context);

      try {
        // First verify comment exists and belongs to a feed owned by this entity?
        // Or if the comment was made by the entity?
        // User requirements implied "delete ad comment as owner".
        // We'll allow entity admin to delete any comment on their feed OR their own comments.

        const comment = await db.query.feedComment.findFirst({
          where: eq(feedComment.id, input.commentId),
          with: {
            feed: true,
          },
        });

        if (comment) {
          // Check ownership:
          // 1. Comment added by this entity? (addedBy='ENTITY'?) - Schema doesn't save entityId in feedComment directly, just user_id or addedBy enum.
          // 2. Feed owned by this entity?

          // Checking feed ownership
          const feed = comment.feed; // joined via `with`

          if (feed && feed.entity === entity) {
            // Authorized to delete

            // Perform delete in transaction
            const deleteResult = await db.transaction(async (tx: any) => {
              await tx
                .delete(feedComment)
                .where(eq(feedComment.id, comment.id));

              await tx
                .update(userFeed)
                .set({
                  totalComment:
                    feed.totalComment <= 0
                      ? 0
                      : sql`${userFeed.totalComment} - 1`,
                })
                .where(eq(userFeed.id, feed.id));

              return {
                id: comment.id,
                feedId: comment.feedId,
              };
            });
            return deleteResult;
          } else {
            throw new Error("Unauthorized to delete this comment");
          }
        }
        return null;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
