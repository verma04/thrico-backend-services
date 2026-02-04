import { and, eq, inArray } from "drizzle-orm";
import { customForms, questions } from "@thrico/database";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";

export class CustomFormService {
  static async getCustomForms({
    entityId,
    by,
    db,
  }: {
    entityId: string;
    by?: string;
    db: any;
  }) {
    try {
      let whereClause;
      if (by === "ADMIN") {
        whereClause = (table: any, { eq, and }: any) =>
          and(eq(table.entityId, entityId), eq(table.addedBy, "ADMIN"));
      } else if (by === "USER") {
        whereClause = (table: any, { eq, and }: any) =>
          and(eq(table.entityId, entityId), eq(table.addedBy, "USER"));
      } else {
        whereClause = (table: any, { eq }: any) => eq(table.entityId, entityId);
      }

      return await db.query.customForms.findMany({
        where: whereClause,
        orderBy: (table: any, { desc }: any) => desc(table.updatedAt),
        with: { questions: true, surveys: true },
      });
    } catch (error) {
      log.error("Error in getCustomForms", { error, entityId });
      throw error;
    }
  }

  static async getCustomForm({
    id,
    entityId,
    db,
  }: {
    id: string;
    entityId: string;
    db: any;
  }) {
    try {
      const form = await db.query.customForms.findFirst({
        where: (table: any, { eq, and }: any) =>
          and(eq(table.id, id), eq(table.entityId, entityId)),
        with: { questions: true, surveys: true },
      });

      if (!form) {
        throw new GraphQLError("Form not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      return form;
    } catch (error) {
      log.error("Error in getCustomForm", { error, id, entityId });
      throw error;
    }
  }

  static async addCustomForm({
    userId,
    entityId,
    role,
    input,
    db,
  }: {
    userId: string;
    entityId: string;
    role: string;
    input: any;
    db: any;
  }) {
    try {
      let finalAddedBy: "ADMIN" | "USER" = "USER";
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        finalAddedBy = "ADMIN";
      }

      const isExist = await db.query.customForms.findFirst({
        where: (table: any, { eq, and }: any) =>
          and(eq(table.entityId, entityId), eq(table.title, input.title)),
      });

      if (isExist) {
        throw new GraphQLError("Form with this title already exists", {
          extensions: { code: "BAD_USER_INPUT", http: { status: 400 } },
        });
      }

      return await db.transaction(async (tx: any) => {
        const [newForm] = await tx
          .insert(customForms)
          .values({
            entityId,
            userId,
            addedBy: finalAddedBy,
            title: input.title,
            description: input.description,
            endDate: input.endDate ? new Date(input.endDate) : null,
            previewType: input.previewType || "MULTI_STEP",
            status: input.status || "DRAFT",
            appearance: input.appearance,
          })
          .returning();

        let insertedQuestions = [];
        if (Array.isArray(input.questions) && input.questions.length > 0) {
          insertedQuestions = await Promise.all(
            input.questions.map((q: any, idx: number) =>
              tx
                .insert(questions)
                .values({
                  formId: newForm.id,
                  type: q.type,
                  question: q.question,
                  description: q.description,
                  order: q.order ?? idx,
                  required: q.required ?? false,
                  maxLength: q.maxLength,
                  min: q.min,
                  max: q.max,
                  scale: q.scale,
                  ratingType: q.ratingType,
                  options: q.options,
                  labels: q.labels,
                  allowMultiple: q.allowMultiple,
                  legalText: q.legalText,
                })
                .returning()
                .then((rows: any[]) => rows[0]),
            ),
          );
        }

        return { ...newForm, questions: insertedQuestions };
      });
    } catch (error) {
      log.error("Error in addCustomForm", { error, entityId, userId });
      throw error;
    }
  }

  static async editCustomForm({
    id,
    entityId,
    input,
    db,
  }: {
    id: string;
    entityId: string;
    input: any;
    db: any;
  }) {
    try {
      return await db.transaction(async (tx: any) => {
        const [updatedForm] = await tx
          .update(customForms)
          .set({
            title: input.title,
            description: input.description,
            endDate: input.endDate ? new Date(input.endDate) : null,
            previewType: input.previewType,
            status: input.status,
            appearance: input.appearance,
            updatedAt: new Date(),
          })
          .where(
            and(eq(customForms.id, id), eq(customForms.entityId, entityId)),
          )
          .returning();

        if (!updatedForm) throw new GraphQLError("Form not found");

        const updatedQuestions = [];
        if (Array.isArray(input.questions)) {
          const existingQuestions = await tx.query.questions.findMany({
            where: eq(questions.formId, id),
          });
          const existingQuestionIds = existingQuestions.map((q: any) => q.id);
          const inputQuestionIds = input.questions
            .filter((q: any) => q.id)
            .map((q: any) => q.id);

          const toDeleteIds = existingQuestionIds.filter(
            (qid: any) => !inputQuestionIds.includes(qid),
          );
          if (toDeleteIds.length > 0) {
            await tx
              .delete(questions)
              .where(inArray(questions.id, toDeleteIds));
          }

          for (let idx = 0; idx < input.questions.length; idx++) {
            const q = input.questions[idx];
            if (q.id) {
              const [updatedQ] = await tx
                .update(questions)
                .set({
                  type: q.type,
                  question: q.question,
                  description: q.description,
                  order: q.order ?? idx,
                  required: q.required,
                  maxLength: q.maxLength,
                  min: q.min,
                  max: q.max,
                  scale: q.scale,
                  ratingType: q.ratingType,
                  options: q.options,
                  labels: q.labels,
                  allowMultiple: q.allowMultiple,
                  legalText: q.legalText,
                  updatedAt: new Date(),
                })
                .where(eq(questions.id, q.id))
                .returning();
              updatedQuestions.push(updatedQ);
            } else {
              const [newQ] = await tx
                .insert(questions)
                .values({
                  formId: id,
                  type: q.type,
                  question: q.question,
                  description: q.description,
                  order: q.order ?? idx,
                  required: q.required,
                  maxLength: q.maxLength,
                  min: q.min,
                  max: q.max,
                  scale: q.scale,
                  ratingType: q.ratingType,
                  options: q.options,
                  labels: q.labels,
                  allowMultiple: q.allowMultiple,
                  legalText: q.legalText,
                })
                .returning();
              updatedQuestions.push(newQ);
            }
          }
        }
        return { ...updatedForm, questions: updatedQuestions };
      });
    } catch (error) {
      log.error("Error in editCustomForm", { error, id, entityId });
      throw error;
    }
  }

  static async deleteCustomForm({
    id,
    entityId,
    db,
  }: {
    id: string;
    entityId: string;
    db: any;
  }) {
    try {
      await db
        .delete(customForms)
        .where(and(eq(customForms.id, id), eq(customForms.entityId, entityId)));
      return { id, deleted: true };
    } catch (error) {
      log.error("Error in deleteCustomForm", { error, id, entityId });
      throw error;
    }
  }

  /**
   * GRANULAR QUESTION MANAGEMENT (Auto-save)
   */

  static async addQuestion({
    entityId,
    input,
    db,
  }: {
    entityId: string;
    input: any;
    db: any;
  }) {
    try {
      // Verify ownership
      const form = await db.query.customForms.findFirst({
        where: and(
          eq(customForms.id, input.formId),
          eq(customForms.entityId, entityId),
        ),
      });
      if (!form) throw new GraphQLError("Form not found or access denied");

      const [newQuestion] = await db
        .insert(questions)
        .values({
          formId: input.formId,
          type: input.type,
          question: input.question,
          description: input.description,
          order: input.order,
          required: input.required,
          maxLength: input.maxLength,
          min: input.min,
          max: input.max,
          scale: input.scale,
          ratingType: input.ratingType,
          options: input.options,
          labels: input.labels,
          allowMultiple: input.allowMultiple,
          legalText: input.legalText,
        })
        .returning();

      return newQuestion;
    } catch (error) {
      log.error("Error in addQuestion", { error, entityId });
      throw error;
    }
  }

  static async editQuestion({
    id,
    entityId,
    input,
    db,
  }: {
    id: string;
    entityId: string;
    input: any;
    db: any;
  }) {
    try {
      // Verify ownership via join or subquery
      const questionRecord = await db.query.questions.findFirst({
        where: eq(questions.id, id),
        with: { form: true },
      });

      if (!questionRecord || questionRecord.form.entityId !== entityId) {
        throw new GraphQLError("Question not found or access denied");
      }

      const [updatedQuestion] = await db
        .update(questions)
        .set({
          type: input.type,
          question: input.question,
          description: input.description,
          order: input.order,
          required: input.required,
          maxLength: input.maxLength,
          min: input.min,
          max: input.max,
          scale: input.scale,
          ratingType: input.ratingType,
          options: input.options,
          labels: input.labels,
          allowMultiple: input.allowMultiple,
          legalText: input.legalText,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, id))
        .returning();

      return updatedQuestion;
    } catch (error) {
      log.error("Error in editQuestion", { error, id, entityId });
      throw error;
    }
  }

  static async deleteQuestion({
    id,
    entityId,
    db,
  }: {
    id: string;
    entityId: string;
    db: any;
  }) {
    try {
      const questionRecord = await db.query.questions.findFirst({
        where: eq(questions.id, id),
        with: { form: true },
      });

      if (!questionRecord || questionRecord.form.entityId !== entityId) {
        throw new GraphQLError("Question not found or access denied");
      }

      await db.delete(questions).where(eq(questions.id, id));
      return { id, deleted: true };
    } catch (error) {
      log.error("Error in deleteQuestion", { error, id, entityId });
      throw error;
    }
  }

  static async reorderQuestions({
    entityId,
    input,
    db,
  }: {
    entityId: string;
    input: { id: string; order: number }[];
    db: any;
  }) {
    try {
      if (!input || input.length === 0) return [];

      return await db.transaction(async (tx: any) => {
        const updatedQuestions = [];

        for (const item of input) {
          const questionRecord = await tx.query.questions.findFirst({
            where: eq(questions.id, item.id),
            with: { form: true },
          });

          if (!questionRecord || questionRecord.form.entityId !== entityId) {
            throw new GraphQLError(
              `Question ID ${item.id} not found or access denied`,
            );
          }

          const [updated] = await tx
            .update(questions)
            .set({ order: item.order, updatedAt: new Date() })
            .where(eq(questions.id, item.id))
            .returning();

          updatedQuestions.push(updated);
        }

        return updatedQuestions;
      });
    } catch (error) {
      log.error("Error in reorderQuestions", { error, entityId });
      throw error;
    }
  }

  static async updateFormSettings({
    id,
    entityId,
    input,
    db,
  }: {
    id: string;
    entityId: string;
    input: any;
    db: any;
  }) {
    try {
      const [updatedForm] = await db
        .update(customForms)
        .set({
          ...(input.previewType && { previewType: input.previewType }),
          ...(input.appearance && { appearance: input.appearance }),
          updatedAt: new Date(),
        })
        .where(and(eq(customForms.id, id), eq(customForms.entityId, entityId)))
        .returning();

      if (!updatedForm) throw new GraphQLError("Form not found");
      return updatedForm;
    } catch (error) {
      log.error("Error in updateFormSettings", { error, id, entityId });
      throw error;
    }
  }
}
