import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, ne } from "drizzle-orm";
import {
  discussionForum,
  discussionForumAuditLogs,
  discussionForumComment,
  discussionVotes,
} from "@thrico/database";
import generateSlug from "../generateSlug";
import { GamificationEventService } from "../gamification/gamification-event.service";

export class ForumService {
  static async getDiscussionForumCategory({
    db,
    entityId,
  }: {
    db: any;
    entityId: string;
  }) {
    try {
      if (!entityId) {
        throw new GraphQLError("Entity ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting discussion forum categories", { entityId });

      const whereClause = (discussionCategory: any, { eq, and }: any) =>
        and(
          eq(discussionCategory.entity, entityId),
          eq(discussionCategory.isActive, true)
        );

      const category = await db.query.discussionCategory.findMany({
        where: whereClause,
        orderBy: (discussionCategory: any, { desc }: any) =>
          desc(discussionCategory.updatedAt),
      });

      log.info("Discussion forum categories retrieved", {
        entityId,
        count: category.length,
      });
      return category;
    } catch (error) {
      log.error("Error in getDiscussionForumCategory", { error, entityId });
      throw error;
    }
  }

  static async discussionPostedByMe({
    db,
    entityId,
    userId,
  }: {
    db: any;
    entityId: string;
    userId: string;
  }) {
    try {
      if (!entityId || !userId) {
        throw new GraphQLError("Entity ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting discussions posted by user", { entityId, userId });

      const forums = await db.query.discussionForum.findMany({
        where: (discussionForum: any, { eq, and }: any) =>
          and(
            eq(discussionForum.entityId, entityId),
            eq(discussionForum.userId, userId)
          ),
        orderBy: (discussionForum: any, { desc }: any) =>
          desc(discussionForum.createdAt),
        with: {
          verification: true,
          category: true,
          discussionForumVotes: true,
          user: true,
        },
      });

      forums.forEach((forum: any) => {
        forum.isOwner = forum.userId === userId;
      });

      log.info("User discussions retrieved", {
        entityId,
        userId,
        count: forums.length,
      });
      return forums;
    } catch (error) {
      log.error("Error in discussionPostedByMe", { error, entityId, userId });
      throw error;
    }
  }

  static async getDiscussionForum({
    db,
    entityId,
    userId,
    status,
  }: {
    db: any;
    entityId: string;
    userId: string;
    status: string;
  }) {
    try {
      if (!entityId || !userId) {
        throw new GraphQLError("Entity ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting discussion forums", { entityId, userId, status });

      let orderBy;
      switch (status) {
        case "TRENDING":
          orderBy = (discussionForum: any, { desc }: any) =>
            desc(discussionForum.upVotes);
          break;
        case "HOT":
          orderBy = (discussionForum: any, { desc }: any) =>
            desc(discussionForum.totalComments);
          break;
        case "NEW":
        default:
          orderBy = (discussionForum: any, { desc }: any) =>
            desc(discussionForum.createdAt);
          break;
      }

      const forums = await db.query.discussionForum.findMany({
        where: (discussionForum: any, { eq }: any) =>
          and(
            eq(discussionForum.entityId, entityId),
            eq(discussionForum.status, "APPROVED")
          ),
        orderBy,
        with: {
          user: true,
          verification: true,
          category: true,
          discussionForumVotes: true,
        },
      });

      forums.forEach((forum: any) => {
        forum.isOwner = forum.userId === userId;
      });

      log.info("Discussion forums retrieved", {
        entityId,
        status,
        count: forums.length,
      });
      return forums;
    } catch (error) {
      log.error("Error in getDiscussionForum", { error, entityId, status });
      throw error;
    }
  }

  static async getDiscussionForumDetailsByID({
    db,
    entityId,
    userId,
    discussionForumId,
  }: {
    db: any;
    entityId: string;
    userId: string;
    discussionForumId: string;
  }) {
    try {
      if (!entityId || !userId || !discussionForumId) {
        throw new GraphQLError(
          "Entity ID, User ID, and Discussion Forum ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Getting discussion forum details", {
        entityId,
        userId,
        discussionForumId,
      });

      const forum = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq, and }: any) =>
          and(
            eq(discussionForum.id, discussionForumId),
            eq(discussionForum.entityId, entityId)
          ),
        with: {
          verification: true,
          category: true,
          discussionForumVotes: true,
        },
      });

      if (!forum) {
        throw new GraphQLError("Discussion forum not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const yourVote = Array.isArray(forum.discussionForumVotes)
        ? forum.discussionForumVotes.find(
            (vote: any) => vote?.votedBy === "USER" && vote?.userId === userId
          )
        : forum.discussionForumVotes &&
          (forum.discussionForumVotes as any).votedBy === "ENTITY"
        ? forum.discussionForumVotes
        : undefined;

      log.info("Discussion forum details retrieved", {
        discussionForumId,
        hasVote: !!yourVote,
      });

      return {
        ...forum,
        isLikeByYou: !!yourVote,
        voteType: yourVote?.type,
      };
    } catch (error) {
      log.error("Error in getDiscussionForumDetailsByID", {
        error,
        entityId,
        discussionForumId,
      });
      throw error;
    }
  }

  static async getDiscussionForumComments({
    db,
    discussionForumId,
  }: {
    db: any;
    discussionForumId: string;
  }) {
    try {
      if (!discussionForumId) {
        throw new GraphQLError("Discussion Forum ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting discussion forum comments", { discussionForumId });

      const comments = await db.query.discussionForumComment.findMany({
        where: (discussionForumComment: any, { eq, and }: any) =>
          and(eq(discussionForumComment.discussionForumId, discussionForumId)),
        orderBy: (discussionForumComment: any, { desc }: any) =>
          desc(discussionForumComment.createdAt),
        with: {
          user: true,
        },
      });

      log.info("Discussion forum comments retrieved", {
        discussionForumId,
        count: comments.length,
      });
      return comments;
    } catch (error) {
      log.error("Error in getDiscussionForumComments", {
        error,
        discussionForumId,
      });
      throw error;
    }
  }

  static async addDiscussionForum({
    db,
    entityId,
    userId,
    input,
    autoApprove,
  }: {
    db: any;
    entityId: string;
    userId: string;
    input: any;
    autoApprove: boolean;
  }) {
    try {
      if (!entityId || !userId || !input || !input.title) {
        throw new GraphQLError("Entity ID, User ID, and Title are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Adding discussion forum", {
        entityId,
        userId,
        title: input.title,
      });

      const isExist = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq }: any) =>
          and(
            eq(discussionForum.entityId, entityId),
            eq(discussionForum.title, input.title)
          ),
      });

      if (isExist) {
        throw new GraphQLError("Discussion forum already exists.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const newForum = await db
        .insert(discussionForum)
        .values({
          ...input,
          addedBy: "USER",
          entityId: entityId,
          userId: userId,
          isApproved: false,
          status: autoApprove ? "APPROVED" : "PENDING",
          approvedReason: autoApprove ? "auto approved by system" : "",
          totalVotes: 0,
          slug: generateSlug(input.title),
        })
        .returning();

      log.info("Discussion forum added", {
        entityId,
        userId,
        forumId: newForum[0].id,
        status: newForum[0].status,
      });

      // Gamification Trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-forum-add",
        moduleId: "forums",
        userId,
        entityId,
      });

      return newForum[0];
    } catch (error) {
      log.error("Error in addDiscussionForum", { error, entityId, userId });
      throw error;
    }
  }

  static async deleteForum({
    db,
    entityId,
    userId,
    forumId,
  }: {
    db: any;
    entityId: string;
    userId: string;
    forumId: string;
  }) {
    try {
      if (!entityId || !userId || !forumId) {
        throw new GraphQLError(
          "Entity ID, User ID, and Forum ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Deleting forum", { entityId, userId, forumId });

      const forum = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq, and }: any) =>
          and(
            eq(discussionForum.id, forumId),
            eq(discussionForum.entityId, entityId),
            eq(discussionForum.userId, userId)
          ),
      });

      if (!forum) {
        throw new GraphQLError("Forum not found or not authorized.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      await db.transaction(async (tx: any) => {
        await tx
          .delete(discussionForumComment)
          .where(eq(discussionForumComment.discussionForumId, forumId));
        await tx
          .delete(discussionVotes)
          .where(eq(discussionVotes.discussionForumId, forumId));
        await tx.delete(discussionForum).where(eq(discussionForum.id, forumId));
        await tx.insert(discussionForumAuditLogs).values({
          reason: "Forum deleted by user",
          discussionForumId: forumId,
          performedBy: userId,
          status: "REMOVE",
          entity: entityId,
          previousState: JSON.stringify(forum),
        });
      });

      log.info("Forum deleted successfully", { entityId, userId, forumId });
      return { id: forumId, message: "Forum deleted successfully" };
    } catch (error) {
      log.error("Error in deleteForum", { error, entityId, userId, forumId });
      throw error;
    }
  }

  static async editDiscussionForum({
    db,
    entityId,
    userId,
    input,
  }: {
    db: any;
    entityId: string;
    userId: string;
    input: any;
  }) {
    try {
      if (!entityId || !userId || !input || !input.id || !input.title) {
        throw new GraphQLError(
          "Entity ID, User ID, Forum ID, and Title are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Editing discussion forum", {
        entityId,
        userId,
        forumId: input.id,
      });

      const isExist = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq, and, ne }: any) =>
          and(
            eq(discussionForum.entityId, entityId),
            eq(discussionForum.title, input.title),
            ne(discussionForum.id, input.id)
          ),
      });

      if (isExist) {
        throw new GraphQLError(
          "Discussion forum with this title already exists.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      const updatedForum = await db
        .update(discussionForum)
        .set({
          ...input,
          slug: generateSlug(input.title),
        })
        .where(
          and(
            eq(discussionForum.id, input.id),
            eq(discussionForum.entityId, entityId)
          )
        )
        .returning();

      await db.insert(discussionForumAuditLogs).values({
        action: "UPDATE",
        reason: input.reason || "Discussion forum edited",
        discussionForumId: input.id,
        performedBy: userId,
        status: "UPDATE",
        entity: entityId,
        previousState: isExist,
      });

      log.info("Discussion forum edited", {
        entityId,
        userId,
        forumId: input.id,
      });
      return updatedForum[0];
    } catch (error) {
      log.error("Error in editDiscussionForum", {
        error,
        entityId,
        userId,
        forumId: input?.id,
      });
      throw error;
    }
  }

  static async postDiscussionForumComments({
    db,
    userId,
    discussionForumId,
    content,
  }: {
    db: any;
    userId: string;
    discussionForumId: string;
    content: string;
  }) {
    try {
      if (!userId || !discussionForumId || !content) {
        throw new GraphQLError(
          "User ID, Discussion Forum ID, and Content are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Posting discussion forum comment", {
        userId,
        discussionForumId,
      });

      const forum = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq }: any) =>
          eq(discussionForum.id, discussionForumId),
      });

      if (!forum) {
        throw new GraphQLError("Discussion forum not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const newComment = await db.transaction(async (tx: any) => {
        const inserted = await tx
          .insert(discussionForumComment)
          .values({
            discussionForumId,
            content,
            userId,
            commentedBy: "USER",
          })
          .returning();

        await tx
          .update(discussionForum)
          .set({
            totalComments: forum.totalComments + 1,
          })
          .where(eq(discussionForum.id, discussionForumId));

        return inserted;
      });

      const comment = await db.query.discussionForumComment.findFirst({
        where: (discussionForumComment: any, { eq, and }: any) =>
          and(eq(discussionForumComment.id, newComment[0].id)),
        orderBy: (discussionForumComment: any, { desc }: any) =>
          desc(discussionForumComment.createdAt),
        with: {
          user: true,
        },
      });

      log.info("Discussion forum comment posted", {
        userId,
        discussionForumId,
        commentId: comment.id,
      });

      // Gamification Trigger
      const [forumData] = await db
        .select({ entityId: discussionForum.entityId })
        .from(discussionForum)
        .where(eq(discussionForum.id, discussionForumId))
        .limit(1);

      if (forumData) {
        await GamificationEventService.triggerEvent({
          triggerId: "tr-forum-comment",
          moduleId: "forums",
          userId,
          entityId: forumData.entityId,
        });
      }

      return comment;
    } catch (error) {
      log.error("Error in postDiscussionForumComments", {
        error,
        userId,
        discussionForumId,
      });
      throw error;
    }
  }

  static async deleteDiscussionForumComments({
    db,
    entityId,
    performedBy,
    discussionForumId,
    commentId,
    reason,
  }: {
    db: any;
    entityId: string;
    performedBy: string;
    discussionForumId: string;
    commentId: string;
    reason?: string;
  }) {
    try {
      if (!entityId || !performedBy || !discussionForumId || !commentId) {
        throw new GraphQLError(
          "Entity ID, Performer ID, Discussion Forum ID, and Comment ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Deleting discussion forum comment", {
        entityId,
        performedBy,
        discussionForumId,
        commentId,
      });

      const forum = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq, and }: any) =>
          and(
            eq(discussionForum.id, discussionForumId),
            eq(discussionForum.entityId, entityId)
          ),
      });

      if (!forum) {
        throw new GraphQLError(
          "Discussion forum not found or not authorized.",
          {
            extensions: { code: "NOT_FOUND" },
          }
        );
      }

      const commentToDelete = await db.query.discussionForumComment.findFirst({
        where: (discussionForumComment: any, { eq, and }: any) =>
          and(
            eq(discussionForumComment.id, commentId),
            eq(discussionForumComment.discussionForumId, discussionForumId)
          ),
      });

      if (!commentToDelete) {
        throw new GraphQLError(
          "Comment not found or not authorized to delete.",
          {
            extensions: { code: "NOT_FOUND" },
          }
        );
      }

      await db.transaction(async (tx: any) => {
        await tx
          .delete(discussionForumComment)
          .where(eq(discussionForumComment.id, commentId));
        await tx
          .update(discussionForum)
          .set({
            totalComments:
              forum.totalComments > 0 ? forum.totalComments - 1 : 0,
          })
          .where(eq(discussionForum.id, discussionForumId));
        await tx.insert(discussionForumAuditLogs).values({
          reason: reason || "Comment deleted",
          discussionForumId,
          performedBy,
          status: "REMOVE",
          entity: entityId,
          previousState: commentToDelete.content,
        });
      });

      log.info("Discussion forum comment deleted", {
        entityId,
        performedBy,
        discussionForumId,
        commentId,
      });
      return {
        id: commentId,
        discussionForumId,
      };
    } catch (error) {
      log.error("Error in deleteDiscussionForumComments", {
        error,
        entityId,
        discussionForumId,
        commentId,
      });
      throw error;
    }
  }

  static async upVoteDiscussionForum({
    db,
    userId,
    discussionForumId,
    upVote,
  }: {
    db: any;
    userId: string;
    discussionForumId: string;
    upVote: boolean;
  }) {
    try {
      if (!userId || !discussionForumId) {
        throw new GraphQLError(
          "User ID and Discussion Forum ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Processing upvote", { userId, discussionForumId, upVote });

      const forum = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq }: any) =>
          eq(discussionForum.id, discussionForumId),
      });

      if (!forum) {
        throw new GraphQLError("Discussion forum not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const existingVote = await db.query.discussionVotes.findFirst({
        where: (discussionVotes: any, { eq, and }: any) =>
          and(
            eq(discussionVotes.discussionForumId, discussionForumId),
            eq(discussionVotes.votedBy, "USER"),
            eq(discussionVotes.userId, userId)
          ),
      });

      if (upVote) {
        if (existingVote && existingVote.type === "UPVOTE") {
          log.debug("Already upvoted", { userId, discussionForumId });
          return { message: "Already upvoted" };
        } else if (existingVote) {
          await db.transaction(async (tx: any) => {
            await tx
              .update(discussionVotes)
              .set({ type: "UPVOTE" })
              .where(eq(discussionVotes.id, existingVote.id));
            await tx
              .update(discussionForum)
              .set({
                upVotes: (forum.upVotes || 0) + 1,
                downVotes: forum.downVotes > 0 ? forum.downVotes - 1 : 0,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          log.info("Vote changed to upvote", { userId, discussionForumId });
          return { message: "Vote changed to upvote" };
        } else {
          await db.transaction(async (tx: any) => {
            await tx.insert(discussionVotes).values({
              discussionForumId,
              votedBy: "USER",
              type: "UPVOTE",
              userId: userId,
            });
            await tx
              .update(discussionForum)
              .set({
                upVotes: (forum.upVotes || 0) + 1,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          log.info("Upvoted successfully", { userId, discussionForumId });

          // Gamification Trigger
          if (forum && forum.entityId) {
            await GamificationEventService.triggerEvent({
              triggerId: "tr-forum-vote",
              moduleId: "forums",
              userId,
              entityId: forum.entityId,
            });
          }

          return { message: "Upvoted successfully" };
        }
      } else {
        if (existingVote && existingVote.type === "UPVOTE") {
          await db.transaction(async (tx: any) => {
            await tx
              .delete(discussionVotes)
              .where(eq(discussionVotes.id, existingVote.id));
            await tx
              .update(discussionForum)
              .set({
                upVotes: forum.upVotes > 0 ? forum.upVotes - 1 : 0,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          log.info("Upvote removed", { userId, discussionForumId });
          return { message: "Upvote removed" };
        } else {
          log.debug("No upvote to remove", { userId, discussionForumId });
          return { message: "No upvote to remove" };
        }
      }
    } catch (error) {
      log.error("Error in upVoteDiscussionForum", {
        error,
        userId,
        discussionForumId,
      });
      throw error;
    }
  }

  static async downVoteDiscussionForum({
    db,
    userId,
    discussionForumId,
    downVote,
  }: {
    db: any;
    userId: string;
    discussionForumId: string;
    downVote: boolean;
  }) {
    try {
      if (!userId || !discussionForumId) {
        throw new GraphQLError(
          "User ID and Discussion Forum ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Processing downvote", { userId, discussionForumId, downVote });

      const forum = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq }: any) =>
          eq(discussionForum.id, discussionForumId),
      });

      if (!forum) {
        throw new GraphQLError("Discussion forum not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const existingVote = await db.query.discussionVotes.findFirst({
        where: (discussionVotes: any, { eq, and }: any) =>
          and(
            eq(discussionVotes.discussionForumId, discussionForumId),
            eq(discussionVotes.votedBy, "USER"),
            eq(discussionVotes.userId, userId)
          ),
      });

      if (downVote) {
        if (existingVote && existingVote.type === "DOWNVOTE") {
          log.debug("Already downvoted", { userId, discussionForumId });
          return { message: "Already downvoted" };
        } else if (existingVote) {
          await db.transaction(async (tx: any) => {
            await tx
              .update(discussionVotes)
              .set({ type: "DOWNVOTE" })
              .where(eq(discussionVotes.id, existingVote.id));
            await tx
              .update(discussionForum)
              .set({
                downVotes: (forum.downVotes || 0) + 1,
                upVotes: forum.upVotes > 0 ? forum.upVotes - 1 : 0,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          log.info("Vote changed to downvote", { userId, discussionForumId });
          return { message: "Vote changed to downvote" };
        } else {
          await db.transaction(async (tx: any) => {
            await tx.insert(discussionVotes).values({
              discussionForumId,
              votedBy: "USER",
              type: "DOWNVOTE",
              userId: userId,
            });
            await tx
              .update(discussionForum)
              .set({
                downVotes: (forum.downVotes || 0) + 1,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          log.info("Downvoted successfully", { userId, discussionForumId });
          return { message: "Downvoted successfully" };
        }
      } else {
        if (existingVote && existingVote.type === "DOWNVOTE") {
          await db.transaction(async (tx: any) => {
            await tx
              .delete(discussionVotes)
              .where(eq(discussionVotes.id, existingVote.id));
            await tx
              .update(discussionForum)
              .set({
                downVotes: forum.downVotes > 0 ? forum.downVotes - 1 : 0,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          log.info("Downvote removed", { userId, discussionForumId });
          return { message: "Downvote removed" };
        } else {
          log.debug("No downvote to remove", { userId, discussionForumId });
          return { message: "No downvote to remove" };
        }
      }
    } catch (error) {
      log.error("Error in downVoteDiscussionForum", {
        error,
        userId,
        discussionForumId,
      });
      throw error;
    }
  }
}
