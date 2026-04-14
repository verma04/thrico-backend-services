import { log } from "@thrico/logging";
import { LiveService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const liveResolvers = {
  Query: {
    async getActiveLiveSessions(_: any, { limit = 10, cursor }: any, context: any) {
      try {
        const { db, entityId } = context.user || (await checkAuth(context));
        return await LiveService.getActiveLiveSessions({
          db,
          entityId,
          limit,
          cursor,
        });
      } catch (error) {
        log.error("Error in getActiveLiveSessions", { error });
        throw error;
      }
    },

    async getLiveSession(_: any, { id }: any, context: any) {
      try {
        const { db } = context.user || (await checkAuth(context));
        return await LiveService.getLiveSession({
          db,
          sessionId: id,
        });
      } catch (error) {
        log.error("Error in getLiveSession", { error, sessionId: id });
        throw error;
      }
    },
  },

  Mutation: {
    async startLiveSession(_: any, { title, coverImage }: any, context: any) {
      try {
        const { db, id: hostId, entityId } = context.user || (await checkAuth(context));

        return await LiveService.startLiveSession({
          db,
          hostId,
          entityId,
          title,
          coverImage,
        });
      } catch (error) {
        log.error("Error in startLiveSession", { error });
        throw error;
      }
    },

    async endLiveSession(_: any, { id }: any, context: any) {
      try {
        const { db, id: hostId } = context.user || (await checkAuth(context));
        const updated = await LiveService.endLiveSession({
          db,
          sessionId: id,
          hostId,
        });
        return {
          success: !!updated,
          message: updated ? "Live session ended" : "Live session not found or already ended",
        };
      } catch (error) {
        log.error("Error in endLiveSession", { error, sessionId: id });
        throw error;
      }
    },
  },
};
