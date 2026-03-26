import { eq } from "drizzle-orm";
import { eventsSponsorShip, eventSponsors } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

const sponsorshipResolvers = {
  Query: {
    async getEventSponsorships(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const sponsorships = await db.query.eventsSponsorShip.findMany({
          where: (sponsor: any, { eq }: any) => eq(sponsor.eventId, eventId),
        });

        const sponsors = await db.query.eventSponsors.findMany({
          where: (sponsor: any, { eq }: any) => eq(sponsor.eventId, eventId),
        });

        // Map sponsors to their tiers
        return sponsorships.map((tier: any) => ({
          ...tier,
          sponsors: sponsors.filter((s: any) => s.sponsorShipId === tier.id),
        }));
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventSponsorship(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [sponsorship] = await db
          .insert(eventsSponsorShip)
          .values({
            eventId: input.eventId,
            sponsorType: input.sponsorType,
            price: input.price.toString(),
            currency: input.currency,
            showPrice: input.showPrice || false,
            content: input.content,
          })
          .returning();
        return sponsorship;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateEventSponsorship(
      _: any,
      { sponsorshipId, input }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const [sponsorship] = await db
          .update(eventsSponsorShip)
          .set({
            sponsorType: input.sponsorType,
            price: input.price.toString(),
            currency: input.currency,
            showPrice: input.showPrice,
            content: input.content,
          })
          .where(eq(eventsSponsorShip.id, sponsorshipId))
          .returning();
        return sponsorship;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async deleteEventSponsorship(_: any, { sponsorshipId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        await db
          .delete(eventSponsors)
          .where(eq(eventSponsors.sponsorShipId, sponsorshipId));
        await db
          .delete(eventsSponsorShip)
          .where(eq(eventsSponsorShip.id, sponsorshipId));
        return true;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { sponsorshipResolvers };
