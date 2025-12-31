import { and, eq, inArray } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  customForms,
  customFormFields,
  customFormsAuditLogs,
} from "@thrico/database";
import { GraphQLError } from "graphql";

export const customFormsResolvers = {
  Query: {
    async getCustomForms(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { by } = input || {}; // by: "ALL" | "ADMIN" | "USER"
        let whereClause;
        if (by === "ADMIN") {
          whereClause = (customForms: any, { eq, and }: any) =>
            and(
              eq(customForms.entityId, entity),
              eq(customForms.addedBy, "ADMIN")
            );
        } else if (by === "USER") {
          whereClause = (customForms: any, { eq, and }: any) =>
            and(
              eq(customForms.entityId, entity),
              eq(customForms.addedBy, "USER")
            );
        } else {
          whereClause = (customForms: any, { eq }: any) =>
            eq(customForms.entityId, entity);
        }
        const formList = await db.query.customForms.findMany({
          where: whereClause,
          orderBy: (customForms: any, { desc }: any) =>
            desc(customForms.updatedAt),
          with: { fields: true },
        });

        return formList;
      } catch (error) {
        console.error("Error fetching custom forms:", error);
        throw error;
      }
    },
    async getCustomForm(_: any, { id }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const form = await db.query.customForms.findFirst({
          where: (customForms: any, { eq, and }: any) =>
            and(eq(customForms.id, id), eq(customForms.entityId, entity)),
          with: { fields: true },
        });

        if (!form) {
          throw new GraphQLError("Form not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return form;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addCustomForm(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        // Check for duplicate title
        const isExist = await db.query.customForms.findFirst({
          where: (customForms: any, { eq, and }: any) =>
            and(
              eq(customForms.entityId, entity),
              eq(customForms.title, input.title)
            ),
        });
        if (isExist)
          throw new GraphQLError("Form with this title already exists", {
            extensions: {
              code: "BAD_USER_INPUT",
              http: { status: 400 },
            },
          });

        let newForm: any, insertedFields: any[];
        const result = await db.transaction(async (tx: any) => {
          [newForm] = await tx
            .insert(customForms)
            .values({
              entityId: entity,
              title: input.title,
              description: input.description,
              endDate: input.endDate ? new Date(input.endDate) : null,
              // Remove resultVisibility if not in schema
              addedBy: "USER",
              userId: id,
              previewType: input.previewType,
              appearance: input.appearance,
            })
            .returning();

          insertedFields = [];
          if (Array.isArray(input.fields) && input.fields.length > 0) {
            insertedFields = await Promise.all(
              input.fields.map((field: any, idx: number) =>
                tx
                  .insert(customFormFields)
                  .values({
                    formId: newForm.id,
                    question: field.question,
                    type: field.type,
                    order: idx,
                    options: field.options,
                    required: field.required,
                    // ...other field properties
                  })
                  .returning()
                  .then((rows: any[]) => rows[0])
              )
            );
          }

          await tx.insert(customFormsAuditLogs).values({
            formId: newForm.id,
            status: "ADD",
            performedBy: id,
            reason: "Form created",
            previousState: null,
            newState: {
              ...newForm,
              fields: insertedFields,
            },
            entity,
          });

          return {
            ...newForm,
            fields: insertedFields,
          };
        });

        return result;
      } catch (error: any) {
        console.log("Error adding custom form:", error);
        throw new GraphQLError(error.message || "Failed to add custom form", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
          },
        });
      }
    },

    async editCustomForm(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        // Check for duplicate title (excluding current form)
        // input.id is required for edit, though schema said input: InputCustomForm and id: ID! separate.
        // User resolver code used input.id. Schema used id argument.
        // I will use `id` argument for ID and `input` for fields.
        // Wait, user code: editCustomForm(_: any, { input }: any ...) -> suggests input has ID inside it?
        // User schema: editCustomForm(id: ID!, input: InputCustomForm!)
        // I will adjust resolver to match schema: editCustomForm(_: any, { id: formId, input }: any, ...)

        // RE-READING USER RESOLVER: `async editCustomForm(_: any, { input }: any, context: AuthContext)`
        // AND user resolver uses `input.id`.
        // BUT Schema provided by user: `editCustomForm(id: ID!, input: InputCustomForm!): CustomForm`
        // CONFLICT. I will assume Schema is source of truth for arguments, but I will merge them for logic.

        // Actually, I will modify resolver signature to match schema provided in step 422: `editCustomForm(id: ID!, input: InputCustomForm!)`

        throw new GraphQLError(
          "Please use the correct arguments: id and input separate, or adjust schema."
        );
        // Wait, I am writing the code. I should make them consistent.
        // I'll stick to the user's Schema which is explicitly separating ID.
      } catch (e) {
        // Placeholder, will overwrite below with correct function
        throw e;
      }
    },

    // Correct implementation of editCustomForm matching schema
    async editCustomFormFixed(
      _: any,
      { id: formId, input }: any,
      context: any
    ) {
      try {
        const { id, db, entity } = await checkAuth(context);

        // Check for duplicate title (excluding current form)
        const isExist = await db.query.customForms.findFirst({
          where: (customForms: any, { eq, and, ne }: any) =>
            and(
              eq(customForms.entityId, entity),
              eq(customForms.title, input.title),
              ne(customForms.id, formId)
            ),
        });
        if (isExist)
          throw new GraphQLError("Form with this title already exists", {
            extensions: { code: "CONFLICT" },
          });

        let updatedForm: any, updatedFields: any[];
        const result = await db.transaction(async (tx: any) => {
          [updatedForm] = await tx
            .update(customForms)
            .set({
              title: input.title,
              description: input.description,
              endDate: input.endDate ? new Date(input.endDate) : null,
              previewType: input.previewType,
              appearance: input.appearance,
            })
            .where(
              and(eq(customForms.id, formId), eq(customForms.entityId, entity))
            )
            .returning();

          // Handle fields (add/update/delete)
          updatedFields = [];
          if (Array.isArray(input.fields) && input.fields.length > 0) {
            const existingFields = await tx.query.customFormFields.findMany({
              where: (customFormFields: any, { eq }: any) =>
                eq(customFormFields.formId, formId),
            });
            const existingFieldIds = existingFields.map((f: any) => f.id);
            const inputFieldIds = input.fields
              .filter((f: any) => f.id)
              .map((f: any) => f.id);

            // Delete removed fields
            const toDeleteIds = existingFieldIds.filter(
              (id: any) => !inputFieldIds.includes(id)
            );
            if (toDeleteIds.length > 0) {
              await tx
                .delete(customFormFields)
                .where(inArray(customFormFields.id, toDeleteIds));
            }

            // Update existing and insert new fields
            for (let idx = 0; idx < input.fields.length; idx++) {
              const field = input.fields[idx];
              if (field.id) {
                const [updatedField] = await tx
                  .update(customFormFields)
                  .set({
                    labels: field.labels,
                    type: field.type,
                    order: idx,
                    options: field.options,
                    required: field.required,
                    // ...other field properties
                  })
                  .where(eq(customFormFields.id, field.id))
                  .returning();
                updatedFields.push(updatedField);
              } else {
                const [newField] = await tx
                  .insert(customFormFields)
                  .values({
                    question: field.question,
                    labels: field.labels,
                    type: field.type,
                    order: idx,
                    options: field.options,
                    required: field.required,
                    formId: formId,
                    // ...other field properties
                  })
                  .returning();
                updatedFields.push(newField);
              }
            }
          }

          await tx.insert(customFormsAuditLogs).values({
            formId: formId,
            status: "UPDATE",
            performedBy: id,
            reason: input.reason || "Form edited",
            previousState: null,
            newState: {
              ...updatedForm,
              fields: updatedFields,
            },
            entity,
          });

          return {
            ...updatedForm,
            fields: updatedFields,
          };
        });

        return result;
      } catch (error: any) {
        throw new GraphQLError(error.message || "Failed to edit custom form");
      }
    },

    async deleteCustomForm(_: any, { id: formId }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);
        // Schema says `deleteCustomForm(id: ID!)` so input is just id argument directly?
        // Or if it was `input`, user code had `input` object. schema has `id`. taking `id`.

        const form = await db.query.customForms.findFirst({
          where: (customForms: any, { eq, and }: any) =>
            and(eq(customForms.id, formId), eq(customForms.entityId, entity)),
          with: { fields: true },
        });
        if (!form)
          throw new GraphQLError("Form not found or not authorized", {
            extensions: { code: "NOT_FOUND" },
          });

        await db.transaction(async (tx: any) => {
          await tx
            .delete(customFormFields)
            .where(eq(customFormFields.formId, formId));
          await tx.delete(customForms).where(eq(customForms.id, formId));
          await tx.insert(customFormsAuditLogs).values({
            formId: formId,
            status: "REMOVE",
            performedBy: id,
            reason: "Form deleted",
            previousState: form,
            newState: null,
            entity,
          });
        });

        return { id: formId, deleted: true };
      } catch (error: any) {
        throw new GraphQLError(error.message || "Failed to delete custom form");
      }
    },
  },
};

// Map the corrected function names to the exported object
customFormsResolvers.Mutation.editCustomForm = customFormsResolvers.Mutation
  .editCustomFormFixed as any;
delete (customFormsResolvers.Mutation as any).editCustomFormFixed;
