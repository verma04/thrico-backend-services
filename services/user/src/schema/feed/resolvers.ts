import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  feedReactions,
  user,
  userFeed,
  aboutUser,
  groups,
} from "@thrico/database";
import { eq, desc, sql, and } from "drizzle-orm";
import { GraphQLError } from "graphql";

import {
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
      try {
        const { db, entityId, userId } = await checkAuth(context);
        const { cursor, limit = 50, categoryId } = input || {};

        const result = await OfferService.getApprovedOffers({
          entityId,
          db,
          cursor,
          limit,
          categoryId,
          currentUserId: userId,
        });

        return result.edges.map((edge: any) => edge.node);
      } catch (error) {
        log.error("Error in getAllOffer", { error });
        throw error;
      }
    },
    async getFeed(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

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
        log.error("Error in getFeed", { error, input });
        throw error;
      }
    },

    async getMyFeed(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

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
        log.error("Error in getMyFeed", { error, input });
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
        log.error("Error in getMarketPlaceFeed", { error });
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
        log.error("Error in getUserEventsFeed", { error });
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
        log.error("Error in getJobFeed", { error });
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
        log.error("Error in getCommunitiesFeed", { error });
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
            videoUrl: userFeed.videoUrl,
            thumbnailUrl: userFeed.thumbnailUrl,
            momentId: userFeed.momentId,
            user: { ...user, about: aboutUser },
            isLiked: sql<boolean>`EXISTS (
            SELECT 1 FROM ${feedReactions}
            WHERE ${feedReactions.feedId} = ${userFeed.id}
            AND ${feedReactions.userId} = ${currentUserId}
          )`,
            isWishList: sql<boolean>`EXISTS (
            SELECT 1 FROM feed_wish_list
            WHERE feed_wish_list.feed_id = ${userFeed.id}
            AND feed_wish_list.user_id = ${currentUserId}
          )`,
            isOwner: sql<boolean>`${userFeed.userId} = ${currentUserId}`,
          })
          .from(userFeed)
          .innerJoin(user, eq(userFeed.userId, user.id))
          .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
          .orderBy(desc(userFeed.createdAt))
          .limit(50);

        return result;
      } catch (error) {
        log.error("Error in getPersonalizedFeed", { error });
        throw error;
      }
    },

    async getUserActivityFeed(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        const currentUserId = userId;
        const result = await FeedQueryService.getUserActivityFeed({
          currentUserId,
          userId: input.id || currentUserId,
          db,
        });
        return result;
      } catch (error) {
        log.error("Error in getUserActivityFeed", { error, input });
        throw error;
      }
    },

    async getFeedActivityByUserId(_: any, { userId, input }: any, context: any) {
      try {
        const { db, userId: currentUserId, entityId } = await checkAuth(context);

        const { cursor, limit } = input || {};

        const result = await FeedQueryService.getFeedActivityByUserId({
          currentUserId,
          userId,
          db,
          cursor,
          limit,
          entity: entityId,
        });

        return result;
      } catch (error) {
        log.error("Error in getFeedActivityByUserId", { error, userId, input });
        throw error;
      }
    },

    async getFeedComment(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

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
        log.error("Error in getFeedComment", { error, input });
        throw error;
      }
    },

    async getFeedDetailsById(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        return await FeedQueryService.getFeedDetailsById({
          feedId: input.id,
          currentUserId: userId,
          db,
        });
      } catch (error) {
        log.error("Error in getFeedDetailsById", { error, input });
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
        log.error("Error in getFeedStats", { error, input });
        throw error;
      }
    },
    async getFeedReactions(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const { feedId, cursor, limit } = input;

        return await FeedQueryService.getFeedReactions({
          feedId,
          cursor,
          limit,
          db,
        });
      } catch (error) {
        log.error("Error in getFeedReactions", { error, input });
        throw error;
      }
    },
  },
  Mutation: {
    async addFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        const set = await FeedMutationService.addFeed({
          input,
          userId,
          db,
          entityId,
        });

        return set;
      } catch (error) {
        log.error("Error in addFeed", { error, input });
        throw error;
      }
    },

    async addFeedCommunities(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } = await checkAuth(context);

        const checkGroup = await db.query.groups.findFirst({
          where: eq(groups.id, input.groupId || input.groupID),
        });
        if (!checkGroup) {
          throw new Error("Action Not Allowed");
        }

        const feed = await CommunityActionsService.createCommunityFeed({
          userId: userId,
          entityId: entityId,
          communityId: input.groupId || input.groupID,
          db,
          input: input,
        });

        return feed;
      } catch (error) {
        log.error("Error in addFeedCommunities", { error, input });
        throw error;
      }
    },

    async addComment(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        const currentUserId = userId;
        const result = await FeedMutationService.addComment({
          currentUserId,
          input,
          entity: entityId,
          db,
        });
        return result;
      } catch (error) {
        log.error("Error in addComment", { error, input });
        throw error;
      }
    },

    async wishListFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);

        const currentUserId = userId;

        const like = await FeedMutationService.wishListFeed({
          currentUserId,
          input,
          entityId: entityId,
          db,
        });
        return like;
      } catch (error) {
        log.error("Error in wishListFeed", { error, input });
        throw error;
      }
    },

    async likeFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);

        const currentUserId = userId;
        const like = await FeedMutationService.likeFeed({
          currentUserId,
          input,
          entity: entityId,
          db,
          type: input?.type,
        });
        return like;
      } catch (error) {
        log.error("Error in likeFeed", { error, input });
        throw error;
      }
    },

    async deleteFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        await FeedMutationService.deleteFeed({
          feedId: input.id,
          currentUserId: userId,
          db,
        });

        return {
          id: input.id,
        };
      } catch (error) {
        log.error("Error in deleteFeed", { error, input });
        throw error;
      }
    },
    async deleteCommentFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        await FeedMutationService.deleteCommentFeed({
          feedId: input.feedId,
          commentId: input.commentId,
          currentUserId: userId,
          db,
        });
        return { id: input.commentId };
      } catch (error) {
        log.error("Error in deleteCommentFeed", { error, input });
        throw error;
      }
    },

    async repostFeedWithThought(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);

        const feed = await FeedMutationService.repostFeed({
          currentUserId: userId,
          input: {
            feedId: input.feedId,
            description: input.description,
            privacy: input.privacy,
          },
          entity: entityId,
          db,
        });

        return {
          ...feed,
          isOwner: true,
        };
      } catch (error) {
        log.error("Error in repostFeedWithThought", { error, input });
        throw error;
      }
    },

    async pinFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await FeedMutationService.pinFeed({
          feedId: input.feedId,
          isPinned: input.isPinned,
          currentUserId: userId,
          db,
        });
      } catch (error) {
        log.error("Error in pinFeed", { error, input });
        throw error;
      }
    },
    async editFeedComment(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        return await FeedMutationService.editFeedComment({
          currentUserId: userId,
          commentId: input.commentId,
          content: input.content,
          db,
          entity: entityId,
        });
      } catch (error) {
        log.error("Error in editFeedComment", { error, input });
        throw error;
      }
    },
    async editFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        return await FeedMutationService.editFeed({
          feedId: input.id,
          currentUserId: userId,
          entityId,
          input,
          db,
        });
      } catch (error) {
        log.error("Error in editFeed", { error, input });
        throw error;
      }
    },
  },
};

export { feedResolvers };
