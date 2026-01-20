import checkAuth from "../../utils/auth/checkAuth.utils";
import { userOrg } from "../../utils/common/userOrg";
import { GraphQLError } from "graphql";
import { groupInterests } from "@thrico/database";
import { and, eq } from "drizzle-orm";

const interestsResolvers = {
  Query: {
    async getAllGroupInterests(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;

        const userOrgId = await userOrg(data.id, db);
        const interests = await db.query.groupInterests.findMany({
          where: (groupInterests: any, { eq }: any) =>
            eq(groupInterests.entity, userOrgId),
          orderBy: (groupInterests: any, { desc }: any) => [
            desc(groupInterests.createdAt),
          ],
        });

        return interests;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addGroupInterests(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;

        const userOrgId = await userOrg(data.id, db);

        const set = await db.query.groupInterests.findFirst({
          where: (groupInterests: any, { eq }: any) =>
            and(
              eq(groupInterests.entity, userOrgId),
              eq(groupInterests.title, input.title)
            ),
        });

        if (set) {
          return new GraphQLError(
            "The Interests name 'AllReady' already exists",
            {
              extensions: {
                code: "NOT FOUND",
                http: { status: 400 },
              },
            }
          );
        }
        const newGroupInterests = await db
          .insert(groupInterests)
          .values({
            title: input.title,
            entity: userOrgId,
          })
          .returning();

        return newGroupInterests;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteGroupInterests(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;
        await userOrg(data.id, db);
        const interests = await db
          .delete(groupInterests)
          .where(eq(groupInterests.id, input.id))
          .returning();
        return interests[0]; // Returning object not array for delete usually
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async duplicateGroupInterests(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        const interests = await db.query.groupInterests.findFirst({
          where: and(eq(groupInterests.id, input.id)),
        });

        if (!interests) {
          throw new Error("Interests not found");
        }

        console.log(input);

        const newInterests = await db
          .insert(groupInterests)
          .values({
            entity: interests.entity,
            title: `${interests.title}-copy-1`,
          })
          .returning();
        return newInterests;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editGroupInterests(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        const interests = await db
          .update(groupInterests)
          .set({ title: input.title })
          .where(eq(groupInterests.id, input.id))
          .returning();
        return interests[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { interestsResolvers };
