import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";
import { and, eq } from "drizzle-orm";
import {
  polls,
  pollOptions,
  userFeed,
  pollResults,
  user,
  aboutUser,
} from "@thrico/database";
import { GamificationEventService } from "../gamification/gamification-event.service";
import { NotificationService } from "../notification/notification.service";

export class FeedPollService {
  // Add a new poll
  static async addPoll({
    input,
    userId,
    db,
    entityId,
  }: {
    input: {
      question: string;
      title: string;
      options: Array<{ option: string }>;
      lastDate?: string;
      resultVisibility?: string;
      groupId?: string;
      description?: string;
    };
    userId: string;
    db: any;
    entityId: string;
  }) {
    try {
      const result = await db.transaction(async (tx: any) => {
        // Create the poll
        const newPoll = await tx
          .insert(polls)
          .values({
            question: input.question,
            title: input.title,
            lastDate: input.lastDate || null,
            resultVisibility: input.resultVisibility || "public",
            userId,
            entityId,
          })
          .returning({ id: polls.id });

        const pollId = newPoll[0].id;

        // Create poll options
        if (input.options && input.options.length > 0) {
          const optionValues = input.options.map((opt) => ({
            pollId,
            option: opt.option,
          }));
          await tx.insert(pollOptions).values(optionValues);
        }

        // Create feed post for the poll
        const feed = await tx
          .insert(userFeed)
          .values({
            userId,
            entity: entityId,
            description: input.description || input.question,
            source: "poll",
            pollId,
            groupId: input.groupId || null,
            privacy: "public",
          })
          .returning({ id: userFeed.id });

        // Return the complete poll with options
        return await tx.query.polls.findFirst({
          where: eq(polls.id, pollId),
          with: {
            options: true,
            user: {
              with: {
                about: true,
              },
            },
          },
        });
      });

      // Gamification trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-poll-create",
        moduleId: "polls",
        userId,
        entityId,
      });

      return result;
    } catch (error) {
      log.error("Error adding poll:", { error, userId, entityId });
      throw new GraphQLError("Failed to create poll", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // Get poll by ID for a user
  static async getPollByIdForUser({
    input,
    userId,
    entity,
    db,
  }: {
    input: { pollId: string };
    userId: string;
    entity: string;
    db: any;
  }) {
    try {
      const { pollId } = input;

      const poll = await db.query.polls.findFirst({
        where: (polls: any, { eq, and }: any) => and(eq(polls.id, pollId)),
        with: {
          results: true,
          options: {
            with: {
              results: true,
            },
          },
        },
      });

      if (!poll) {
        throw new GraphQLError("Poll not found or not authorized", {
          extensions: {
            code: "NOT_FOUND",
            http: { status: 404 },
          },
        });
      }

      let isVoted = false;
      let votedOptionId: string | null = null;
      if (poll.results && Array.isArray(poll.results)) {
        const vote = poll.results.find(
          (r: any) => r.userId === userId && r.votedBy === "USER",
        );
        if (vote) {
          isVoted = true;
          votedOptionId = vote.pollOptionId;
        }
      }

      const isOwner = poll.userId === userId;

      // We cannot directly add properties to the poll object if it's strictly typed by Drizzle
      // So we return a new object spreading poll and adding our custom fields
      return {
        ...poll,
        isVoted,
        votedOptionId,
        isOwner,
      };
    } catch (error) {
      log.error("Error getting poll by ID", {
        error,
        userId,
        pollId: input.pollId,
      });
      throw error;
    }
  }

  // Vote on a poll
  static async voteOnPoll({
    input,
    userId,
    entity,
    db,
  }: {
    input: { pollId: string; optionId: string };
    userId: string;
    entity: string;
    db: any;
  }) {
    try {
      const { pollId, optionId } = input;

      const poll = await db.query.polls.findFirst({
        where: (polls: any, { eq, and }: any) => and(eq(polls.id, pollId)),
      });

      if (!poll) {
        throw new GraphQLError("Poll not found or not authorized", {
          extensions: {
            code: "NOT_FOUND",
            http: { status: 404 },
          },
        });
      }

      const option = await db.query.pollOptions.findFirst({
        where: (pollOptions: any, { eq, and }: any) =>
          and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, pollId)),
      });

      if (!option) {
        throw new GraphQLError("Option not found for this poll", {
          extensions: {
            code: "NOT_FOUND",
            http: { status: 404 },
          },
        });
      }

      const existingVote = await db.query.pollResults.findFirst({
        where: (pollResults: any, { eq, and }: any) =>
          and(eq(pollResults.pollId, pollId), eq(pollResults.userId, userId)),
      });

      if (existingVote) {
        throw new GraphQLError("You have already voted on this poll", {
          extensions: {
            code: "FORBIDDEN",
            http: { status: 403 },
          },
        });
      }

      await db.transaction(async (tx: any) => {
        await tx
          .insert(pollResults)
          .values({
            pollId,
            userId,
            pollOptionId: optionId,
            votedBy: "USER",
          })
          .returning();

        await tx
          .update(pollOptions)
          .set({
            votes: option.votes + 1,
          })
          .where(eq(pollOptions.id, optionId));
        await tx
          .update(polls)
          .set({
            totalVotes: poll.totalVotes + 1,
          })
          .where(eq(polls.id, poll.id));
      });

      // Gamification trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-poll-vote",
        moduleId: "polls",
        userId,
        entityId: entity,
      });

      // Send notification to poll owner
      if (poll.userId && poll.userId !== userId) {
        const voter = await db.query.user.findFirst({
          where: eq(user.id, userId),
        });

        if (voter) {
          const content = `${voter.firstName} ${voter.lastName} voted on your poll "${poll.question}"`;

          await NotificationService.createNotification({
            db,
            userId: poll.userId,
            senderId: userId,
            entityId: entity,
            content,
            module: "FEED",
            type: "POLL_VOTE",
            shouldSendPush: true,
            pushTitle: "New Poll Vote",
            pushBody: content,
            imageUrl: voter.avatar || undefined,
          }).catch((err: any) => {
            log.error("Failed to send poll vote notification", {
              pollId,
              error: err.message,
            });
          });

          log.info("Poll vote notification sent", {
            pollOwner: poll.userId,
            voter: userId,
            pollId,
          });
        }
      }

      return {
        pollId,
        optionId,
        voted: true,
      };
    } catch (error) {
      log.error("Error voting on poll", {
        error,
        userId,
        pollId: input.pollId,
        optionId: input.optionId,
      });
      throw error;
    }
  }

  // Get all polls
  static async getAllPolls({
    db,
    offset,
    limit,
    entityId,
    userId,
  }: {
    db: any;
    offset?: number;
    limit?: number;
    entityId: string;
    userId: string;
  }) {
    try {
      const pollsList = await db.query.polls.findMany({
        where: (polls: any, { eq }: any) => eq(polls.entityId, entityId),
        with: {
          results: true,
          user: true,
          options: {
            with: {
              results: true,
            },
          },
        },
        orderBy: (polls: any, { desc }: any) => [desc(polls.createdAt)],
        limit: limit ?? 50,
        offset: offset ?? 0,
      });

      // Add isVoted and votedOptionId for each poll
      const result = pollsList.map((poll: any) => {
        let isVoted = false;
        let votedOptionId: string | null = null;
        if (poll.results && Array.isArray(poll.results)) {
          const vote = poll.results.find(
            (r: any) => r.userId === userId && r.votedBy === "USER",
          );
          if (vote) {
            isVoted = true;
            votedOptionId = vote.pollOptionId;
          }
        }

        return {
          ...poll,
          isVoted,
          votedOptionId,
        };
      });

      return result;
    } catch (error) {
      log.error("Error getting all polls", { error, userId, entityId });
      throw error;
    }
  }
  // Get poll voters
  static async getPollVoters({
    pollId,
    cursor,
    limit = 20,
    db,
  }: {
    pollId: string;
    cursor?: string;
    limit?: number;
    db: any;
  }) {
    try {
      const { lt, desc } = await import("drizzle-orm");

      const where = and(
        eq(pollResults.pollId, pollId),
        eq(pollResults.votedBy, "USER"),
        cursor ? lt(pollResults.createdAt, new Date(cursor)) : undefined,
      );

      const voters = await db
        .select({
          id: pollResults.id,
          votedAt: pollResults.createdAt,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            about: aboutUser,
          },
          votedOption: pollOptions,
        })
        .from(pollResults)
        .innerJoin(user, eq(pollResults.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .innerJoin(pollOptions, eq(pollResults.pollOptionId, pollOptions.id))
        .where(where)
        .orderBy(desc(pollResults.createdAt))
        .limit(limit);

      return {
        data: voters,
        pagination: {
          nextCursor:
            voters.length === limit ? voters[voters.length - 1].votedAt : null,
          hasNextPage: voters.length === limit,
        },
      };
    } catch (error) {
      log.error("Error getting poll voters", { error, pollId });
      throw error;
    }
  }
}
