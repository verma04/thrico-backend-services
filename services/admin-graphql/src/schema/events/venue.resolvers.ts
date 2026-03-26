import { eq } from "drizzle-orm";
import { eventsVenue } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

const venueResolvers = {
  Query: {
    async getEventVenues(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const venues = await db.query.eventsVenue.findMany({
          where: (venue: any, { eq }: any) => eq(venue.eventId, eventId),
        });
        return venues;
      } catch (error) {
        console.log("Error fetching venues:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventVenue(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [venue] = await db
          .insert(eventsVenue)
          .values({
            eventId: input.eventId,
            name: input.name,
            address: input.address,
            city: input.city,
            state: input.state,
            country: input.country,
            zipCode: input.zipCode,
            latitude: input.latitude?.toString(),
            longitude: input.longitude?.toString(),
            capacity: input.capacity,
            description: input.description,
            amenities: input.amenities,
            contactInfo: input.contactInfo,
            images: input.images,
            status: input.status !== undefined ? input.status : true,
          })
          .returning();
        return venue;
      } catch (error) {
        console.log("Error adding venue:", error);
        throw error;
      }
    },
    async updateEventVenue(_: any, { venueId, input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [venue] = await db
          .update(eventsVenue)
          .set({
            name: input.name,
            address: input.address,
            city: input.city,
            state: input.state,
            country: input.country,
            zipCode: input.zipCode,
            latitude: input.latitude?.toString(),
            longitude: input.longitude?.toString(),
            capacity: input.capacity,
            description: input.description,
            amenities: input.amenities,
            contactInfo: input.contactInfo,
            images: input.images,
            status: input.status,
            updatedAt: new Date(),
          })
          .where(eq(eventsVenue.id, venueId))
          .returning();
        return venue;
      } catch (error) {
        console.log("Error updating venue:", error);
        throw error;
      }
    },
    async deleteEventVenue(_: any, { venueId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        await db.delete(eventsVenue).where(eq(eventsVenue.id, venueId));
        return true;
      } catch (error) {
        console.log("Error deleting venue:", error);
        throw error;
      }
    },
  },
};

export { venueResolvers };
