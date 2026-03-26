import { and, eq, sql } from "drizzle-orm";
import { events, eventsAttendees, user, userToEntity } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { v4 as uuidv4 } from "uuid";

export const attendeeResolvers = {
  Query: {
    async getEventAttendees(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const attendees = await db.query.eventsAttendees.findMany({
          where: (a: any, { eq }: any) => eq(a.eventId, eventId),
          with: {
            user: true,
            ticket: true,
          },
        });
        return attendees;
      } catch (error) {
        console.log("Error fetching event attendees:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventAttendee(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const { eventId, firstName, lastName, email, ticketId, status } = input;

        // 1. Find or create user
        let existingUser = await db.query.user.findFirst({
          where: (u: any, { and, eq }: any) =>
            and(eq(u.email, email), eq(u.entityId, entity)),
        });

        let userId = existingUser?.id;

        if (!existingUser) {
          const [newUser] = await db
            .insert(user)
            .values({
              thricoId: uuidv4(),
              firstName,
              lastName,
              email,
              entityId: entity,
            })
            .returning();
          userId = newUser.id;
        }

        // 2. Ensure user-to-entity link exists
        const existingLink = await db.query.userToEntity.findFirst({
          where: (ute: any, { and, eq }: any) =>
            and(eq(ute.userId, userId), eq(ute.entityId, entity)),
        });

        if (!existingLink) {
          await db.insert(userToEntity).values({
            userId: userId as string,
            entityId: entity as string,
            status: "APPROVED",
            isApproved: true,
          });
        }

        // 3. Check if already an attendee
        const existingAttendee = await db.query.eventsAttendees.findFirst({
          where: (a: any, { and, eq }: any) =>
            and(eq(a.user, userId), eq(a.eventId, eventId)),
        });

        if (existingAttendee) {
          throw new Error("User is already registered for this event");
        }

        // 4. Insert into eventsAttendees
        const [newAttendee] = await db
          .insert(eventsAttendees)
          .values({
            user: userId as string,
            eventId: eventId as string,
            ticketId: ticketId as string | null,
            status: (status || "CONFIRMED") as any,
          })
          .returning();

        // 5. Increment attendee count in events table
        await db
          .update(events)
          .set({
            numberOfAttendees: sql`${events.numberOfAttendees} + 1`,
          })
          .where(eq(events.id, eventId));

        // Refetch with relations
        return await db.query.eventsAttendees.findFirst({
          where: (a: any, { eq }: any) => eq(a.id, newAttendee.id),
          with: {
            user: true,
            ticket: true,
          },
        });
      } catch (error) {
        console.log("Error adding event attendee:", error);
        throw error;
      }
    },
    async updateAttendeeStatus(
      _: any,
      { attendeeId, status }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const [updated] = await db
          .update(eventsAttendees)
          .set({
            status,
            updatedAt: new Date(),
          })
          .where(eq(eventsAttendees.id, attendeeId))
          .returning();

        // Refetch with relations
        return await db.query.eventsAttendees.findFirst({
          where: (a: any, { eq }: any) => eq(a.id, updated.id),
          with: {
            user: true,
            ticket: true,
          },
        });
      } catch (error) {
        console.log("Error updating attendee status:", error);
        throw error;
      }
    },
    async toggleAttendeeCheckIn(_: any, { attendeeId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const existing = await db.query.eventsAttendees.findFirst({
          where: (a: any, { eq }: any) => eq(a.id, attendeeId),
        });

        if (!existing) throw new Error("Attendee not found");

        const [updated] = await db
          .update(eventsAttendees)
          .set({
            checkedIn: !existing.checkedIn,
            updatedAt: new Date(),
          })
          .where(eq(eventsAttendees.id, attendeeId))
          .returning();

        // Refetch with relations
        return await db.query.eventsAttendees.findFirst({
          where: (a: any, { eq }: any) => eq(a.id, updated.id),
          with: {
            user: true,
            ticket: true,
          },
        });
      } catch (error) {
        console.log("Error toggling attendee check-in:", error);
        throw error;
      }
    },
  },
};
