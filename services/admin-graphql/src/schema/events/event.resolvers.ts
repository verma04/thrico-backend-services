import { and, eq } from "drizzle-orm";
import generateSlug from "../../utils/slug.utils";
import { eventVerification, events } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { formatDateInput } from "../../utils/date.utils";
import uploadImageToFolder from "../../utils/upload/uploadImageToFolder.utils";
import { seedEventDetails } from "./seed";

const eventResolvers = {
  Query: {
    async getAllEvents(_: any, { input }: any, context: any) {
      try {
        const { id, entity, db } = await checkAuth(context);
        const { status } = input || {}; // status: "ALL" | "APPROVED" | "PENDING" | "REJECTED" | "DISABLED"
        let whereClause;
        if (status === "APPROVED") {
          whereClause = (events: any, { eq }: any) =>
            and(eq(events.entityId, entity), eq(events.status, "APPROVED"));
        } else if (status === "PENDING") {
          whereClause = (events: any, { eq }: any) =>
            and(eq(events.entityId, entity), eq(events.status, "PENDING"));
        } else if (status === "REJECTED") {
          whereClause = (events: any, { eq }: any) =>
            and(eq(events.entityId, entity), eq(events.status, "REJECTED"));
        } else if (status === "DISABLED") {
          whereClause = (events: any, { eq }: any) =>
            and(eq(events.entityId, entity), eq(events.status, "DISABLED"));
        } else {
          // ALL
          whereClause = (events: any, { eq }: any) =>
            eq(events.entityId, entity);
        }
        const jobs = await db.query.events.findMany({
          where: whereClause,
          with: {
            verification: true,
          },
          orderBy: (job: any, { desc }: any) => desc(job.updatedAt),
        });
        return jobs;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEvent(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        console.log("Event Input:", input);
        const checkAutoApprove = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entity),
        });

        let cover: string | undefined;
        if (input?.coverImage) {
          const uploadedFiles = await uploadImageToFolder("events", [
            input.coverImage,
          ]);
          if (uploadedFiles && uploadedFiles.length > 0) {
            cover = uploadedFiles[0].url;
          }
        }

        const [createdEvent, insertedVerification] = await db.transaction(
          async (tx: any) => {
            const [event] = await tx
              .insert(events)
              .values({
                entityId: entity,
                isApproved: !!checkAutoApprove?.autoApproveEvents,
                status: checkAutoApprove?.autoApproveEvents
                  ? "APPROVED"
                  : "PENDING",
                visibility: input.visibility || "PUBLIC",
                startDate: formatDateInput(input.startDate),
                endDate: formatDateInput(input.endDate),
                lastDateOfRegistration: formatDateInput(
                  input.lastDateOfRegistration,
                ),
                startTime: "12:00 AM",
                title: input.title,
                slug: generateSlug(input.title),
                type: input.type,
                eventCreatedBy: "ENTITY",
                cover: cover ? cover : "defaultEventCover.png",
                location: input?.location?.name
                  ? input.location
                  : {
                      name: "India",
                    },
                description: input.description || "",
              })
              .returning();

            const [verification] = await tx
              .insert(eventVerification)
              .values({
                isVerifiedAt: new Date(),
                verifiedBy: id,
                isVerified: true,
                verificationReason: "Created by admin",
                eventId: event.id,
              })
              .returning();

            await seedEventDetails(tx, event.id, entity, id);

            return [event, verification];
          },
        );

        console.log("Event created:", createdEvent, insertedVerification);
        return {
          ...createdEvent,
          verification: insertedVerification,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateEvent(_: any, { eventId, input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        let cover: string | undefined;
        if (input?.coverImage) {
          const uploadedFiles = await uploadImageToFolder("events", [
            input.coverImage,
          ]);
          if (uploadedFiles && uploadedFiles.length > 0) {
            cover = uploadedFiles[0].url;
          }
        }

        const [event] = await db
          .update(events)
          .set({
            title: input.title,
            description: input.description,
            startDate: formatDateInput(input.startDate) || undefined,
            endDate: formatDateInput(input.endDate) || undefined,
            startTime: input.startTime,
            type: input.type,
            lastDateOfRegistration:
              formatDateInput(input.lastDateOfRegistration) || undefined,
            cover: cover,
            location: input.location,
            visibility: input.visibility,
            updatedAt: new Date(),
          })
          .where(eq(events.id, eventId))
          .returning();

        return event;
      } catch (error) {
        console.log("Error updating event:", error);
        throw error;
      }
    },
    async deleteEvent(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        await db.delete(events).where(eq(events.id, eventId));
        return true;
      } catch (error) {
        console.log("Error deleting event:", error);
        throw error;
      }
    },
  },
};

export { eventResolvers };
