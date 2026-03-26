import { eq } from "drizzle-orm";
import { eventsAgenda } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { formatDateInput } from "../../utils/date.utils";

const agendaResolvers = {
  Query: {
    async getEventAgendas(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const agendas = await db.query.eventsAgenda.findMany({
          where: (agenda: any, { eq }: any) => eq(agenda.eventId, eventId),
          with: {
            venue: true,
          },
        });
        return agendas;
      } catch (error) {
        console.log("Error fetching agendas:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventAgenda(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [agenda] = await db
          .insert(eventsAgenda)
          .values({
            eventId: input.eventId,
            title: input.title,
            videoSteam: input.videoSteam,
            venue: input.venueId,
            date: formatDateInput(input.date) as any,
            startTime: input.startTime,
            endTime: input.endTime,
            isPublished: input.isPublished ?? false,
            isPinned: input.isPinned ?? false,
            isDraft: input.isDraft ?? true,
          })
          .returning();
        return agenda;
      } catch (error) {
        console.log("Error adding agenda:", error);
        throw error;
      }
    },
    async updateEventAgenda(_: any, { agendaId, input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [agenda] = await db
          .update(eventsAgenda)
          .set({
            title: input.title,
            videoSteam: input.videoSteam,
            venue: input.venueId,
            date: formatDateInput(input.date) as any,
            startTime: input.startTime,
            endTime: input.endTime,
            isPublished: input.isPublished,
            isPinned: input.isPinned,
            isDraft: input.isDraft,
            updatedAt: new Date(),
          })
          .where(eq(eventsAgenda.id, agendaId))
          .returning();
        return agenda;
      } catch (error) {
        console.log("Error updating agenda:", error);
        throw error;
      }
    },
    async deleteEventAgenda(_: any, { agendaId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        await db.delete(eventsAgenda).where(eq(eventsAgenda.id, agendaId));
        return true;
      } catch (error) {
        console.log("Error deleting agenda:", error);
        throw error;
      }
    },
  },
};

export { agendaResolvers };
