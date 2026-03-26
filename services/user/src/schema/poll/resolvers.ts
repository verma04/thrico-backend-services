import checkAuth from "../../utils/auth/checkAuth.utils";
import { FeedPollService } from "@thrico/services";
import { log } from "@thrico/logging";

export const pollResolvers = {
  Query: {
    async getPollByIdForUser(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);
        return FeedPollService.getPollByIdForUser({
          input,
          db,
          userId,
          entity: entityId,
        });
      } catch (error) {
        log.error("Error in getPollByIdForUser", { error, input });
        throw error;
      }
    },

    async getAllPolls(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);
        const { offset, limit } = input ?? {};

        return FeedPollService.getAllPolls({
          db,
          userId,
          offset,
          limit,
          entityId,
        });
      } catch (error) {
        log.error("Error in getAllPolls", { error, input });
        throw error;
      }
    },

    async getPollVoters(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return await FeedPollService.getPollVoters({
          pollId: input.pollId,
          cursor: input.cursor,
          limit: input.limit,
          db,
        });
      } catch (error) {
        log.error("Error in getPollVoters", { error, input });
        throw error;
      }
    },
  },

  Mutation: {
    async voteOnPoll(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);
        return await FeedPollService.voteOnPoll({
          db,
          userId,
          entity: entityId,
          input,
        });
      } catch (error) {
        log.error("Error in voteOnPoll", { error, input });
        throw error;
      }
    },

    async editPoll(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);
        return await FeedPollService.editPoll({
          input,
          userId,
          db,
          entityId,
        });
      } catch (error) {
        log.error("Error in editPoll", { error, input });
        throw error;
      }
    },
  },
};
