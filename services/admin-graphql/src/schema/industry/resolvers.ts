import { and, eq, desc, inArray } from "drizzle-orm";
import { industry } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { createAuditLog } from "../../utils/audit/auditLog.utils";
import { log } from "@thrico/logging";

const industryResolvers: any = {
  Query: {
    async getIndustries(_: any, __: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const result = await db.query.industry.findMany({
          where: (industry: any, { eq }: any) =>
            eq(industry.entityId, entity),
          orderBy: (industry: any, { desc }: any) => [
            desc(industry.createdAt),
          ],
        });

        return result;
      } catch (error) {
        log.error("Error in getIndustries:", error);
        throw error;
      }
    },
  },

  Mutation: {
    async addIndustry(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        // Prevent duplicates within same entity
        const existing = await db.query.industry.findFirst({
          where: (ind: any, { and, eq }: any) =>
            and(eq(ind.entityId, entity), eq(ind.title, input.title)),
        });

        if (existing) {
          throw new GraphQLError(
            `Industry "${input.title}" already exists for this entity.`,
            { extensions: { code: "BAD_USER_INPUT" } },
          );
        }

        const [created] = await db
          .insert(industry)
          .values({
            title: input.title,
            entityId: entity,
          })
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "INDUSTRY",
          action: "ADD_INDUSTRY",
          resourceId: created.id,
          newState: input,
        });

        return created;
      } catch (error) {
        log.error("Error in addIndustry:", error);
        throw error;
      }
    },

    async updateIndustry(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        const existing = await db.query.industry.findFirst({
          where: (ind: any, { and, eq }: any) =>
            and(eq(ind.id, input.id), eq(ind.entityId, entity)),
        });

        if (!existing) {
          throw new GraphQLError("Industry not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const [updated] = await db
          .update(industry)
          .set({
            title: input.title,
            updatedAt: new Date(),
          })
          .where(and(eq(industry.id, input.id), eq(industry.entityId, entity)))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "INDUSTRY",
          action: "UPDATE_INDUSTRY",
          resourceId: updated.id,
          previousState: existing,
          newState: updated,
        });

        return updated;
      } catch (error) {
        log.error("Error in updateIndustry:", error);
        throw error;
      }
    },

    async deleteIndustry(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        const [deleted] = await db
          .delete(industry)
          .where(and(eq(industry.id, input.id), eq(industry.entityId, entity)))
          .returning();

        if (!deleted) {
          throw new GraphQLError(
            "Industry not found or not authorized to delete.",
            { extensions: { code: "NOT_FOUND" } },
          );
        }

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "INDUSTRY",
          action: "DELETE_INDUSTRY",
          resourceId: deleted.id,
          previousState: deleted,
        });

        return deleted;
      } catch (error) {
        log.error("Error in deleteIndustry:", error);
        throw error;
      }
    },

    async bulkAddIndustries(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);
        if (!input || !input.titles || input.titles.length === 0) {
          return [];
        }
        const { titles } = input;

        // Filter out existing industries
        const existingIndustries = await db.query.industry.findMany({
          where: (ind: any, { and, eq, inArray }: any) =>
            and(eq(ind.entityId, entity), inArray(ind.title, titles)),
        });

        const existingTitles = new Set(
          existingIndustries.map((ind: any) => ind.title),
        );
        const newTitles: string[] = [
          ...new Set(
            (titles as string[]).filter((title: string) => !existingTitles.has(title)),
          ),
        ];

        if (newTitles.length === 0) {
          return [];
        }

        const valuesToInsert = newTitles.map((title: string) => ({
          title,
          entityId: entity,
        }));

        const created = await db
          .insert(industry)
          .values(valuesToInsert)
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "INDUSTRY",
          action: "BULK_ADD_INDUSTRIES",
          resourceId: "bulk",
          newState: { titles: newTitles },
        });

        return created;
      } catch (error) {
        log.error("Error in bulkAddIndustries:", error);
        throw error;
      }
    },
  },
};

export { industryResolvers };
