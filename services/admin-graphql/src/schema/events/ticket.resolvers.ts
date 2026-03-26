import { eq } from "drizzle-orm";
import { eventsTickets } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { formatDateInput } from "../../utils/date.utils";

const ticketResolvers = {
  Query: {
    async getEventTickets(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const tickets = await db.query.eventsTickets.findMany({
          where: (ticket: any, { eq }: any) => eq(ticket.eventId, eventId),
          orderBy: (ticket: any, { asc }: any) => asc(ticket.createdAt),
        });
        return tickets;
      } catch (error) {
        console.log("Error fetching tickets:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventTicket(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [ticket] = await db
          .insert(eventsTickets)
          .values({
            eventId: input.eventId,
            name: input.name,
            type: input.type,
            price: input.price?.toString() || "0",
            quantity: input.quantity || 0,
            description: input.description,
            earlyBirdPrice: input.earlyBirdPrice?.toString(),
            earlyBirdDeadline: formatDateInput(input.earlyBirdDeadline),
            maxPerOrder: input.maxPerOrder || 1,
            isVisible: input.isVisible ?? true,
          })
          .returning();
        return ticket;
      } catch (error) {
        console.log("Error adding ticket:", error);
        throw error;
      }
    },
    async updateEventTicket(_: any, { ticketId, input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [ticket] = await db
          .update(eventsTickets)
          .set({
            name: input.name,
            type: input.type,
            price: input.price?.toString(),
            quantity: input.quantity,
            description: input.description,
            earlyBirdPrice: input.earlyBirdPrice?.toString(),
            earlyBirdDeadline: formatDateInput(input.earlyBirdDeadline),
            maxPerOrder: input.maxPerOrder,
            isVisible: input.isVisible,
            updatedAt: new Date(),
          })
          .where(eq(eventsTickets.id, ticketId))
          .returning();
        return ticket;
      } catch (error) {
        console.log("Error updating ticket:", error);
        throw error;
      }
    },
    async deleteEventTicket(_: any, { ticketId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        await db.delete(eventsTickets).where(eq(eventsTickets.id, ticketId));
        return true;
      } catch (error) {
        console.log("Error deleting ticket:", error);
        throw error;
      }
    },
  },
};

export { ticketResolvers };
