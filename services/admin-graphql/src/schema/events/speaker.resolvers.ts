import { eq } from "drizzle-orm";
import { eventSpeakers } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

const speakerResolvers = {
  Query: {
    async getEventSpeakers(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const speakersList = await db.query.eventSpeakers.findMany({
          where: (speakers: any, { eq }: any) => eq(speakers.eventId, eventId),
          orderBy: (speakers: any, { asc }: any) => asc(speakers.displayOrder),
        });
        return speakersList;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventSpeaker(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [speaker] = await db
          .insert(eventSpeakers)
          .values({
            eventId: input.eventId,
            name: input.name,
            email: input.email,
            bio: input.bio,
            title: input.title,
            company: input.company,
            avatar: input.avatar,
            socialLinks: input.socialLinks,
            isFeatured: input.isFeatured || false,
            displayOrder: input.displayOrder || 0,
          })
          .returning();
        return speaker;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateEventSpeaker(_: any, { speakerId, input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [speaker] = await db
          .update(eventSpeakers)
          .set({
            name: input.name,
            email: input.email,
            bio: input.bio,
            title: input.title,
            company: input.company,
            avatar: input.avatar,
            socialLinks: input.socialLinks,
            isFeatured: input.isFeatured,
            displayOrder: input.displayOrder,
          })
          .where(eq(eventSpeakers.id, speakerId))
          .returning();
        return speaker;
      } catch (error) {
        console.log("Error updating speaker", error);
        throw error;
      }
    },
    async deleteEventSpeaker(_: any, { speakerId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        await db.delete(eventSpeakers).where(eq(eventSpeakers.id, speakerId));
        return true;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async toggleSpeakerFeatured(
      _: any,
      { speakerId, isFeatured }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const [speaker] = await db
          .update(eventSpeakers)
          .set({ isFeatured })
          .where(eq(eventSpeakers.id, speakerId))
          .returning();
        return speaker;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { speakerResolvers };
