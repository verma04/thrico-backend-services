import checkAuth from "../../utils/auth/checkAuth.utils";
import { MentorshipService } from "@thrico/services";
import { log } from "@thrico/logging";

const mentorResolvers = {
  Query: {
    async getAllApprovedMentor(_: any, {}: any, context: any) {
      try {
        const { db, entityId } = (await checkAuth(context)) as any;
        return MentorshipService.getAllApprovedMentor({ db, entityId });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async getAllMentorServicesByID(_: any, { input }: any, context: any) {
      try {
        const { db } = (await checkAuth(context)) as any;
        return MentorshipService.getAllMentorServicesByID({ db, input });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async getMentorProfileBySlug(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = (await checkAuth(context)) as any;
        return MentorshipService.getMentorProfileBySlug({
          db,
          entityId,
          input,
        });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
  },
  Mutation: {},
};

export { mentorResolvers };
