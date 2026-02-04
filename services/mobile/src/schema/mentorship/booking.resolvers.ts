import checkAuth from "../../utils/auth/checkAuth.utils";
import { MentorshipService } from "@thrico/services";
import { log } from "@thrico/logging";

const bookingResolvers = {
  Query: {
    async checkWebinarPaymentResponse(_: any, { input }: any, context: any) {
      try {
        return MentorshipService.checkWebinarPaymentResponse();
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
    async getServicesDetails(_: any, { input }: any, context: any) {
      try {
        const { db, id } = (await checkAuth(context)) as any;
        return MentorshipService.getServicesDetails({ db, id, input });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
  },
  Mutation: {
    async bookPaidWebinar(_: any, { input }: any, context: any) {
      return MentorshipService.bookPaidWebinar();
    },

    async bookFreeWebinar(_: any, { input }: any, context: any) {
      return MentorshipService.bookFreeWebinar();
    },
  },
};

export { bookingResolvers };
