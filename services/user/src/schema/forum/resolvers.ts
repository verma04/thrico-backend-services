import { ForumService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";

export const forumResolvers = {
  Query: {
    async getDiscussionForumCategory(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = await checkAuth(context);
        return ForumService.getDiscussionForumCategory({ db, entityId });
      } catch (error) {
        throw error;
      }
    },

    async discussionPostedByMe(_: any, { cursor, limit }: any, context: any) {
      try {
        const { db, entityId, userId } = await checkAuth(context);
        return ForumService.discussionPostedByMe({
          db,
          entityId,
          userId,
          cursor,
          limit,
        });
      } catch (error) {
        throw error;
      }
    },

    async getDiscussionForum(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } = await checkAuth(context);
        const { status, cursor, limit } = input || {};
        return ForumService.getDiscussionForum({
          db,
          entityId,
          userId,
          status,
          cursor,
          limit,
        });
      } catch (error) {
        throw error;
      }
    },

    async getDiscussionForumDetailsByID(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } = await checkAuth(context);
        const { discussionForumId } = input;
        return ForumService.getDiscussionForumDetailsByID({
          db,
          entityId,
          userId,
          discussionForumId,
        });
      } catch (error) {
        throw error;
      }
    },

    async getDiscussionForumComments(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const { id, cursor, limit } = input;
        return ForumService.getDiscussionForumComments({
          db,
          discussionForumId: id,
          cursor,
          limit,
        });
      } catch (error) {
        throw error;
      }
    },
  },
  Mutation: {
    async addDiscussionForum(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        const checkAutoApprove = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entityId),
        });
        const autoApprove = !!checkAutoApprove?.autoApproveDiscussionForum;
        return ForumService.addDiscussionForum({
          db,
          entityId,
          userId,
          input,
          autoApprove,
        });
      } catch (error) {
        throw error;
      }
    },

    async deleteForum(_: any, { input }: any, context: any) {
      try {
        const { id: userId, entityId, db } = await checkAuth(context);
        const { forumId } = input;
        return ForumService.deleteForum({ db, entityId, userId, forumId });
      } catch (error) {
        throw error;
      }
    },

    async editDiscussionForum(_: any, { input }: any, context: any) {
      try {
        const { id: userId, db, entityId } = await checkAuth(context);
        return ForumService.editDiscussionForum({
          db,
          entityId,
          userId,
          input,
        });
      } catch (error) {
        throw error;
      }
    },

    async postDiscussionForumComments(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const { discussionForumId, content } = input;
        return ForumService.postDiscussionForumComments({
          db,
          userId,
          discussionForumId,
          content,
        });
      } catch (error) {
        throw error;
      }
    },

    async deleteDiscussionForumComments(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, id: performedBy } = await checkAuth(context);
        const { discussionForumId, commentId, reason } = input;
        return ForumService.deleteDiscussionForumComments({
          db,
          entityId,
          performedBy,
          discussionForumId,
          commentId,
          reason,
        });
      } catch (error) {
        throw error;
      }
    },

    async upVoteDiscussionForum(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const { discussionForumId, upVote } = input;
        return ForumService.upVoteDiscussionForum({
          db,
          userId,
          discussionForumId,
          upVote,
        });
      } catch (error) {
        throw error;
      }
    },

    async downVoteDiscussionForum(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const { discussionForumId, downVote } = input;
        return ForumService.downVoteDiscussionForum({
          db,
          userId,
          discussionForumId,
          downVote,
        });
      } catch (error) {
        throw error;
      }
    },
  },
};
