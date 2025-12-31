// import { db } from "@thrico/database";
import { announcements, highlights } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import moment from "moment";
import { GraphQLError } from "graphql";

export const announcementsResolvers = {
  Query: {
    async getAllAnnouncements(_: any, {}: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const results = await db.query.announcements.findMany({
          where: (announcements: any, { eq }: any) =>
            eq(announcements.entity, entity),
          orderBy: (announcements: any, { desc }: any) =>
            desc(announcements.createdAt),
        });
        return results;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addAnnouncement(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        // const userOrgId = await userOrg(data.id); // Replaced with entity from checkAuth

        const add = await db
          .insert(announcements)
          .values({
            note: input.note,
            description: input.description,
            entity: entity,
          })
          .returning();

        console.log("TTL:", input.ttl);
        const expiry =
          input.ttl === "no"
            ? new Date(2060, 0, 1) // 2060
            : moment().add(Number(input.ttl), "d").toDate();

        const newhighlights = await db
          .insert(highlights)
          .values({
            highlightsType: "ANNOUNCEMENT",
            entity: entity,
            isExpirable: input.ttl === "no" ? false : true,
            expiry: expiry,
            announcementId: add[0].id,
          })
          .returning();

        console.log(newhighlights);
        return newhighlights[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
