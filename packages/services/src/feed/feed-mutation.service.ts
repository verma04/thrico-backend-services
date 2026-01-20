import { GraphQLError } from "graphql";
import { and, eq } from "drizzle-orm";
import {
  feedComment,
  feedReactions,
  feedWishList,
  userFeed,
  media,
  polls,
  pollOptions,
  pollsAuditLogs,
} from "@thrico/database";
import { GamificationEventService } from "../gamification/gamification-event.service";
import type { FeedInput } from "./types";
import { log } from "@thrico/logging";

import { uploadFeedImage } from "./upload.utils";
import { FeedPollService } from "./feed-poll.service";
import { ForumService } from "../forum/forum.service";
import { CelebrationService } from "../celebration/celebration.service";
import { upload } from "../upload";
import uploadVideo from "./uploadVideo";

const uploadVideoPlaceholder = async (video: any) => {
  log.warn(
    "uploadVideo is a placeholder. Please implement actual video upload logic."
  );
  return null as {
    filename: string;
    url: string;
    size: number;
    mimetype: string;
  } | null;
};

export class FeedMutationService {
  // Add new feed

  static async addPoll({
    poll,
    db,
    entityId,
    userId,
  }: {
    poll: NonNullable<FeedInput["poll"]>;
    db: any;
    entityId: string;
    userId: string;
  }) {
    try {
      // Insert the poll, options, and feed in a transaction
      let newPoll: any;
      let insertedOptions: any[] = [];
      await db.transaction(async (tx: any) => {
        // Insert the poll
        [newPoll] = await tx
          .insert(polls)
          .values({
            entityId,
            title: poll.title,
            question: poll.question,
            endDate: poll.lastDate ? new Date(poll.lastDate) : null,
            resultVisibility: poll.resultVisibility,
            addedBy: "ENTITY",
            userId,
          })
          .returning();

        // Insert poll options
        insertedOptions = [];
        if (Array.isArray(poll.options) && poll.options.length > 0) {
          insertedOptions = await Promise.all(
            poll.options.map((option: any, idx: number) =>
              tx
                .insert(pollOptions)
                .values({
                  pollId: newPoll.id,
                  text: option?.option,
                  order: idx,
                })
                .returning()
                .then((rows: any[]) => rows[0])
            )
          );
        }

        // Insert audit log
        await tx.insert(pollsAuditLogs).values({
          pollsId: newPoll.id,
          status: "ADD",
          performedBy: userId,
          reason: "Poll created",
          previousState: null,
          newState: {
            ...newPoll,
            options: insertedOptions,
          },
          entity: entityId,
        });
      });

      // Gamification trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-poll-create",
        moduleId: "polls",
        userId,
        entityId,
      });

      return {
        ...newPoll,
        options: insertedOptions,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  static async addFeed({
    input,
    userId,
    db,
    entityId,
    postedOn,
  }: {
    input: FeedInput;
    userId: string;
    db: any;
    entityId: string;
    postedOn?: "community" | null;
  }) {
    let feedMedia: { file: string }[] = [];
    let videoUrl:
      | { filename: string; url: string; size: number; mimetype: string }
      | null
      | undefined;
    let thumbnailUrl: string | null | undefined;

    // Handle media uploads
    if (input?.media) {
      feedMedia = await uploadFeedImage(entityId, input?.media);
    }
    if (input?.thumbnail) {
      thumbnailUrl = await upload(input?.thumbnail);
    }
    if (input?.video) {
      videoUrl = await uploadVideo(input?.video);
    }

    try {
      const feed = await db.transaction(async (tx: any) => {
        let poll: any = null;
        let forum: any = null;
        let celebration: any = null;
        if (input?.poll) {
          poll = await this.addPoll({
            poll: input.poll,
            db: tx,
            entityId,
            userId,
          });
        }
        if (input?.celebration) {
          celebration = await CelebrationService.addCelebration({
            entityId,
            db,
            input: {
              title: input.celebration.type || "",
              celebrationType: input.celebration.type || "",
              description: input.description || "",
              userId,
              cover: input.celebration.image || null,
            },
          });
        }
        // Insert feed
        const newFeed = await tx
          .insert(userFeed)
          .values({
            userId,
            entity: entityId,
            description: input?.description,
            source: input?.source || "dashboard",
            privacy: input.privacy,
            groupId: input.groupId || null,
            postedOn: postedOn || null,
            pollId: poll?.id || null,
            forumId: forum?.id || null,
            celebrationId: celebration?.id || null,
            videoUrl: videoUrl?.url || null,
            thumbnailUrl: thumbnailUrl || null,
          })
          .returning({ id: userFeed.id });

        // Insert media
        if (feedMedia.length > 0) {
          const values = feedMedia.map((set) => ({
            feedId: newFeed[0]?.id,
            url: set.file,
            entity: entityId,
            user: userId,
          }));
          await tx.insert(media).values(values);
        }

        return await tx.query.userFeed.findFirst({
          where: eq(userFeed.id, newFeed[0].id),
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        });
      });

      await GamificationEventService.triggerEvent({
        triggerId: "tr-feed-create",
        moduleId: "feed",
        userId,
        entityId,
      });

      return feed;
    } catch (error) {
      log.error("Error in addFeed", { error, userId, input });
      throw error;
    }
  }

  // Like/unlike feed
  static async likeFeed({
    currentUserId,
    input,
    entity,
    db,
  }: {
    currentUserId: string;
    input: { id: string };
    entity: string;
    db: any;
  }) {
    const feed = await db.query.userFeed.findFirst({
      where: eq(userFeed.id, input.id),
    });

    if (!feed) {
      throw new GraphQLError("Feed not found", {
        extensions: { code: 400, http: { status: 400 } },
      });
    }

    const existingReaction = await db.query.feedReactions.findFirst({
      where: and(
        eq(feedReactions.feedId, input.id),
        eq(feedReactions.userId, currentUserId)
      ),
    });

    if (!existingReaction) {
      await db.transaction(async (tx: any) => {
        await tx.insert(feedReactions).values({
          feedId: input.id,
          userId: currentUserId,
          reactionsType: "love",
        });

        await tx
          .update(userFeed)
          .set({ totalReactions: feed.totalReactions + 1 })
          .where(eq(userFeed.id, feed.id));
      });

      // Gamification trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-feed-like",
        moduleId: "feed",
        userId: currentUserId,
        entityId: entity,
      });

      return { status: true };
    } else {
      await db.transaction(async (tx: any) => {
        await tx
          .delete(feedReactions)
          .where(
            and(
              eq(feedReactions.feedId, input.id),
              eq(feedReactions.userId, currentUserId)
            )
          );

        await tx
          .update(userFeed)
          .set({ totalReactions: feed.totalReactions - 1 })
          .where(eq(userFeed.id, feed.id));
      });

      return { status: false };
    }
  }

  // Add comment
  static async addComment({
    currentUserId,
    input,
    entity,
    db,
  }: {
    currentUserId: string;
    input: { feedID: string; comment: string };
    entity: string;
    db: any;
  }) {
    const feed = await db.query.userFeed.findFirst({
      where: eq(userFeed.id, input.feedID),
    });

    if (!feed) {
      throw new GraphQLError("Feed not found", {
        extensions: { code: 400, http: { status: 400 } },
      });
    }

    const newComment = await db.transaction(async (tx: any) => {
      const comment = await tx
        .insert(feedComment)
        .values({
          content: input.comment,
          user: currentUserId,
          feedId: input.feedID,
        })
        .returning();

      await tx
        .update(userFeed)
        .set({ totalComment: feed.totalComment + 1 })
        .where(eq(userFeed.id, feed.id));

      return comment;
    });

    // Gamification trigger
    await GamificationEventService.triggerEvent({
      triggerId: "tr-feed-comment",
      moduleId: "feed",
      userId: currentUserId,
      entityId: entity,
    });

    return await db.query.feedComment.findFirst({
      where: eq(feedComment.id, newComment[0].id),
      with: {
        user: {
          with: {
            about: true,
          },
        },
      },
    });
  }

  // Delete feed
  static async deleteFeed({
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
      throw new GraphQLError("Feed not found", {
        extensions: { code: "NOT_FOUND", http: { status: 404 } },
      });
    }

    if (feed.userId !== currentUserId) {
      throw new GraphQLError("Permission denied", {
        extensions: { code: "FORBIDDEN", http: { status: 403 } },
      });
    }

    await db.transaction(async (tx: any) => {
      await tx.delete(media).where(eq(media.feedId, feedId));
      await tx.delete(feedReactions).where(eq(feedReactions.feedId, feedId));
      await tx.delete(feedComment).where(eq(feedComment.feedId, feedId));
      await tx.delete(feedWishList).where(eq(feedWishList.feedId, feedId));
      await tx.delete(userFeed).where(eq(userFeed.id, feedId));
    });

    return {
      success: true,
      message: "Feed deleted successfully",
      deletedFeedId: feedId,
    };
  }

  // Delete comment feed
  static async deleteCommentFeed({
    feedId,
    commentId,
    currentUserId,
    db,
  }: {
    feedId: string;
    commentId: string;
    currentUserId: string;
    db: any;
  }) {
    const feed = await db.query.userFeed.findFirst({
      where: and(eq(userFeed.id, feedId)),
    });
    if (!feed) {
      throw new GraphQLError("Action not Allowed", {
        extensions: {
          code: 400,
          http: { status: 400 },
        },
      });
    }

    const comment = await db.query.feedComment.findFirst({
      where: and(
        eq(feedComment.id, commentId),
        eq(feedComment.user, currentUserId)
      ),
    });

    if (comment) {
      await db.delete(feedComment).where(eq(feedComment.id, comment.id));
      return {
        id: comment.id,
      };
    } else {
      // Check if it is admin (feed owner)
      const feedOwner = await db.query.userFeed.findFirst({
        where: and(eq(userFeed.id, feedId), eq(userFeed.userId, currentUserId)),
      });
      if (feedOwner) {
        await db.delete(feedComment).where(eq(feedComment.id, commentId));
        return {
          id: commentId,
        };
      }
      throw new GraphQLError("Permission denied", {
        extensions: { code: "FORBIDDEN", http: { status: 403 } },
      });
    }
  }

  // Edit feed
  static async editFeed({
    feedId,
    currentUserId,
    input,
    db,
  }: {
    feedId: string;
    currentUserId: string;
    input: {
      description?: string;
      privacy?: string;
    };
    db: any;
  }) {
    const feed = await db.query.userFeed.findFirst({
      where: eq(userFeed.id, feedId),
    });

    if (!feed) {
      throw new GraphQLError("Feed not found", {
        extensions: { code: "NOT_FOUND", http: { status: 404 } },
      });
    }

    if (feed.userId !== currentUserId) {
      throw new GraphQLError("Permission denied", {
        extensions: { code: "FORBIDDEN", http: { status: 403 } },
      });
    }

    const updated = await db
      .update(userFeed)
      .set({
        description: input.description,
        privacy: input.privacy,
      })
      .where(eq(userFeed.id, feedId))
      .returning();

    return await db.query.userFeed.findFirst({
      where: eq(userFeed.id, feedId),
      with: {
        user: {
          with: {
            about: true,
          },
        },
      },
    });
  }

  // Wishlist feed
  static async wishListFeed({
    currentUserId,
    input,
    entityId,
    db,
  }: {
    currentUserId: string;
    input: { id: string };
    entityId: string;
    db: any;
  }) {
    const feed = await db.query.userFeed.findFirst({
      where: eq(userFeed.id, input.id),
    });

    if (!feed) {
      throw new GraphQLError("Feed not found", {
        extensions: { code: 400, http: { status: 400 } },
      });
    }

    const existingWishList = await db.query.feedWishList.findFirst({
      where: and(
        eq(feedWishList.feedId, input.id),
        eq(feedWishList.userId, currentUserId)
      ),
    });

    if (!existingWishList) {
      await db.insert(feedWishList).values({
        feedId: input.id,
        userId: currentUserId,
      });

      return { status: true, message: "Added to wishlist" };
    } else {
      await db
        .delete(feedWishList)
        .where(
          and(
            eq(feedWishList.feedId, input.id),
            eq(feedWishList.userId, currentUserId)
          )
        );

      return { status: false, message: "Removed from wishlist" };
    }
  }
}
