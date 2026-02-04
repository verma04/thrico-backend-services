import checkAuth from "../../utils/auth/checkAuth.utils";
import { MentorshipService } from "@thrico/services";
import { log } from "@thrico/logging";

const testimonialsResolvers = {
  Query: {
    async getAllMentorTestimonial(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = (await checkAuth(context)) as any;
        return MentorshipService.getAllMentorTestimonial({ db, id, entityId });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
  },
  Mutation: {
    async addMentorShipTestimonials(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = (await checkAuth(context)) as any;
        return MentorshipService.addMentorShipTestimonials({
          db,
          id,
          entityId,
          input,
        });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async duplicateMentorShipTestimonials(
      _: any,
      { input }: any,
      context: any,
    ) {
      return MentorshipService.duplicateMentorShipTestimonials();
    },
  },
};

export { testimonialsResolvers };
