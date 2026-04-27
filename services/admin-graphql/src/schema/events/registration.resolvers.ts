import { eq } from "drizzle-orm";
import { GraphQLError } from "graphql";

import {
  eventsRegistrationSettings,
  eventsRegistrationFields,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const registrationResolvers = {
  Query: {
    async getEventRegistrationSettings(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const settings = await db.query.eventsRegistrationSettings.findFirst({
          where: (setting: any, { eq }: any) => eq(setting.eventId, eventId),
        });
        return settings;
      } catch (error) {
        console.log("Error fetching registration settings:", error);
        throw error;
      }
    },
    async getEventRegistrationFields(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const fields = await db.query.eventsRegistrationFields.findMany({
          where: (field: any, { eq }: any) => eq(field.eventId, eventId),
          orderBy: (field: any, { asc }: any) => asc(field.displayOrder),
        });
        return fields;
      } catch (error) {
        console.log("Error fetching registration fields:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async upsertEventRegistrationSettings(
      _: any,
      { input }: any,
      context: any,
    ) {
      try {
        const { db, id: adminId, entity: entityId } = await checkAuth(context);

        // Find existing settings
        const existingSettings =
          await db.query.eventsRegistrationSettings.findFirst({
            where: (setting: any, { eq }: any) =>
              eq(setting.eventId, input.eventId),
          });

        if (existingSettings) {
          // Update
          const [updated] = await db
            .update(eventsRegistrationSettings)
            .set({
              isRegistrationOpen:
                input.isRegistrationOpen ?? existingSettings.isRegistrationOpen,
              enableWaitlist:
                input.enableWaitlist ?? existingSettings.enableWaitlist,
              requireApproval:
                input.requireApproval ?? existingSettings.requireApproval,
              confirmationSubject:
                input.confirmationSubject ??
                existingSettings.confirmationSubject,
              confirmationBody:
                input.confirmationBody ?? existingSettings.confirmationBody,
              updatedAt: new Date(),
            })
            .where(eq(eventsRegistrationSettings.eventId, input.eventId))
            .returning();

          await createAuditLog(db, {
            adminId,
            entityId,
            module: "EVENT_REGISTRATION",
            action: "UPDATE_SETTINGS",
            resourceId: input.eventId,
            previousState: existingSettings,
            newState: updated,
          });

          return updated;
        } else {
          // Insert
          const [inserted] = await db
            .insert(eventsRegistrationSettings)
            .values({
              eventId: input.eventId,
              isRegistrationOpen: input.isRegistrationOpen ?? true,
              enableWaitlist: input.enableWaitlist ?? true,
              requireApproval: input.requireApproval ?? false,
              confirmationSubject: input.confirmationSubject,
              confirmationBody: input.confirmationBody,
            })
            .returning();

          await createAuditLog(db, {
            adminId,
            entityId,
            module: "EVENT_REGISTRATION",
            action: "CREATE_SETTINGS",
            resourceId: input.eventId,
            newState: inserted,
          });

          return inserted;
        }
      } catch (error) {
        console.log("Error upserting registration settings:", error);
        throw error;
      }
    },
    async addEventRegistrationField(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [field] = await db
          .insert(eventsRegistrationFields)
          .values({
            eventId: input.eventId,
            label: input.label,
            type: input.type,
            required: input.required ?? false,
            placeholder: input.placeholder,
            options: input.options,
            displayOrder: input.displayOrder ?? 0,
          })
          .returning();

        const { id: adminId, entity: entityId } = await checkAuth(context);
        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_REGISTRATION_FIELD",
          action: "CREATE",
          resourceId: field.id,
          newState: field,
        });

        return field;
      } catch (error) {
        console.log("Error adding registration field:", error);
        throw error;
      }
    },
    async updateEventRegistrationField(
      _: any,
      { fieldId, input }: any,
      context: any,
    ) {
      try {
        const { db, id: adminId, entity: entityId } = await checkAuth(context);
        const existing = await db.query.eventsRegistrationFields.findFirst({
          where: eq(eventsRegistrationFields.id, fieldId),
        });

        const [field] = await db
          .update(eventsRegistrationFields)
          .set({
            label: input.label,
            type: input.type,
            required: input.required,
            placeholder: input.placeholder,
            options: input.options,
            displayOrder: input.displayOrder,
            updatedAt: new Date(),
          })
          .where(eq(eventsRegistrationFields.id, fieldId))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_REGISTRATION_FIELD",
          action: "UPDATE",
          resourceId: field.id,
          previousState: existing,
          newState: field,
        });

        return field;
      } catch (error) {
        console.log("Error updating registration field:", error);
        throw error;
      }
    },
    async deleteEventRegistrationField(_: any, { fieldId }: any, context: any) {
      try {
        const { db, id: adminId, entity: entityId } = await checkAuth(context);
        const existing = await db.query.eventsRegistrationFields.findFirst({
          where: eq(eventsRegistrationFields.id, fieldId),
        });

        await db
          .delete(eventsRegistrationFields)
          .where(eq(eventsRegistrationFields.id, fieldId));

        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_REGISTRATION_FIELD",
          action: "DELETE",
          resourceId: fieldId,
          previousState: existing,
        });

        return true;
      } catch (error) {
        console.log("Error deleting registration field:", error);
        throw error;
      }
    },
  },
};
