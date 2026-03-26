import { eq } from "drizzle-orm";
import { eventsSettings } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const settingsResolvers = {
  Query: {
    async getEventSettings(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const settings = await db.query.eventsSettings.findFirst({
          where: (s: any, { eq }: any) => eq(s.eventId, eventId),
        });
        return settings;
      } catch (error) {
        console.log("Error fetching event settings:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async upsertEventSettings(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        const existing = await db.query.eventsSettings.findFirst({
          where: (s: any, { eq }: any) => eq(s.eventId, input.eventId),
        });

        if (existing) {
          const [updated] = await db
            .update(eventsSettings)
            .set({
              layout: input.layout,
              updatedAt: new Date(),
            })
            .where(eq(eventsSettings.id, existing.id))
            .returning();
          return updated;
        } else {
          const [created] = await db
            .insert(eventsSettings)
            .values({
              eventId: input.eventId,
              layout: input.layout ?? "layout-1",
            })
            .returning();
          return created;
        }
      } catch (error) {
        console.log("Error upserting event settings:", error);
        throw error;
      }
    },
  },
};
