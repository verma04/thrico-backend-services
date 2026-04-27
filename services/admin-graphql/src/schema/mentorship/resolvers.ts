import { and, desc, eq, count, inArray, sql } from "drizzle-orm";
// import { db } from "../../../../schema";
import {
  mentorShip,
  mentorshipCategory,
  mentorshipSkills,
  userToEntity,
  adminAuditLogs,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { userOrg } from "../../utils/common/userOrg";
import { MentorshipService } from "@thrico/services";
import { log } from "@thrico/logging";
import { sendMentorshipNotification } from "../../queue/mentorship.queue";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

const mentorShipResolvers: any = {
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
        const {
          limit,
          offset,
          status,
          searchQuery,
          category,
          isTopMentor,
          isFeatured,
        } = input || {};

        const filters = [eq(mentorShip.entity, entity)];

        if (status && status !== "ALL") {
          filters.push(eq(mentorShip.mentorStatus, status));
        }

        if (searchQuery) {
          filters.push(
            sql`${mentorShip.displayName} ILIKE ${`%%${searchQuery}%%`}`,
          );
        }

        if (category) {
          filters.push(eq(mentorShip.category, category));
        }

        if (isTopMentor !== undefined) {
          filters.push(eq(mentorShip.isTopMentor, isTopMentor));
        }

        if (isFeatured !== undefined) {
          filters.push(eq(mentorShip.isFeatured, isFeatured));
        }

        const set = await db.query.mentorShip.findMany({
          where: and(...filters),
          limit: limit || 20,
          offset: offset || 0,
          orderBy: (mentorShip: any, { desc }: any) => [
            desc(mentorShip.isTopMentor),
            desc(mentorShip.createdAt),
          ],
          with: {
            mentorUser: {
              with: {
                user: {
                  with: {
                    about: true,
                    profile: true,
                  },
                },
              },
            },
            category: true,
          },
        });
        return set;
      } catch (error) {
        console.log("Error in getAllMentor:", error);
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
    async mentorshipRequests(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const { limit, offset } = input || {};

        const set = await db.query.mentorShip.findMany({
          where: and(
            eq(mentorShip.entity, entity),
            inArray(mentorShip.mentorStatus, ["PENDING", "REQUESTED"]),
          ),
          limit: limit || 20,
          offset: offset || 0,
          orderBy: (mentorShip: any, { desc }: any) => [
            desc(mentorShip.createdAt),
          ],
          with: {
            mentorUser: {
              with: {
                user: {
                  with: {
                    about: true,
                    profile: true,
                  },
                },
              },
            },
            category: true,
          },
        });
        return set;
      } catch (error) {
        console.log("Error in mentorshipRequests:", error);
        throw error;
      }
    },
    async getMentorshipStats(_: any, __: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [
          totalMentorsResult,
          approvedMentorsResult,
          pendingMentorsResult,
          rejectedMentorsResult,
          totalCategoriesResult,
        ] = await Promise.all([
          db
            .select({ count: count() })
            .from(mentorShip)
            .where(eq(mentorShip.entity, entity)),
          db
            .select({ count: count() })
            .from(mentorShip)
            .where(
              and(
                eq(mentorShip.entity, entity),
                eq(mentorShip.mentorStatus, "APPROVED"),
              ),
            ),
          db
            .select({ count: count() })
            .from(mentorShip)
            .where(
              and(
                eq(mentorShip.entity, entity),
                inArray(mentorShip.mentorStatus, ["PENDING", "REQUESTED"]),
              ),
            ),
          db
            .select({ count: count() })
            .from(mentorShip)
            .where(
              and(
                eq(mentorShip.entity, entity),
                eq(mentorShip.mentorStatus, "REJECTED"),
              ),
            ),
          db
            .select({ count: count() })
            .from(mentorshipCategory)
            .where(eq(mentorshipCategory.entity, entity)),
        ]);

        return {
          totalMentors: Number(totalMentorsResult[0]?.count || 0),
          approvedMentors: Number(approvedMentorsResult[0]?.count || 0),
          pendingMentors: Number(pendingMentorsResult[0]?.count || 0),
          rejectedMentors: Number(rejectedMentorsResult[0]?.count || 0),
          totalCategories: Number(totalCategoriesResult[0]?.count || 0),
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getMentorById(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const mentorData = await db.query.mentorShip.findFirst({
          where: and(eq(mentorShip.id, id), eq(mentorShip.entity, entity)),
          with: {
            mentorUser: {
              with: {
                user: {
                  with: {
                    about: true,
                    profile: true,
                  },
                },
              },
            },
            category: true,
          },
        });

        if (!mentorData) {
          throw new GraphQLError("Mentor not found");
        }

        return mentorData;
      } catch (error) {
        log.error("Error in getMentorById:", error);
        throw error;
      }
    },
    async mentorshipAuditLogs(_: any, { pagination }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const { limit = 20, page = 1 } = pagination || {};
        const offset = (page - 1) * limit;

        const [data, [{ total }]] = await Promise.all([
          db.query.adminAuditLogs.findMany({
            where: and(
              eq(adminAuditLogs.entityId, entity),
              eq(adminAuditLogs.module, "MENTORSHIP"),
            ),
            limit,
            offset,
            orderBy: [desc(adminAuditLogs.createdAt)],
            with: {
              admin: {
                with: {
                  about: true,
                },
              },
              targetUser: {
                with: {
                  about: true,
                },
              },
            },
          }),
          db
            .select({ total: count() })
            .from(adminAuditLogs)
            .where(
              and(
                eq(adminAuditLogs.entityId, entity),
                eq(adminAuditLogs.module, "MENTORSHIP"),
              ),
            ),
        ]);

        return {
          data,
          meta: {
            currentPage: page,
            totalPages: Math.ceil(Number(total) / limit),
            totalItems: Number(total),
            itemsPerPage: limit,
            hasNextPage: offset + limit < Number(total),
            hasPreviousPage: page > 1,
          },
        };
      } catch (error) {
        console.log("Error in mentorshipAuditLogs:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async addMentor(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);
        const { userId, description, ...mentorData } = input;

        console.log(input);

        const memberCheck = await db.query.userToEntity.findFirst({
          where: and(
            eq(userToEntity.id, userId),
            eq(userToEntity.entityId, entity),
          ),
        });

        if (!memberCheck) {
          throw new GraphQLError("User is not a member of this entity");
        }

        const thricoUserId = memberCheck.userId;

        const check = await db.query.mentorShip.findFirst({
          where: and(
            eq(mentorShip.user, thricoUserId),
            eq(mentorShip.entity, entity),
          ),
        });

        if (check) {
          const status = check.mentorStatus;
          let message = "User is already registered as a mentor.";

          if (status === "APPROVED") {
            message = "User is already an approved mentor for this entity.";
          } else if (status === "PENDING" || status === "REQUESTED") {
            message =
              "User already has a pending mentorship application awaiting review.";
          } else if (status === "REJECTED") {
            message =
              "User's previous mentorship application was rejected. Please review their profile before adding again.";
          } else if (status === "BLOCKED") {
            message =
              "User is currently blocked from the mentorship program in this entity.";
          }

          throw new GraphQLError(message);
        }

        const randomSlug = `mentor-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const availability = [
          { name: "Monday", isAvailable: false },
          { name: "Tuesday", isAvailable: false },
          { name: "Wednesday", isAvailable: false },
          { name: "Thursday", isAvailable: false },
          { name: "Friday", isAvailable: false },
          { name: "Saturday", isAvailable: false },
          { name: "Sunday", isAvailable: false },
        ];

        const [newMentor] = await db
          .insert(mentorShip)
          .values({
            ...mentorData,
            about: description || mentorData.about,
            user: thricoUserId,
            entity,
            isApproved: true,
            mentorStatus: "APPROVED",
            slug: randomSlug,
            availability,
            isKyc: true,
            agreement: mentorData.agreement ?? true,
          })
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "MENTORSHIP",
          action: "DIRECT_ADD_MENTOR",
          resourceId: newMentor.id,
          targetUserId: thricoUserId,
          newState: input,
        });

        await MentorshipService.sendMentorshipStatusEmail({
          db,
          userId: thricoUserId,
          entityId: entity,
          status: "APPROVED",
        });

        return newMentor;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async mentorShipActions(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        const updated = await MentorshipService.updateMentorshipStatus({
          db,
          mentorshipId: input.mentorshipID,
          status: "APPROVED",
          queueFn: async (data: any) => {
            await sendMentorshipNotification(data);
          },
        });

        return [updated];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async addMentorShipCategory(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id } = await checkAuth(context);

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

        await createAuditLog(db, {
          adminId: id,
          entityId: entity,
          module: "MENTORSHIP",
          action: "ADD_MENTORSHIP_CATEGORY",
          resourceId: createentity[0]?.id,
          newState: input,
        });

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
        const { db, entity, id } = await checkAuth(context);

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

        await createAuditLog(db, {
          adminId: id,
          entityId: entity,
          module: "MENTORSHIP",
          action: "ADD_MENTORSHIP_SKILL",
          resourceId: createentity[0]?.id,
          newState: input,
        });

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
    async markTopMentor(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [updated] = await db
          .update(mentorShip)
          .set({
            isTopMentor: input.isTopMentor,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(mentorShip.id, input.mentorshipId),
              eq(mentorShip.entity, entity),
            ),
          )
          .returning();

        return updated;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async removeMentor(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [deleted] = await db
          .delete(mentorShip)
          .where(
            and(
              eq(mentorShip.id, input.mentorshipId),
              eq(mentorShip.entity, entity),
            ),
          )
          .returning();

        if (!deleted) {
          throw new GraphQLError(
            "Mentor not found or not authorized to delete",
          );
        }

        return deleted;
      } catch (error) {
        console.log("Error in removeMentor:", error);
        throw error;
      }
    },
    async updateMentor(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);
        const { id, ...updateData } = input;

        const existing = await db.query.mentorShip.findFirst({
          where: and(eq(mentorShip.id, id), eq(mentorShip.entity, entity)),
        });

        if (!existing) {
          throw new GraphQLError("Mentor not found");
        }

        const [updated] = await db
          .update(mentorShip)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(and(eq(mentorShip.id, id), eq(mentorShip.entity, entity)))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "MENTORSHIP",
          action: "UPDATE_PROFILE",
          resourceId: id,
          targetUserId: existing.user,
          previousState: existing,
          newState: updated,
        });

        return updated;
      } catch (error) {
        console.log("Error in updateMentor:", error);
        throw error;
      }
    },
  },
  mentor: {
    description: (parent: any) => parent.about,
    mentorSince: (parent: any) => parent.createdAt,
  },
};

export { mentorShipResolvers };
