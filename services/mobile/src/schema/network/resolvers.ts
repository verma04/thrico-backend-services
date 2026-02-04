import checkAuth from "../../utils/auth/checkAuth.utils";
import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { NetworkService } from "@thrico/services";

export const networkResolvers = {
  Query: {
    async getNetwork(_: any, { input }: any, context: any) {
      try {
        const { id, db, entityId } = await checkAuth(context);

        const data = await NetworkService.getNetwork({
          db,
          currentUserId: id,
          entityId,
          limit: input?.limit || 10,
          offset: input?.offset || 0,
          search: input?.search || "",
        });

        console.log(data);
        return data;
      } catch (error: any) {
        log.error("Error in getNetwork", { error, input });
        throw error;
      }
    },

    async getMyConnection(_: any, { input }: any, context: any) {
      try {
        const { id, db, entityId } = await checkAuth(context);

        return await NetworkService.getMyConnections({
          db,
          currentUserId: id,
          entityId,
          limit: input?.limit || 10,
          offset: input?.offset || 0,
          search: input?.search || "",
        });
      } catch (error: any) {
        log.error("Error in getMyConnection", { error, input });
        throw error;
      }
    },

    async getNetworkUserProfile(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = await checkAuth(context);

        return await NetworkService.getNetworkUserProfile({
          db,
          currentUserId: id,
          entityId,
          id: input.id,
        });
      } catch (error: any) {
        log.error("Error in getNetworkUserProfile", { error, input });
        throw error;
      }
    },

    async getUserProfile(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = await checkAuth(context);

        return await NetworkService.getUserProfile({
          db,
          currentUserId: id,
          entityId,
          userId: input.id,
        });
      } catch (error: any) {
        log.error("Error in getUserProfile", { error, input });
        throw error;
      }
    },

    async getConnectionRequests(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = await checkAuth(context);

        return await NetworkService.getConnectionRequests({
          db,
          currentUserId: id,
          entityId,
          limit: input?.limit || 10,
          offset: input?.offset || 0,
          search: input?.search || "",
        });
      } catch (error: any) {
        log.error("Error in getConnectionRequests", { error, input });
        throw error;
      }
    },

    async getConnectionStats(_: any, {}: any, context: any) {
      try {
        const { db, id, entityId } = await checkAuth(context);

        return await NetworkService.getConnectionStats({
          db,
          currentUserId: id,
          entityId,
        });
      } catch (error: any) {
        log.error("Error in getConnectionStats", { error });
        throw error;
      }
    },

    async getBlockedUsers(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = await checkAuth(context);

        const blockedUsers = await NetworkService.getBlockedUsers({
          db,
          currentUserId: id,
          entityId,
          limit: input?.limit || 10,
          offset: input?.offset || 0,
        });

        return blockedUsers;
      } catch (error: any) {
        log.error("Error in getBlockedUsers", { error, input });
        throw error;
      }
    },
  },

  Mutation: {
    async connectAsConnection(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = await checkAuth(context);

        return await NetworkService.connectAsConnection({
          db,
          sender: id,
          receiver: input.id,
          entity: entityId,
          id: input.id,
        });
      } catch (error: any) {
        log.error("Error in connectAsConnection", { error, input });
        throw new GraphQLError(
          error.message || "Failed to send connection request",
          {
            extensions: {
              code: 400,
              http: { status: 400 },
            },
          },
        );
      }
    },

    async acceptConnection(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        return await NetworkService.acceptConnection({
          db,
          sender: input.id,
          receiver: id,
          entity: entityId,
          id: input.id,
        });
      } catch (error: any) {
        log.error("Error in acceptConnection", { error, input });
        throw new GraphQLError(error.message || "Failed to accept connection", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
    },

    async rejectConnection(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        return await NetworkService.rejectConnection({
          db,
          sender: input.id,
          receiver: id,
          entity: entityId,
          id: input.id,
        });
      } catch (error: any) {
        log.error("Error in rejectConnection", { error, input });
        throw new GraphQLError(error.message || "Failed to reject connection", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
    },

    async withdrawConnection(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        return await NetworkService.withdrawConnection({
          db,
          sender: id,
          receiver: input.id,
          entity: entityId,
          id: input.id,
        });
      } catch (error: any) {
        log.error("Error in withdrawConnection", { error, input });
        throw new GraphQLError(
          error.message || "Failed to withdraw connection",
          {
            extensions: {
              code: 400,
              http: { status: 400 },
            },
          },
        );
      }
    },

    async removeConnection(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        return await NetworkService.removeConnection({
          db,
          currentUserId: id,
          targetUserId: input.id,
          entity: entityId,
          id: input.id,
        });
      } catch (error: any) {
        log.error("Error in removeConnection", { error, input });
        throw new GraphQLError(error.message || "Failed to remove connection", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
    },

    async reportProfile(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        return await NetworkService.reportProfile({
          db,
          reporterId: id,
          reportedUserId: input.userId,
          entityId,
          reason: input.reason,
          description: input.description,
        });
      } catch (error: any) {
        log.error("Error in reportProfile", { error, input });
        throw new GraphQLError(error.message || "Failed to report profile", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
    },

    async blockUser(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        return await NetworkService.blockUser({
          db,
          blockerId: id,
          blockedUserId: input.userId,
          entityId,
        });
      } catch (error: any) {
        log.error("Error in blockUser", { error, input });
        throw new GraphQLError(error.message || "Failed to block user", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
    },

    async unblockUser(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        const result = await NetworkService.unblockUser({
          db,
          blockerId: id,
          blockedUserId: input.userId,
          entityId,
        });

        return {
          success: result.success,
          message: result.message,
          id: result.id,
        };
      } catch (error: any) {
        log.error("Error in unblockUser", { error, input });
        throw new GraphQLError(error.message || "Failed to unblock user", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
    },

    async followUser(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        return await NetworkService.followUser({
          db,
          followerId: id,
          followingId: input.userId,
          entityId,
        });
      } catch (error: any) {
        log.error("Error in followUser", { error, input });
        throw new GraphQLError(error.message || "Failed to follow user", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
    },

    async unfollowUser(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        return await NetworkService.unfollowUser({
          db,
          followerId: id,
          followingId: input.userId,
          entityId,
        });
      } catch (error: any) {
        log.error("Error in unfollowUser", { error, input });
        throw new GraphQLError(error.message || "Failed to unfollow user", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
    },
  },
};
