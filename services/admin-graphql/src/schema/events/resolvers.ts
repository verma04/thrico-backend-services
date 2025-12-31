import { and, eq, is, sql } from "drizzle-orm";

import generateSlug from "../../utils/slug.utils";
import { GraphQLError } from "graphql";

import {
  eventLogs,
  eventSpeakers,
  eventVerification,
  events,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import uploadImageToFolder from "../../utils/upload/uploadImageToFolder.utils";

const eventsResolvers = {
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
          // Replacing generic upload with specific uploadImageToFolder
          // Assuming 'events' as the folder name. Adjust as needed.
          const uploadedFiles = await uploadImageToFolder("events", [
            input.coverImage,
          ]);
          if (uploadedFiles && uploadedFiles.length > 0) {
            cover = uploadedFiles[0].url;
          }
        }

        // Use a transaction to ensure both event and verification are created atomically
        const [createdEvent, insertedVerification] = await db.transaction(
          async (tx: any) => {
            const [event] = await tx
              .insert(events)
              .values({
                // Only include fields that exist in your events schema
                entityId: entity,
                isApproved: !!checkAutoApprove?.autoApproveEvents,
                status: checkAutoApprove?.autoApproveEvents
                  ? "APPROVED"
                  : "PENDING",
                visibility: input.visibility || "PUBLIC",
                startDate: input.startDate
                  ? new Date(input.startDate).toISOString()
                  : null,
                endDate: input.endDate
                  ? new Date(input.endDate).toISOString()
                  : null,
                lastDateOfRegistration: input.lastDateOfRegistration
                  ? new Date(input.lastDateOfRegistration).toISOString()
                  : null,
                startTime: "12:00 AM", // Default value, replace with input.startTime if available
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

            // If you have an eventVerification table, use it here.
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

            return [event, verification];
          }
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
  },
};

export { eventsResolvers };
