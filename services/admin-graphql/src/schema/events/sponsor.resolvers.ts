import { eq } from "drizzle-orm";
import { eventSponsors } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

const sponsorResolvers = {
  Query: {
    async getEventSponsors(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const sponsorsList = await db.query.eventSponsors.findMany({
          where: (sponsor: any, { eq }: any) => eq(sponsor.eventId, eventId),
        });
        return sponsorsList;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventSponsor(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [sponsor] = await db
          .insert(eventSponsors)
          .values({
            eventId: input.eventId,
            sponsorShipId: input.sponsorShipId,
            sponsorName: input.sponsorName,
            sponsorLogo: input.sponsorLogo,
            sponsorUserName: input.sponsorUserName,
            sponsorUserDesignation: input.sponsorUserDesignation,
            isApproved: input.isApproved || true,
          })
          .returning();
        return sponsor;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateEventSponsor(_: any, { sponsorId, input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [sponsor] = await db
          .update(eventSponsors)
          .set({
            sponsorName: input.sponsorName,
            sponsorLogo: input.sponsorLogo,
            sponsorUserName: input.sponsorUserName,
            sponsorUserDesignation: input.sponsorUserDesignation,
            isApproved: input.isApproved,
          })
          .where(eq(eventSponsors.id, sponsorId))
          .returning();
        return sponsor;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async deleteEventSponsor(_: any, { sponsorId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        await db.delete(eventSponsors).where(eq(eventSponsors.id, sponsorId));
        return true;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { sponsorResolvers };
