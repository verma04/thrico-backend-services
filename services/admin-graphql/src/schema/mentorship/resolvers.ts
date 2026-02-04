import { and, desc, eq } from "drizzle-orm";
// import { db } from "../../../../schema";
import {
  mentorShip,
  mentorshipCategory,
  mentorshipSkills,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { userOrg } from "../../utils/common/userOrg";
import { MentorshipService } from "@thrico/services";
import { sendMentorshipNotification } from "../../queue/mentorship.queue";

const mentorShipResolvers = {
  Query: {
    async getMentorSkills(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const set = await db.query.mentorshipSkills.findMany({
          where: (mentorshipCategory: any, { eq }: any) =>
            eq(mentorshipCategory.entity, entity),
          orderBy: (mentorshipCategory: any, { desc }: any) => [
            desc(mentorshipCategory.createdAt),
          ],
        });

        return set;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getAllMentor(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const { limit, offset } = input || {};

        console.log(input);
        if (input.status === "ALL") {
          const set = await db.query.mentorShip.findMany({
            where: (mentorShip: any, { eq }: any) =>
              eq(mentorShip.entity, entity),
            limit: limit || 20,
            offset: offset || 0,
            orderBy: (mentorShip: any, { desc }: any) => [
              desc(mentorShip.createdAt),
            ],
            with: {
              user: {
                with: {
                  user: {
                    with: {
                      about: true,
                    },
                  },
                },
              },
            },
          });
          return set;
        } else {
          const set = await db.query.mentorShip.findMany({
            where: (mentorShip: any, { eq }: any) =>
              and(
                eq(mentorShip.entity, entity),
                eq(mentorShip.mentorStatus, input.status),
              ),
            limit: limit || 20,
            offset: offset || 0,
            orderBy: (mentorShip: any, { desc }: any) => [
              desc(mentorShip.createdAt),
            ],
            with: {
              user: {
                with: {
                  user: {
                    with: {
                      about: true,
                    },
                  },
                },
              },
            },
          });
          return set;
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getMentorCategories(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const set = await db.query.mentorshipCategory.findMany({
          where: (mentorshipCategory: any, { eq }: any) =>
            eq(mentorshipCategory.entity, entity),
          orderBy: (mentorshipCategory: any, { desc }: any) => [
            desc(mentorshipCategory.createdAt),
          ],
        });

        return set;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getAllPendingMentorships(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const { limit, offset } = input || {};

        return await MentorshipService.getAllPendingMentorships({
          db,
          entityId: entity,
          limit: limit || 20,
          offset: offset || 0,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async mentorShipActions(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const check = await db.query.mentorShip.findFirst({
          where: (mentorShip: any, { eq }: any) =>
            and(eq(mentorShip.id, input.mentorshipID)),
        });
        console.log(check);

        const update = await db
          .update(mentorShip)
          .set({ isApproved: true })
          .where(eq(mentorShip.id, input.mentorshipID))
          .returning();

        console.log(update);
        return update; // Ensure return
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async addMentorShipCategory(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const set = await db.query.mentorshipCategory.findFirst({
          where: (mentorshipCategory: any, { eq }: any) =>
            and(
              eq(mentorshipCategory.entity, entity),
              eq(mentorshipCategory.title, input.title),
            ),
        });

        if (set) {
          return new GraphQLError("Category AllReady exist", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
        }
        const createentity = await db
          .insert(mentorshipCategory)
          .values({
            title: input.title,
            entity,
          })
          .returning();
        return createentity;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateMentorShipCategory(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const [updated] = await db
          .update(mentorshipCategory)
          .set({
            title: input.title,
            updatedAt: new Date(),
          })
          .where(eq(mentorshipCategory.id, input.id))
          .returning();

        return updated;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteMentorShipCategory(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const category = await db
          .delete(mentorshipCategory)
          .where(eq(mentorshipCategory.id, input.id))
          .returning();
        return category[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async duplicateMentorShipCategory(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        const category = await db.query.mentorshipCategory.findFirst({
          where: and(eq(mentorshipCategory.id, input.id)),
        });

        if (!category) {
          throw new Error("Category not found");
        }

        console.log(input);

        const createFeedBack = await db
          .insert(mentorshipCategory)
          .values({
            entity: category.entity,
            title: `${category.title}-copy-1`,
          })
          .returning();
        return createFeedBack;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async addMentorShipSkills(_: any, { input }: any, context: any) {
      try {
        console.log(input);
        const { db, entity } = await checkAuth(context);

        const set = await db.query.mentorshipSkills.findFirst({
          where: (mentorShipSkills: any, { eq }: any) =>
            and(
              eq(mentorShipSkills.entity, entity),
              eq(mentorShipSkills.title, input.title),
            ),
        });

        console.log(set);

        if (set) {
          return new GraphQLError("Skill AllReady exist", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
        }
        const createentity = await db
          .insert(mentorshipSkills)
          .values({
            title: input.title,
            entity,
          })
          .returning();
        return createentity;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateMentorShipSkills(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const [updated] = await db
          .update(mentorshipSkills)
          .set({
            title: input.title,
            updatedAt: new Date(),
          })
          .where(eq(mentorshipSkills.id, input.id))
          .returning();

        return updated;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteMentorShipSkills(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const category = await db
          .delete(mentorshipSkills)
          .where(eq(mentorshipSkills.id, input.id))
          .returning();
        return category[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async duplicateMentorShipSkills(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const category = await db.query.mentorshipSkills.findFirst({
          where: and(eq(mentorshipSkills.id, input.id)),
        });

        if (!category) {
          throw new Error("Skill category not found");
        }

        console.log(input);

        const createFeedBack = await db
          .insert(mentorshipSkills)
          .values({
            entity: category.entity,
            title: `${category.title}-copy-1`,
          })
          .returning();
        return createFeedBack;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateMentorshipStatus(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        return await MentorshipService.updateMentorshipStatus({
          db,
          mentorshipId: input.mentorshipId,
          status: input.status,
          queueFn: async (data: any) => {
            await sendMentorshipNotification({
              ...data,
            });
          },
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async featureMentor(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        return await MentorshipService.featureMentor({
          db,
          mentorshipId: input.mentorshipId,
          isFeatured: input.isFeatured,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { mentorShipResolvers };
