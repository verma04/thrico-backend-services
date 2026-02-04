import { EventTeamService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

const eventTeamResolvers = {
  Query: {
    async getTeamMemberRole(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const eventTeamService = new EventTeamService(db);
        // input: { eventId, userId }
        const role = await eventTeamService.getMemberRole(
          input.eventId,
          input.userId,
        );
        return { role };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async searchConnectionsForEventTeam(_: any, { input }: any, context: any) {
      try {
        const { db, id: currentUserId, entityId } = await checkAuth(context);
        const eventTeamService = new EventTeamService(db);
        const result = await eventTeamService.searchConnectionsForEventTeam({
          currentUserId,
          entityId,
          eventId: input.eventId,
          limit: input.limit,
          offset: input.offset,
          search: input.search,
        });
        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { eventTeamResolvers };
