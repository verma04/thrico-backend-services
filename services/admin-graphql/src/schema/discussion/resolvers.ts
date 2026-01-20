import { and, eq } from "drizzle-orm";
import { GraphQLError } from "graphql";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  discussionCategory,
  discussionForumComment,
  discussionForum,
  discussionVotes,
  discussionForumAuditLogs,
  forumVerification,
} from "@thrico/database";
import generateSlug from "../../utils/slug.utils";

export const discussionResolvers = {
  Query: {
    async getDiscussionForumCategory(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const { status } = input; // status: "ALL" | "ACTIVE" | "INACTIVE"
        console.log(status);

        let whereClause;
        if (status === "ACTIVE") {
          whereClause = (discussionCategory: any, { eq }: any) =>
            and(
              eq(discussionCategory.entity, entity),
              eq(discussionCategory.isActive, true)
            );
        } else if (status === "INACTIVE") {
          whereClause = (discussionCategory: any, { eq }: any) =>
            and(
              eq(discussionCategory.entity, entity),
              eq(discussionCategory.isActive, false)
            );
        } else {
          // ALL
          whereClause = (discussionCategory: any, { eq }: any) =>
            eq(discussionCategory.entity, entity);
        }

        const category = await db.query.discussionCategory.findMany({
          where: whereClause,
          orderBy: (discussionCategory: any, { desc }: any) =>
            desc(discussionCategory.updatedAt),
        });

        return category;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getDiscussionForum(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { status } = input;

        let whereClause;
        if (status === "APPROVED") {
          whereClause = (discussionForum: any, { eq }: any) =>
            and(
              eq(discussionForum.entityId, entity),
              eq(discussionForum.status, "APPROVED")
            );
        } else if (status === "PENDING") {
          whereClause = (discussionForum: any, { eq }: any) =>
            and(
              eq(discussionForum.entityId, entity),
              eq(discussionForum.status, "PENDING")
            );
        } else if (status === "REJECTED") {
          whereClause = (discussionForum: any, { eq }: any) =>
            and(
              eq(discussionForum.entityId, entity),
              eq(discussionForum.status, "REJECTED")
            );
        } else if (status === "DISABLED") {
          whereClause = (discussionForum: any, { eq }: any) =>
            and(
              eq(discussionForum.entityId, entity),
              eq(discussionForum.status, "DISABLED")
            );
        } else {
          // ALL
          whereClause = (discussionForum: any, { eq }: any) =>
            eq(discussionForum.entityId, entity);
        }

        const forums = await db.query.discussionForum.findMany({
          where: whereClause,
          with: {
            verification: true,
            category: true,
            discussionForumVotes: true,
          },
          orderBy: (discussionForum: any, { desc }: any) =>
            desc(discussionForum.updatedAt),
        });

        return forums.map((set: any) => {
          const yourVote = Array.isArray(set.discussionForumVotes)
            ? set.discussionForumVotes.find(
                (vote: any) => vote?.votedBy === "ENTITY"
              )
            : set.discussionForumVotes &&
              (set.discussionForumVotes as any).votedBy === "ENTITY"
            ? set.discussionForumVotes
            : undefined;

          return {
            ...set,
            isLikeByYou: !!yourVote,
            voteType: yourVote?.type,
          };
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getDiscussionForumDetailsByID(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { discussionForumId } = input;

        // Fetch the forum details with related data
        const forum = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq, and }: any) =>
            and(
              eq(discussionForum.id, discussionForumId),
              eq(discussionForum.entityId, entity)
            ),
          with: {
            verification: true,
            category: true,
            discussionForumVotes: true,
          },
        });

        if (!forum) {
          throw new GraphQLError("Discussion Forum not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        // Find the current entity's vote if any
        const yourVote = Array.isArray(forum.discussionForumVotes)
          ? forum.discussionForumVotes.find(
              (vote: any) => vote?.votedBy === "ENTITY"
            )
          : forum.discussionForumVotes &&
            (forum.discussionForumVotes as any).votedBy === "ENTITY"
          ? forum.discussionForumVotes
          : undefined;

        return {
          ...forum,
          isLikeByYou: !!yourVote,
          voteType: yourVote?.type,
        };
      } catch (error) {
        console.error(error);
        throw error;
      }
    },

    async getDiscussionForumComments(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const { id } = input;

        const comments = await db.query.discussionForumComment.findMany({
          where: (discussionForumComment: any, { eq }: any) =>
            eq(discussionForumComment.discussionForumId, id),
          orderBy: (discussionForumComment: any, { desc }: any) =>
            desc(discussionForumComment.createdAt),
        });

        return comments;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async changeDiscussionForumStatus(_: any, { input }: any, context: any) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, discussionForumId } = input;

      try {
        const user = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq }: any) =>
            eq(discussionForum.id, discussionForumId),
        });

        if (!user) {
          throw new Error("Discussion forum not found");
        }

        // Action → Status mapping
        const statusMap: Record<string, string> = {
          APPROVE: "APPROVED",
          DISABLE: "DISABLED",
          ENABLE: "ENABLED",
          REJECT: "REJECTED",
          REAPPROVE: "REAPPROVE",
        };

        const newStatus = statusMap[action];
        if (!newStatus) {
          // If action is valid but not in map directly?
          // Fallback or throw?
        }

        const forumData: Record<string, any> = {
          status: newStatus || user.status,
        };
        if (
          action === "APPROVE" ||
          action === "UNBLOCK" ||
          action === "ENABLE" ||
          action === "REAPPROVE"
        ) {
          forumData.isApproved = true;
          forumData.status = "APPROVED";
        }

        await db.transaction(async (tx: any) => {
          await tx
            .update(discussionForum)
            .set(forumData)
            .where(eq(discussionForum.id, discussionForumId));

          await tx.insert(discussionForumAuditLogs).values({
            reason,
            discussionForumId: discussionForumId,
            performedBy: id,
            status: "STATUS",
            entity,
            previousState: user.status,
          });
        });

        const result = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq }: any) =>
            eq(discussionForum.id, discussionForumId),
          with: {
            verification: true,
          },
        });

        return result;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },

    async changeDiscussionForumVerification(
      _: any,
      { input }: any,
      context: any
    ) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, discussionForumId } = input;

      try {
        const forum = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq }: any) =>
            eq(discussionForum.id, discussionForumId),
          with: {
            verification: true,
          },
        });
        if (!forum) {
          throw new Error("Forum not found");
        }
        if (action === "VERIFY") {
          await db.transaction(async (tx: any) => {
            // Check if already verified?
            await db.insert(forumVerification).values({
              isVerifiedAt: new Date(),
              verifiedBy: id,
              isVerified: true,
              verificationReason: reason,
              discussionForumId: forum.id,
            });
            await tx.insert(discussionForumAuditLogs).values({
              reason,
              discussionForumId: discussionForumId,
              performedBy: id,
              status: "STATUS",
              entity,
              previousState: forum.status,
            });
          });
        } else {
          await db
            .delete(forumVerification)
            .where(eq(forumVerification.discussionForumId, forum.id));
        }

        const result = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq }: any) =>
            eq(discussionForum.id, discussionForumId),
          with: {
            verification: true,
          },
        });
        return result;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },
    async addDiscussionForum(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        // Check if a discussion forum with the same name already exists for this entity
        const isExist = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq, and }: any) =>
            and(
              eq(discussionForum.entityId, entity),
              eq(discussionForum.title, input.title)
            ),
        });

        const checkAutoApprove = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entity),
        });

        if (isExist) {
          throw new GraphQLError("Discussion forum already exists", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
        }

        const newForum = await db
          .insert(discussionForum)
          .values({
            ...input,
            addedBy: "ENTITY",
            entityId: entity,
            isApproved: false,
            status: checkAutoApprove?.autoApproveDiscussionForum
              ? "APPROVED"
              : "PENDING",
            approvedReason: checkAutoApprove?.autoApproveDiscussionForum
              ? "auto approved by system"
              : "",
            totalVotes: 0,
            slug: generateSlug(input.title),
          })
          .returning();

        return newForum[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editDiscussionForum(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        // Check if a discussion forum with the same title already exists for this entity, excluding the current forum
        const isExist = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq, and, ne }: any) =>
            and(
              eq(discussionForum.entityId, entity),
              eq(discussionForum.title, input.title),
              ne(discussionForum.id, input.id)
            ),
        });

        if (isExist) {
          throw new GraphQLError("Discussion forum already exists", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
        }
        // Update the discussion forum
        const updatedForum = await db
          .update(discussionForum)
          .set({
            ...input,
            slug: generateSlug(input.title),
          })
          .where(
            and(
              eq(discussionForum.id, input.id),
              eq(discussionForum.entityId, entity)
            )
          )
          .returning();

        // Add audit log
        await db.insert(discussionForumAuditLogs).values({
          reason: input.reason || "Discussion forum edited",
          discussionForumId: input.id,
          performedBy: id,
          status: "UPDATE",
          entity,
          previousState: isExist,
        });

        return updatedForum[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async addDiscussionForumCategory(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        console.log(input);
        const isExist = await db.query.discussionCategory.findFirst({
          where: (discussionCategory: any, { eq, and }: any) =>
            and(
              eq(discussionCategory.entity, entity),
              eq(discussionCategory.name, input.name)
            ),
        });
        if (isExist) {
          throw new Error("Discussion category already exists");
        }
        const newCategory = await db
          .insert(discussionCategory)
          .values({
            ...input,
            entity,
            addedBy: id,
            slug: generateSlug(input.name),
          })
          .returning();

        return newCategory[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editDiscussionForumCategory(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        const isExist = await db.query.discussionCategory.findFirst({
          where: (discussionCategory: any, { eq, and, ne }: any) =>
            and(
              eq(discussionCategory.entity, entity),
              eq(discussionCategory.name, input.name),
              ne(discussionCategory.id, input.id)
            ),
        });
        if (isExist) {
          throw new Error("Discussion category already exists");
        }

        const updatedCategory = await db
          .update(discussionCategory)
          .set({
            name: input.name,
            description: input.description,
            isActive: input.isActive,
            slug: generateSlug(input.name),
          })
          .where(
            and(
              eq(discussionCategory.id, input.id),
              eq(discussionCategory.entity, entity)
            )
          )
          .returning();

        return updatedCategory[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async changeStatusDiscussionForumCategory(
      _: any,
      { input }: any,
      context: any
    ) {
      try {
        const { db, entity } = await checkAuth(context);

        const updatedCategory = await db
          .update(discussionCategory)
          .set({
            isActive: input.isActive,
          })
          .where(
            and(
              eq(discussionCategory.id, input.id),
              eq(discussionCategory.entity, entity)
            )
          )
          .returning();

        return updatedCategory[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async postDiscussionForumComments(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const { discussionForumId, content } = input;

        const forum = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq }: any) =>
            eq(discussionForum.id, discussionForumId),
        });

        if (!forum) {
          throw new Error("Forum not found");
        }

        const newComment = await db.transaction(async (tx: any) => {
          // Insert the new comment
          const inserted = await tx
            .insert(discussionForumComment)
            .values({
              discussionForumId,
              content,
              commentedBy: "ENTITY",
            })
            .returning();

          // Update the parent discussion forum's comment count (+1)
          await tx
            .update(discussionForum)
            .set({
              totalComments: (forum.totalComments || 0) + 1,
            })
            .where(eq(discussionForum.id, discussionForumId));

          return inserted;
        });

        return newComment[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteDiscussionForumComments(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: performedBy } = await checkAuth(context);
        const { discussionForumId, commentId, reason } = input;

        // Check if the forum exists and belongs to the entity
        const forum = await db.query.discussionForum.findFirst({
          where: (discussionForum: any, { eq, and }: any) =>
            and(
              eq(discussionForum.id, discussionForumId),
              eq(discussionForum.entityId, entity)
            ),
        });
        if (!forum) {
          throw new Error("Discussion forum not found or not authorized");
        }

        // Find the comment to delete
        const commentToDelete = await db.query.discussionForumComment.findFirst(
          {
            where: (discussionForumComment: any, { eq, and }: any) =>
              and(
                eq(discussionForumComment.id, commentId),
                eq(discussionForumComment.discussionForumId, discussionForumId)
              ),
          }
        );

        if (!commentToDelete) {
          throw new Error("Comment not found or not authorized to delete");
        }

        // Delete the comment and update the comment count atomically, add audit log
        const [deletedComment] = await db.transaction(async (tx: any) => {
          const deleted = await tx
            .delete(discussionForumComment)
            .where(eq(discussionForumComment.id, commentId))
            .returning();

          await tx
            .update(discussionForum)
            .set({
              totalComments:
                (forum?.totalComments ?? 0) > 0
                  ? (forum?.totalComments ?? 0) - 1
                  : 0,
            })
            .where(eq(discussionForum.id, discussionForumId));

          await tx.insert(discussionForumAuditLogs).values({
            reason: reason || "Comment deleted",
            discussionForumId,
            performedBy,
            status: "REMOVE",
            entity,
            previousState: commentToDelete.content,
          });

          return deleted;
        });

        return {
          message: "Deleted",
        };
      } catch (error) {
        console.error(error);
        throw error;
      }
    },

    async upVoteDiscussionForum(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      const { discussionForumId, upVote } = input;

      const forum = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq }: any) =>
          eq(discussionForum.id, discussionForumId),
      });

      if (!forum) {
        throw new Error("Forum not found");
      }

      const existingVote = await db.query.discussionVotes.findFirst({
        where: (discussionVotes: any, { eq, and }: any) =>
          and(
            eq(discussionVotes.discussionForumId, discussionForumId),
            eq(discussionVotes.votedBy, "ENTITY")
          ),
      });

      if (upVote) {
        if (existingVote && existingVote.type === "UPVOTE") {
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
                downVotes:
                  (forum.downVotes ?? 0) > 0 ? (forum.downVotes ?? 0) - 1 : 0,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          return { message: "Vote changed to upvote" };
        } else {
          await db.transaction(async (tx: any) => {
            await tx.insert(discussionVotes).values({
              discussionForumId,
              votedBy: "ENTITY",
              type: "UPVOTE",
            });

            await tx
              .update(discussionForum)
              .set({
                upVotes: (forum.upVotes || 0) + 1,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });

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
                upVotes:
                  (forum.upVotes ?? 0) > 0 ? (forum.upVotes ?? 0) - 1 : 0,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          return { message: "Upvote removed" };
        } else {
          return { message: "No upvote to remove" };
        }
      }
    },

    async downVoteDiscussionForum(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      const { discussionForumId, downVote } = input;

      const forum = await db.query.discussionForum.findFirst({
        where: (discussionForum: any, { eq }: any) =>
          eq(discussionForum.id, discussionForumId),
      });

      if (!forum) {
        throw new Error("Forum not found");
      }

      const existingVote = await db.query.discussionVotes.findFirst({
        where: (discussionVotes: any, { eq, and }: any) =>
          and(
            eq(discussionVotes.discussionForumId, discussionForumId),
            eq(discussionVotes.votedBy, "ENTITY")
          ),
      });

      if (downVote) {
        if (existingVote && existingVote.type === "DOWNVOTE") {
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
                upVotes:
                  (forum.upVotes ?? 0) > 0 ? (forum.upVotes ?? 0) - 1 : 0,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          return { message: "Vote changed to downvote" };
        } else {
          await db.transaction(async (tx: any) => {
            await tx.insert(discussionVotes).values({
              discussionForumId,
              votedBy: "ENTITY",
              type: "DOWNVOTE",
            });

            await tx
              .update(discussionForum)
              .set({
                downVotes: (forum.downVotes || 0) + 1,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });

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
                downVotes:
                  (forum?.downVotes ?? 0) > 0 ? (forum.downVotes ?? 0) - 1 : 0,
              })
              .where(eq(discussionForum.id, discussionForumId));
          });
          return { message: "Downvote removed" };
        } else {
          return { message: "No downvote to remove" };
        }
      }
    },
  },
};
