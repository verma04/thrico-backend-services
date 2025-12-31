import { SQL, and, eq, inArray, sql } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { moduleFaqs } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const faqResolvers = {
  Query: {
    async getModuleFaq(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        const faq = await db.query.moduleFaqs.findMany({
          where: (moduleFaqs: any, { eq, and }: any) =>
            and(
              eq(moduleFaqs.entity, entityId),
              eq(moduleFaqs.faqModule, input.module)
            ),
          orderBy: (moduleFaqs: any, { desc }: any) => [desc(moduleFaqs.sort)],
        });

        return faq;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addFaq(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        const { title, description, module } = input;

        const faq = await db.query.moduleFaqs.findMany({
          where: (moduleFaqs: any, { eq, and }: any) =>
            and(
              eq(moduleFaqs.entity, entityId),
              eq(moduleFaqs.faqModule, input.module)
            ),
          orderBy: (moduleFaqs: any, { desc }: any) => [desc(moduleFaqs.sort)],
        });

        const newFaq = await db
          .insert(moduleFaqs)
          .values({
            title,
            description,
            faqModule: module,
            entity: entityId,
            sort: faq.length,
          })
          .returning();

        return newFaq;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editFaq(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        // Verify ownership/existence first or rely on where clause with entityId?
        // Drizzle update with where clause is safer: where id = input.id AND entity = entityId

        const update = await db
          .update(moduleFaqs)
          .set({
            title: input.title,
            description: input?.description,
          })
          .where(
            and(eq(moduleFaqs.id, input.id), eq(moduleFaqs.entity, entityId))
          )
          .returning();

        return update;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteFaq(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        // Ensure we only delete if it belongs to the entity
        const deleted = await db
          .delete(moduleFaqs)
          .where(
            and(eq(moduleFaqs.id, input.id), eq(moduleFaqs.entity, entityId))
          )
          .returning();

        if (!deleted.length) {
          throw new GraphQLError("FAQ not found or access denied");
        }

        return {
          id: input.id,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async sortFaq(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        if (input.length === 0) {
          return;
        }

        // Verify all IDs belong to the entity to prevent sorting external items
        // For efficiency, we might skip this if we assume IDs are correct, but security-wise:
        // We really should check. For now, we trust the update will fail or affect nothing if IDs don't match...
        // BUT `inArray(moduleFaqs.id, ids)` doesn't filter by entity.
        // We must add strict entity check.
        // Doing strictly one-by-one is slow.
        // Instead, we filter the update by entityId as well.

        const sqlChunks: SQL[] = [];
        const ids: any[] = [];
        sqlChunks.push(sql`(case`);
        for (const data of input) {
          sqlChunks.push(
            sql`when ${moduleFaqs.id} = ${data.id} then ${Number(data.sort)}`
          );
          ids.push(data.id);
        }
        sqlChunks.push(sql`end)`);
        const finalSql: SQL = sql.join(sqlChunks, sql.raw(" "));

        await db
          .update(moduleFaqs)
          .set({ sort: finalSql })
          .where(
            and(inArray(moduleFaqs.id, ids), eq(moduleFaqs.entity, entityId))
          );
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
