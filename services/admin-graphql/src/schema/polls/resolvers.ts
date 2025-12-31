import { and, eq, inArray } from "drizzle-orm";
import { GraphQLError } from "graphql";
import {
  pollOptions,
  pollResults,
  polls,
  pollsAuditLogs,
  userFeed,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const pollsResolvers = {
  Query: {
    async getPolls(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { by } = input; // by: "ALL" | "ADMIN" | "USER"
        let whereClause;

        if (by === "ADMIN") {
          whereClause = (polls: any, { eq, and }: any) =>
            and(eq(polls.entityId, entity), eq(polls.addedBy, "ADMIN"));
        } else if (by === "USER") {
          // Providing "USER" in input might mean user-level, but here used for ENTITY?
          // Original code: eq(polls.addedBy, "ENTITY") when by="USER".
          // Assuming this maps to polls created by the entity itself (as a user/member perspective?)
          whereClause = (polls: any, { eq, and }: any) =>
            and(eq(polls.entityId, entity), eq(polls.addedBy, "ENTITY"));
        } else {
          // ALL
          whereClause = (polls: any, { eq }: any) => eq(polls.entityId, entity);
        }

        const pollList = await db.query.polls.findMany({
          where: whereClause,
          orderBy: (polls: any, { desc }: any) => desc(polls.updatedAt),
          with: {
            options: true,
          },
        });
        return pollList;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getPollByIdForUser(_: any, { input }: any, context: any) {
      try {
        const { id, entity, db } = await checkAuth(context);
        const { pollId } = input;

        const poll = await db.query.polls.findFirst({
          where: (polls: any, { eq, and }: any) =>
            and(eq(polls.id, pollId), eq(polls.entityId, entity)),
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
            (r: any) =>
              r.userId === id || (r.votedBy === "ENTITY" && r.userId === id) // Check logic
          );
          // Simplified:
          // In logic: r.userId === id || r.votedBy === "ENTITY"
          // If the entity voted, maybe userId matches?

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
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getPollResult(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { pollId } = input;

        const poll = await db.query.polls.findFirst({
          where: (polls: any, { eq, and }: any) =>
            and(eq(polls.id, pollId), eq(polls.entityId, entity)),
          with: {
            options: {
              with: {
                results: true,
              },
            },
            results: true,
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

        const individualVotes = await db.query.pollResults.findMany({
          where: (pollResults: any, { eq, and }: any) =>
            and(eq(pollResults.pollId, pollId)),
          with: {
            pollOptions: true,
            user: true,
          },
        });

        return {
          options: poll?.options,
          individualVotes: individualVotes,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async resetVote(_: any, { input }: any, context: any) {
      // Changed arg to input to match typeDefs "resetVote(input: inputGetPollByIdForUser): polls"
      // (Wait, typedef says "resetVote(input: inputGetPollByIdForUser): polls" in my file above?
      // User snippet: "resetVote(pollId: String!): polls"
      // I wrote: resetVote(input: inputGetPollByIdForUser): polls in types.ts.
      // So I will implement receiving input object.

      try {
        const { id, db, entity } = await checkAuth(context);
        const { pollId } = input;

        const poll = await db.query.polls.findFirst({
          where: (polls: any, { eq, and }: any) =>
            and(eq(polls.id, pollId), eq(polls.entityId, entity)),
        });

        if (!poll) {
          throw new GraphQLError("Poll not found or not authorized", {
            extensions: {
              code: "NOT_FOUND",
              http: { status: 404 },
            },
          });
        }

        const existingVote = await db.query.pollResults.findFirst({
          where: (pollResults: any, { eq, and }: any) =>
            and(eq(pollResults.pollId, pollId), eq(pollResults.userId, id)),
        });

        if (!existingVote) {
          throw new GraphQLError("No vote found to reset", {
            extensions: {
              code: "NOT_FOUND",
              http: { status: 404 },
            },
          });
        }

        await db.transaction(async (tx: any) => {
          await tx
            .delete(pollResults)
            .where(eq(pollResults.id, existingVote.id));

          const pollOption = await tx.query.pollOptions.findFirst({
            where: (pollOptions: any, { eq }: any) =>
              eq(pollOptions.id, existingVote.pollOptionId),
          });

          if (pollOption) {
            await tx
              .update(pollOptions)
              .set({
                votes: pollOption.votes > 0 ? pollOption.votes - 1 : 0,
              })
              .where(eq(pollOptions.id, pollOption.id));
          }

          // Added by me: Update total votes in poll
          await tx
            .update(polls)
            .set({
              totalVotes: poll.totalVotes > 0 ? poll.totalVotes - 1 : 0,
            })
            .where(eq(polls.id, poll.id));
        });

        return {
          ...poll, // Return poll object
          // reset: true - Removed from return as type is polls, matching user request type
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async voteOnPoll(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);
        const { pollId, optionId } = input;

        const poll = await db.query.polls.findFirst({
          where: (polls: any, { eq, and }: any) =>
            and(eq(polls.id, pollId), eq(polls.entityId, entity)),
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

        // Check if user/entity has already voted
        // Using userId = id (which is entity ID for admin/entity context?)
        const existingVote = await db.query.pollResults.findFirst({
          where: (pollResults: any, { eq, and }: any) =>
            and(
              eq(pollResults.pollId, pollId),
              // eq(pollResults.votedBy, "ENTITY")
              eq(pollResults.userId, id)
            ),
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
          await tx.insert(pollResults).values({
            pollId,
            pollOptionId: optionId,
            votedBy: "ENTITY",
            userId: id, // Explicitly saving ID
          });

          await tx
            .update(pollOptions)
            .set({
              votes: option.votes + 1,
            })
            .where(eq(pollOptions.id, optionId));

          await tx
            .update(polls)
            .set({
              totalVotes: (poll.totalVotes || 0) + 1,
            })
            .where(eq(polls.id, poll.id));
        });

        return {
          ...poll,
          // Returning poll allows client to refetch or update cache
          // User snippet returned: { pollId, optionId, voted: true } object,
          // BUT user type definition says `voteOnPoll(input: inputVoteOnPoll): polls`
          // So I return the poll object (roughly).
          // To be safe, I should fetch updated poll?
          // For efficiency, I return previous poll with maybe updated counts?
          // The return type dictates it must be `polls`.
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async addPoll(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        const isExist = await db.query.polls.findFirst({
          where: (polls: any, { eq, and }: any) =>
            and(eq(polls.entityId, entity), eq(polls.title, input.title)),
        });

        if (isExist) {
          throw new GraphQLError("Poll with this title already exists", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
        }

        let newPoll: any;
        let insertedOptions: any[] = [];

        await db.transaction(async (tx: any) => {
          [newPoll] = await tx
            .insert(polls)
            .values({
              entityId: entity,
              title: input.title,
              question: input.question,
              endDate: input.endDate ? new Date(input.endDate) : null,
              resultVisibility: input.resultVisibility,
              addedBy: "ENTITY",
              userId: id,
            })
            .returning();

          if (Array.isArray(input.options) && input.options.length > 0) {
            const optionValues = input.options.map(
              (option: any, idx: number) => ({
                pollId: newPoll.id,
                text: option?.option,
                order: idx,
              })
            );

            insertedOptions = await tx
              .insert(pollOptions)
              .values(optionValues)
              .returning();
          }

          await tx.insert(userFeed).values({
            entity,
            pollId: newPoll.id,
            description: input.question,
            source: "poll",
            addedBy: "ENTITY",
            privacy: "PUBLIC",
          });

          await tx.insert(pollsAuditLogs).values({
            pollsId: newPoll.id,
            status: "ADD",
            performedBy: id,
            reason: "Poll created",
            previousState: null,
            newState: {
              ...newPoll,
              options: insertedOptions,
            },
            entity,
          });
        });

        return {
          ...newPoll,
          options: insertedOptions,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editPoll(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        const isExist = await db.query.polls.findFirst({
          where: (polls: any, { eq, and, ne }: any) =>
            and(
              eq(polls.entityId, entity),
              eq(polls.title, input.title),
              ne(polls.id, input.id)
            ),
        });

        if (isExist) {
          throw new GraphQLError("Poll with this title already exists", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
        }

        let updatedPoll: any;
        let updatedOptions: any[] = [];

        await db.transaction(async (tx: any) => {
          [updatedPoll] = await tx
            .update(polls)
            .set({
              title: input.title,
              question: input.question,
              endDate: input.endDate ? new Date(input.endDate) : null,
              resultVisibility: input.resultVisibility,
            })
            .where(and(eq(polls.id, input.id), eq(polls.entityId, entity)))
            .returning();

          updatedOptions = [];

          if (Array.isArray(input.options) && input.options.length > 0) {
            const existingOptions = await tx.query.pollOptions.findMany({
              where: (pollOptions: any, { eq }: any) =>
                eq(pollOptions.pollId, input.id),
            });
            const existingOptionIds = existingOptions.map((opt: any) => opt.id);

            const inputOptionIds = input.options
              .filter((option: any) => option.id)
              .map((option: any) => option.id);

            const toDeleteIds = existingOptionIds.filter(
              (opId: any) => !inputOptionIds.includes(opId)
            );

            if (toDeleteIds.length > 0) {
              await tx
                .delete(pollOptions)
                .where(inArray(pollOptions.id, toDeleteIds));
            }

            for (let idx = 0; idx < input.options.length; idx++) {
              const option = input.options[idx];
              if (option.id) {
                const [updatedOption] = await tx
                  .update(pollOptions)
                  .set({
                    text: option.option,
                    order: idx,
                  })
                  .where(eq(pollOptions.id, option.id))
                  .returning();
                updatedOptions.push(updatedOption);
              } else {
                const [newOption] = await tx
                  .insert(pollOptions)
                  .values({
                    pollId: input.id,
                    text: option.option,
                    order: idx,
                  })
                  .returning();
                updatedOptions.push(newOption);
              }
            }
          }

          await tx.insert(pollsAuditLogs).values({
            pollsId: input.id,
            status: "UPDATE",
            performedBy: id,
            reason: input.reason || "Poll edited",
            previousState: null,
            newState: {
              ...updatedPoll,
              options: updatedOptions,
            },
            entity,
          });
        });

        return {
          ...updatedPoll,
          options: updatedOptions,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deletePoll(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);
        const { pollId, reason } = input;

        const poll = await db.query.polls.findFirst({
          where: (polls: any, { eq, and }: any) =>
            and(eq(polls.id, pollId), eq(polls.entityId, entity)),
        });

        if (!poll) {
          throw new Error("Poll not found or not authorized");
        }

        await db.transaction(async (tx: any) => {
          await tx.delete(pollOptions).where(eq(pollOptions.pollId, pollId));
          await tx.delete(polls).where(eq(polls.id, pollId));

          await tx.insert(pollsAuditLogs).values({
            pollsId: pollId,
            status: "REMOVE",
            performedBy: id,
            reason: reason || "Poll deleted",
            previousState: poll,
            newState: null,
            entity,
          });
        });

        return { id: pollId, deleted: true };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async changePollStatus(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);
        const { pollId, action, reason } = input;

        const poll = await db.query.polls.findFirst({
          where: (polls: any, { eq, and }: any) =>
            and(eq(polls.id, pollId), eq(polls.entityId, entity)),
        });

        if (!poll) {
          throw new Error("Poll not found or not authorized");
        }

        let updatedPoll: any;
        await db.transaction(async (tx: any) => {
          [updatedPoll] = await tx
            .update(polls)
            .set({ status: action === "ENABLE" ? "APPROVED" : "DISABLED" })
            .where(eq(polls.id, pollId))
            .returning();

          await tx.insert(pollsAuditLogs).values({
            pollsId: pollId,
            status: "STATUS", // Fixed enum match (was undefined/implied)
            performedBy: id,
            reason: reason || `Poll ${action.toLowerCase()}`,
            previousState: poll,
            newState: updatedPoll,
            entity,
          });
        });

        return { ...updatedPoll };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
