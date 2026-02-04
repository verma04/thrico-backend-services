import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  feedComment,
  feedReactions,
  feedWishList,
  user,
  userFeed,
  userToEntity,
  aboutUser,
  groups,
  offers,
} from "@thrico/database"; // Changed import to @thrico/database
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { GraphQLError } from "graphql";

import {
  GamificationEventService,
  FeedQueryService,
  FeedMutationService,
  FeedStatsService,
  FeedPollService,
  CommunityActionsService,
  OfferService,
} from "@thrico/services";
import { log } from "@thrico/logging";

const feedResolvers: any = {
  Query: {
    async getAllOffer(_: any, { input }: any, context: any) {
      const { db, entityId } = await checkAuth(context);
      const { page = 1, limit = 50, categoryId } = input || {};

      const result = await OfferService.getApprovedOffers({
        entityId,
        db,
        page,
        limit,
        categoryId,
      });

      return result.offers;
    },
    async getFeed(_: any, { input }: any, context: any) {
      let userId: string = "";
      let entityId: string = "";
      let db: any;
      let id: string = "";

      try {
        const { db, id, userId: uid, entityId } = await checkAuth(context);
        userId = uid;

        const currentUserId = userId;
        const { cursor, limit } = input || {};

        const result = await FeedQueryService.getUserFeed({
          currentUserId,
          db,
          cursor,
          limit,
          entity: entityId,
        });

        return result;
      } catch (error) {
        log.error("Error in getFeed", { error, userId, entityId, input });
        throw error;
      }
    },

    async getMyFeed(_: any, { input }: any, context: any) {
      let userId: string = "";
      try {
        const { db, id, userId: uid, entityId } = await checkAuth(context);
        userId = uid;

        const currentUserId = userId;
        const { cursor, limit } = input || {};

        const result = await FeedQueryService.getMyFeed({
          currentUserId,
          db,
          cursor,
          limit,
          entity: entityId,
        });
        return result;
      } catch (error) {
        log.error("Error in getMyFeed", { error, userId, input });
        throw error;
      }
    },
    async getMarketPlaceFeed(_: any, {}: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const currentUserId = userId;

        const result = await FeedQueryService.getMarketPlaceFeed({
          currentUserId,
          db,
        });

        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getUserEventsFeed(_: any, {}: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        const currentUserId = userId;

        const result = await FeedQueryService.getUserEventsFeed({
          currentUserId,
          db,
        });

        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getJobFeed(_: any, {}: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const currentUserId = userId;
        const result = await FeedQueryService.getJobFeed({ currentUserId, db });

        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunitiesFeed(_: any, {}: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const currentUserId = userId;
        const result = await FeedQueryService.getCommunitiesFeed({
          currentUserId,
          db,
        });
        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getPersonalizedFeed(_: any, {}: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const currentUserId = userId;

        const result = await db
          .select({
            id: userFeed.id,
            description: userFeed.description,
            source: userFeed.source,
            createdAt: userFeed.createdAt,
            totalComment: userFeed.totalComment,
            totalReactions: userFeed.totalReactions,
            user: { ...user, about: aboutUser },
            isLiked: sql<boolean>`EXISTS (
            SELECT 1 FROM ${feedReactions} 
            WHERE ${feedReactions.feedId} = ${userFeed.id} 
            AND ${feedReactions.userId} = ${currentUserId}
          )`,
            isWishList: sql<boolean>`EXISTS (
            SELECT 1 FROM ${feedWishList} 
            WHERE ${feedWishList.feedId} = ${userFeed.id} 
            AND ${feedWishList.userId} = ${currentUserId}
          )`,
            isOwner: sql<boolean>`${userFeed.userId} = ${currentUserId}`,
          })
          .from(userFeed)
          .innerJoin(userToEntity, eq(userFeed.userId, userToEntity.id))
          .innerJoin(user, eq(userToEntity.userId, user.id))
          .innerJoin(aboutUser, eq(user.id, aboutUser.userId))

          .orderBy(desc(userFeed.createdAt))
          .limit(50);

        return result;
      } catch (error) {
        log.error("Error in getPersonalizedFeed", { error, user });
        throw error;
      }
    },

    async getUserActivityFeed(_: any, { input }: any, context: any) {
      let userId: string = "";
      try {
        const auth = await checkAuth(context);
        userId = auth.userId;
        const { db } = auth;

        const currentUserId = userId;
        const result = await FeedQueryService.getUserActivityFeed({
          currentUserId,
          userId: input.userId || currentUserId, // Assuming input has userId or use current
          db,
        });
        return result;
      } catch (error) {
        log.error("Error in getUserActivityFeed", { error, userId, input });
        throw error;
      }
    },

    async getFeedComment(_: any, { input }: any, context: any) {
      let userId: string = "";
      try {
        const { db, userId: uid } = await checkAuth(context);
        userId = uid;

        const { feedId, cursor, limit } = input;

        const result = await FeedQueryService.getFeedComment({
          currentUserId: userId,
          feedId,
          cursor,
          limit,
          db,
        });

        return result;
      } catch (error) {
        log.error("Error in getFeedComment", { error, userId, input });
        throw error;
      }
    },

    async getFeedDetailsById(_: any, { input }: any, context: any) {
      let userId: string = "";
      try {
        const { db, userId: uid } = await checkAuth(context);
        userId = uid;

        return await FeedQueryService.getFeedDetailsById({
          feedId: input.id,
          currentUserId: userId,
          db,
        });
      } catch (error) {
        log.error("Error in getFeedDetailsById", { error, userId, input });
        throw error;
      }
    },

    async getPollByIdForUser(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);

        return FeedPollService.getPollByIdForUser({
          input,
          db: data.db,
          userId: data.userId,
          entity: data.entityId,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getFeedStats(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const currentUserId = userId;
        const { feedId } = input;

        const result = await FeedStatsService.getFeedStats({
          feedId,
          currentUserId,
          db,
        });

        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getFeedReactions(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const { feedId, offset = 0, limit = 20 } = input;

        const reactions = await db
          .select({
            id: feedReactions.id,
            createdAt: feedReactions.createdAt,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              about: sql`json_build_object('userId', ${aboutUser.userId}, 'bio', ${aboutUser.about})`,
            },
          })
          .from(feedReactions)
          .innerJoin(user, eq(feedReactions.userId, user.id))
          .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
          .where(eq(feedReactions.feedId, feedId))
          .orderBy(desc(feedReactions.createdAt))
          .limit(limit)
          .offset(offset);

        return reactions;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getAllPolls(_: any, { input }: any, context: any) {
      let userId: string = "";
      try {
        const auth = await checkAuth(context);
        userId = auth.userId;
        const { db } = auth;
        const { offset, limit } = input ?? {};

        // Placeholder for Poll Service
        return FeedPollService.getAllPolls({
          db,
          userId,
          offset,
          limit,
          entityId: auth.entityId,
        });
      } catch (error) {
        log.error("Error in getAllPolls", { error, userId, input });
        throw error;
      }
    },
  },
  Mutation: {
    async addFeed(_: any, { input }: any, context: any) {
      const { userId, db, entityId } = await checkAuth(context);
      try {
        return FeedMutationService.addFeed({ input, userId, db, entityId });
      } catch (error) {
        log.error("Error in addFeed", { error, userId, input });
        throw error;
      }
    },

    async addFeedCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, db, entityId, userId } = await checkAuth(context);

        const checkGroup = await db.query.groups.findFirst({
          where: eq(groups.id, input.groupId),
        });
        if (!checkGroup) {
          throw new Error("Action Not Allowed");
        }

        const feed = await CommunityActionsService.createCommunityFeed({
          userId: userId,
          entityId: entityId,
          communityId: input.groupId,
          db,
          input: input,
        });

        return feed;
      } catch (error) {
        log.error("Error in addFeedCommunities", { error, user, input });
        throw error;
      }
    },

    async addComment(_: any, { input }: any, context: any) {
      const { userId, db, entityId } = await checkAuth(context);
      const currentUserId = userId;
      try {
        const result = await FeedMutationService.addComment({
          currentUserId,
          input,
          entity: entityId,
          db,
        });
        return result;
      } catch (error) {
        log.error("Error in addComment", { error, userId, input });
        throw error;
      }
    },

    async wishListFeed(_: any, { input }: any, context: any) {
      const { userId, db, entityId } = await checkAuth(context);

      const currentUserId = userId;

      try {
        const like = await FeedMutationService.wishListFeed({
          currentUserId,
          input,
          entityId: entityId,
          db,
        });
        return like;
      } catch (error) {
        log.error("Error in wishListFeed", { error, userId, input });
        throw error;
      }
    },

    async likeFeed(_: any, { input }: any, context: any) {
      const { userId, db, entityId } = await checkAuth(context);

      const currentUserId = userId;

      try {
        const like = await FeedMutationService.likeFeed({
          currentUserId,
          input,
          entity: entityId,
          db,
        });
        return like;
      } catch (error) {
        log.error("Error in likeFeed", { error, userId, input });
        throw error;
      }
    },

    async deleteFeed(_: any, { input }: any, context: any) {
      const { userId, db } = await checkAuth(context);

      try {
        await FeedMutationService.deleteFeed({
          feedId: input.id,
          currentUserId: userId,
          db,
        });

        return {
          id: input.id,
        };
      } catch (error) {
        log.error("Error in deleteFeed", { error, userId, input });
        throw error;
      }
    },
    async deleteCommentFeed(_: any, { input }: any, context: any) {
      const { userId, db } = await checkAuth(context);

      try {
        await FeedMutationService.deleteCommentFeed({
          feedId: input.feedId,
          commentId: input.commentId,
          currentUserId: userId,
          db,
        });
        return { id: input.commentId };
      } catch (error) {
        log.error("Error in deleteCommentFeed", { error, userId, input });
        throw error;
      }
    },

    async repostFeedWithThought(_: any, { input }: any, context: any) {
      const { userId, db, entityId } = await checkAuth(context);

      const checkFeed = await db.query.userFeed.findFirst({
        where: eq(userFeed.id, input.feedId),
      });
      try {
        const feed = await db.transaction(async (tx: any) => {
          const newFeed = await tx
            .insert(userFeed)
            .values({
              userId: userId,
              entity: entityId,
              description: input?.description,
              source: "rePost",
              privacy: input.privacy,
              repostId: input.feedId,
            })
            .returning({ id: userFeed.id });

          if (checkFeed) {
            await db
              .update(userFeed)
              .set({ totalReShare: checkFeed.totalReShare + 1 })
              .where(eq(userFeed.id, input.feedId));
          }

          const feed = await tx.query.userFeed.findFirst({
            where: eq(userFeed.id, newFeed[0].id),
            with: {
              comment: true,
              reactions: true,

              user: {
                with: {
                  about: true,
                },
              },
            },
          });
          return feed;
        });

        // Gamification Trigger for Job Share
        if (checkFeed && checkFeed.jobId) {
          await GamificationEventService.triggerEvent({
            triggerId: "tr-job-share",
            moduleId: "jobs",
            userId,
            entityId,
          });
        }

        return {
          ...feed,
          isOwner: true,
        };
      } catch (error) {
        log.error("Error in repostFeedWithThought", { error, userId, input });
        throw error;
      }
    },

    async voteOnPoll(_: any, { input }: any, context: any) {
      const data = await checkAuth(context);
      try {
        return await FeedPollService.voteOnPoll({
          db: data.db,
          userId: data.userId,
          entity: data.entityId,
          input,
        });
      } catch (error) {
        log.error("Error in voteOnPoll", { error, userId: data.userId, input });
        throw error;
      }
    },
    async pinFeed(_: any, { input }: any, context: any) {
      const { userId, db } = await checkAuth(context);
      try {
        return await FeedMutationService.pinFeed({
          feedId: input.feedId,
          isPinned: input.isPinned,
          currentUserId: userId,
          db,
        });
      } catch (error) {
        log.error("Error in pinFeed", { error, userId, input });
        throw error;
      }
    },
    async editFeedComment(_: any, { input }: any, context: any) {
      const { userId, db, entityId } = await checkAuth(context);
      try {
        return await FeedMutationService.editFeedComment({
          currentUserId: userId,
          commentId: input.commentId,
          content: input.content,
          db,
          entity: entityId,
        });
      } catch (error) {
        log.error("Error in editFeedComment", { error, userId, input });
        throw error;
      }
    },
  },
};

export { feedResolvers };
