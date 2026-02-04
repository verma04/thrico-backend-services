import { EventSpeakerService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

const eventSpeakerResolvers = {
  Query: {
    async getSpeakersByEvent(
      _: any,
      { input: { eventId, page, limit } }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const service = new EventSpeakerService(db);
        return await service.getSpeakersByEvent({
          eventId,
          page,
          limit,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },

  Mutation: {
    async addSpeaker(
      _: any,
      { input: { eventId, speakerData } }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const service = new EventSpeakerService(db);
        return service.addSpeaker({ eventId, speakerData });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editSpeaker(
      _: any,
      { input: { eventId, speakerId, updateData } }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const service = new EventSpeakerService(db);
        return await service.editSpeaker(eventId, speakerId, updateData);
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async removeSpeaker(
      _: any,
      { input: { eventId, speakerId } }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const service = new EventSpeakerService(db);
        return await service.removeSpeaker({ eventId, speakerId });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async markSpeakerFeatured(
      _: any,
      { input: { eventId, speakerId } }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const service = new EventSpeakerService(db);
        return await service.markSpeakerFeatured(eventId, speakerId, true);
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async unfeatureSpeaker(
      _: any,
      { input: { eventId, speakerId } }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const service = new EventSpeakerService(db);
        return await service.markSpeakerFeatured(eventId, speakerId, false);
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { eventSpeakerResolvers };
