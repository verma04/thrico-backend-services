import checkAuth from "../../utils/auth/checkAuth.utils";
import { MentorshipService } from "@thrico/services";
import { log } from "@thrico/logging";

const servicesResolvers = {
  Query: {
    async getAllMentorServices(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = (await checkAuth(context)) as any;
        return MentorshipService.getAllMentorServices({ db, id, entityId });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async getBookingRequest(_: any, {}: any, context: any) {
      try {
        const { db, id } = (await checkAuth(context)) as any;
        return MentorshipService.getBookingRequest({ db, id });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async getUpcomingBooking(_: any, {}: any, context: any) {
      try {
        const { db, id } = (await checkAuth(context)) as any;
        return MentorshipService.getUpcomingBooking({ db, id });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
    async getCancelledBooking(_: any, {}: any, context: any) {
      try {
        const { db, id } = (await checkAuth(context)) as any;
        return MentorshipService.getCancelledBooking({ db, id });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async getCompletedBooking(_: any, {}: any, context: any) {
      try {
        const { db, id } = (await checkAuth(context)) as any;
        return MentorshipService.getCompletedBooking({ db, id });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
  },
  Mutation: {
    async addMentorShipServices(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } = (await checkAuth(context)) as any;

        return MentorshipService.addMentorshipService({
          userId,
          input,
          db,
          entityId,
        });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async duplicateMentorShipServices(_: any, { input }: any, context: any) {
      return MentorshipService.duplicateMentorShipServices();
    },

    async acceptBookingRequest(_: any, { input }: any, context: any) {
      try {
        const { db } = (await checkAuth(context)) as any;
        return MentorshipService.acceptBookingRequest({ db, input });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async cancelBooking(_: any, { input }: any, context: any) {
      try {
        const { db } = (await checkAuth(context)) as any;
        return MentorshipService.cancelBooking({ db, input });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async markBookingAsCompleted(_: any, { input }: any, context: any) {
      try {
        const { db } = (await checkAuth(context)) as any;
        return MentorshipService.markBookingAsCompleted({ db, input });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
  },
};

export { servicesResolvers };
