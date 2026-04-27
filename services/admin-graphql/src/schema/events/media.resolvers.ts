import { eq } from "drizzle-orm";
import { eventsMedia } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const mediaResolvers = {
  Query: {
    async getEventMedia(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const media = await db.query.eventsMedia.findMany({
          where: (m: any, { eq }: any) => eq(m.eventId, eventId),
        });
        return media;
      } catch (error) {
        console.log("Error fetching event media:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventMedia(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [media] = await db
          .insert(eventsMedia)
          .values({
            eventId: input.eventId,
            url: input.url,
            mediaType: input.mediaType,
            title: input.title,
            tags: input.tags,
            isPublic: input.isPublic ?? true,
          })
          .returning();

        const { id: adminId, entity: entityId } = await checkAuth(context);
        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_MEDIA",
          action: "CREATE",
          resourceId: media.id,
          newState: media,
        });

        return media;
      } catch (error) {
        console.log("Error adding event media:", error);
        throw error;
      }
    },
    async updateEventMedia(_: any, { mediaId, input }: any, context: any) {
      try {
        const { db, id: adminId, entity: entityId } = await checkAuth(context);
        const existing = await db.query.eventsMedia.findFirst({
          where: eq(eventsMedia.id, mediaId),
        });

        const [media] = await db
          .update(eventsMedia)
          .set({
            url: input.url,
            mediaType: input.mediaType,
            title: input.title,
            tags: input.tags,
            isPublic: input.isPublic,
            updatedAt: new Date(),
          })
          .where(eq(eventsMedia.id, mediaId))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_MEDIA",
          action: "UPDATE",
          resourceId: media.id,
          previousState: existing,
          newState: media,
        });

        return media;
      } catch (error) {
        console.log("Error updating event media:", error);
        throw error;
      }
    },
    async deleteEventMedia(_: any, { mediaId }: any, context: any) {
      try {
        const { db, id: adminId, entity: entityId } = await checkAuth(context);
        const existing = await db.query.eventsMedia.findFirst({
          where: eq(eventsMedia.id, mediaId),
        });

        await db.delete(eventsMedia).where(eq(eventsMedia.id, mediaId));

        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_MEDIA",
          action: "DELETE",
          resourceId: mediaId,
          previousState: existing,
        });

        return true;
      } catch (error) {
        console.log("Error deleting event media:", error);
        throw error;
      }
    },
    async updateEventMediaVisibility(
      _: any,
      { mediaId, isPublic }: any,
      context: any,
    ) {
      try {
        const { db, id: adminId, entity: entityId } = await checkAuth(context);
        const existing = await db.query.eventsMedia.findFirst({
          where: eq(eventsMedia.id, mediaId),
        });

        const [media] = await db
          .update(eventsMedia)
          .set({
            isPublic: isPublic,
            updatedAt: new Date(),
          })
          .where(eq(eventsMedia.id, mediaId))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_MEDIA",
          action: "UPDATE_VISIBILITY",
          resourceId: mediaId,
          previousState: existing,
          newState: media,
        });

        return media;
      } catch (error) {
        console.log("Error updating event media visibility:", error);
        throw error;
      }
    },
  },
};
