import { eq } from "drizzle-orm";
import { eventsAgenda } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { formatDateInput } from "../../utils/date.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

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

        const { id: adminId, entity: entityId } = await checkAuth(context);
        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_AGENDA",
          action: "CREATE",
          resourceId: agenda.id,
          newState: agenda,
        });

        return agenda;
      } catch (error) {
        console.log("Error adding agenda:", error);
        throw error;
      }
    },
    async updateEventAgenda(_: any, { agendaId, input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const existing = await db.query.eventsAgenda.findFirst({
          where: eq(eventsAgenda.id, agendaId),
        });

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

        const { id: adminId, entity: entityId } = await checkAuth(context);
        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_AGENDA",
          action: "UPDATE",
          resourceId: agenda.id,
          previousState: existing,
          newState: agenda,
        });

        return agenda;
      } catch (error) {
        console.log("Error updating agenda:", error);
        throw error;
      }
    },
    async deleteEventAgenda(_: any, { agendaId }: any, context: any) {
      try {
        const { db, id: adminId, entity: entityId } = await checkAuth(context);
        const existing = await db.query.eventsAgenda.findFirst({
          where: eq(eventsAgenda.id, agendaId),
        });

        await db.delete(eventsAgenda).where(eq(eventsAgenda.id, agendaId));

        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_AGENDA",
          action: "DELETE",
          resourceId: agendaId,
          previousState: existing,
        });

        return true;
      } catch (error) {
        console.log("Error deleting agenda:", error);
        throw error;
      }
    },
  },
};

export { agendaResolvers };
