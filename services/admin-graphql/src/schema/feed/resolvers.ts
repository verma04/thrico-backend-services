import { sql, eq, and } from "drizzle-orm";
import { userFeed, feedComment } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  addFeedAdmin,
  addFeedCommentAdmin,
  deleteFeedAdmin,
  getAllFeedEntity,
  getFeedIntelligenceKPI,
  getFeedInterestMatrix,
  getFeedYieldVelocity,
  getPromotedNodeEvents,
  likeFeedAdmin,
  pinFeedAdmin,
} from "../../logic/feed/admin";
import {
  AdminModule,
  PermissionAction,
  ensurePermission,
} from "../../utils/auth/permissions.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

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

    async getAdminFeed(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { offset, limit } = input || {};
        return getAllFeedEntity({ db, offset, limit, entity, source: "admin" });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getJobFeed(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { offset, limit } = input || {};
        return getAllFeedEntity({ db, offset, limit, entity, source: "jobs" });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getMomentsFeed(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { offset, limit } = input || {};
        return getAllFeedEntity({
          db,
          offset,
          limit,
          entity,
          source: "moment",
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getListingFeed(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { offset, limit } = input || {};
        return getAllFeedEntity({
          db,
          offset,
          limit,
          entity,
          source: "marketPlace",
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getPinnedFeed(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { offset, limit } = input || {};
        return getAllFeedEntity({ db, offset, limit, entity, isPinned: true });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getFeedIntelligenceKPI(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return getFeedIntelligenceKPI({ db, entity });
    },

    async getFeedYieldVelocity(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return getFeedYieldVelocity({ db, entity });
    },

    async getFeedInterestMatrix(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return getFeedInterestMatrix({ db, entity });
    },

    async getPromotedNodeEvents(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return getPromotedNodeEvents({ db, entity });
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
      const auth = await checkAuth(context);
      const { db, entity, id: adminId } = auth;
      ensurePermission(auth, AdminModule.FEED, PermissionAction.CREATE);

      const result = await addFeedAdmin({ input, db, entity });

      await createAuditLog(db, {
        adminId,
        entityId: entity,
        module: AdminModule.FEED,
        action: "ADD_FEED",
        resourceId: result.id,
        newState: input,
      });

      return result;
    },

    async likeFeed(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      const { db, entity, id: adminId } = auth;
      ensurePermission(auth, AdminModule.FEED, PermissionAction.EDIT);

      const result = await likeFeedAdmin({
        input,
        entity,
        db,
      });

      await createAuditLog(db, {
        adminId,
        entityId: entity,
        module: AdminModule.FEED,
        action: result.status ? "LIKE_FEED" : "UNLIKE_FEED",
        resourceId: input.id,
      });

      return result;
    },

    async addComment(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      const { db, entity, id: adminId } = auth;
      ensurePermission(auth, AdminModule.FEED, PermissionAction.CREATE);

      const result = await addFeedCommentAdmin({
        input,
        entity,
        db,
      });

      await createAuditLog(db, {
        adminId,
        entityId: entity,
        module: AdminModule.FEED,
        action: "ADD_COMMENT",
        resourceId: result.id,
        newState: input,
      });

      return result;
    },

    async deleteCommentFeed(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      const { db, entity, id: adminId } = auth;
      ensurePermission(auth, AdminModule.FEED, PermissionAction.DELETE);

      try {
        const comment = await db.query.feedComment.findFirst({
          where: eq(feedComment.id, input.commentId),
          with: {
            feed: true,
          },
        });

        if (comment) {
          const feed = comment.feed;

          if (feed && feed.entity === entity) {
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

              return comment;
            });

            await createAuditLog(db, {
              adminId,
              entityId: entity,
              module: AdminModule.FEED,
              action: "DELETE_COMMENT",
              resourceId: comment.id,
              previousState: comment,
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

    async pinFeed(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      const { db, entity, id: adminId } = auth;
      ensurePermission(auth, AdminModule.FEED, PermissionAction.EDIT);

      const result = await pinFeedAdmin({ input, db, entity });

      await createAuditLog(db, {
        adminId,
        entityId: entity,
        module: AdminModule.FEED,
        action: input.isPinned ? "PIN_FEED" : "UNPIN_FEED",
        resourceId: input.feedId,
        newState: input,
      });

      return result;
    },

    async deleteFeed(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      const { db, entity, id: adminId } = auth;
      ensurePermission(auth, AdminModule.FEED, PermissionAction.DELETE);

      // Perform a lookup first to capture previous state for audit log if needed
      const existingFeed = await db.query.userFeed.findFirst({
        where: and(eq(userFeed.id, input.id), eq(userFeed.entity, entity)),
      });

      if (!existingFeed) {
        throw new Error("Feed not found");
      }

      const result = await deleteFeedAdmin({ input, db, entity });

      await createAuditLog(db, {
        adminId,
        entityId: entity,
        module: AdminModule.FEED,
        action: "DELETE_FEED",
        resourceId: input.id,
        previousState: existingFeed,
      });

      return result;
    },
  },
};
