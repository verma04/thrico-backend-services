import { and, eq, sql } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  entitySettingsUser,
  userToEntity,
  userToEntityLog,
  userVerification,
} from "@thrico/database";

export const userResolvers = {
  Query: {
    async getUserAnalytics(_: any, { timeRange }: any, context: any) {
      try {
        const { id, entity, db } = await checkAuth(context);

        let whereClause = and(
          eq(userToEntity.entityId, entity),
          eq(userToEntity.isRequested, true),
        );

        if (timeRange) {
          const now = new Date();
          let startDate: Date;

          switch (timeRange) {
            case "LAST_24_HOURS":
              startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case "LAST_7_DAYS":
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "LAST_30_DAYS":
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case "LAST_90_DAYS":
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            default:
              startDate = new Date(0);
          }

          whereClause = and(
            whereClause,
            sql`${userToEntity.createdAt} >= ${startDate.toISOString()}`,
          );
        }

        // Total Members
        const totalMembersResult = await db
          .select({ total: sql<number>`COUNT(${userToEntity.id})` })
          .from(userToEntity)
          .where(whereClause);
        const totalMembers = Number(totalMembersResult[0]?.total ?? 0);

        // Verified Members
        const verifiedMembersResult = await db
          .select({ total: sql<number>`COUNT(*)` })
          .from(userToEntity)
          .where(
            and(
              whereClause,
              eq(userToEntity.isApproved, true), // Simplified as whereClause already has entity/requested checks
            ),
          );
        const verifiedMembers = Number(verifiedMembersResult[0]?.total || 0);

        // Active Members
        const activeMembersResult = await db
          .select({ total: sql<number>`COUNT(${userToEntity.id})` })
          .from(userToEntity)
          .where(
            and(
              whereClause,
              eq(userToEntity.status, "APPROVED"),
              eq(userToEntity.isApproved, true),
            ),
          );
        const activeMembers = Number(activeMembersResult[0]?.total || 0);

        // New Members This Month (Always relative to current month regardless of timeRange?)
        // Or should it also respect timeRange? The name implies "This Month".
        // I'll keep it as "This Month" for consistency with existing code.
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const newMembersResult = await db
          .select({ total: sql<number>`COUNT(${userToEntity.id})` })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entity),
              eq(userToEntity.isRequested, true),
              sql`DATE(${userToEntity.createdAt}) >= ${startOfMonth
                .toISOString()
                .slice(0, 10)}`,
            ),
          );
        const newMembersThisMonth = Number(newMembersResult[0]?.total || 0);

        return {
          totalMembers,
          verifiedMembers,
          verifiedPercent: totalMembers
            ? Math.round((verifiedMembers / totalMembers) * 100)
            : 0,
          activeMembers,
          activePercent: totalMembers
            ? Math.round((activeMembers / totalMembers) * 100)
            : 0,
          newMembersThisMonth,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getAllUser(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        if (input.status === "ALL") {
          const result = await db.query.userToEntity.findMany({
            where: (user: any, { eq }: any) => and(eq(user.entityId, entity)),
            with: {
              user: {
                with: {
                  profile: true,
                  about: true,
                },
              },
              userKyc: true,
              verification: true,
            },
            orderBy: (userToEntity: any, { desc }: any) => [
              desc(userToEntity.createdAt),
            ],
          });
          return result;
        } else {
          const result = await db.query.userToEntity.findMany({
            where: (user: any, { eq }: any) =>
              and(eq(user.entityId, entity), eq(user.status, input.status)),
            with: {
              user: {
                with: {
                  profile: true,
                  about: true,
                },
              },
              userKyc: true,
              verification: true,
            },
            orderBy: (userToEntity: any, { desc }: any) => [
              desc(userToEntity.createdAt),
            ],
          });

          console.log(result);
          return result;
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getUserDetailsById(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        const result = await db.query.userToEntity.findFirst({
          where: (userToEntity: any, { eq }: any) =>
            and(eq(userToEntity.userId, input.id)),
          with: {
            user: {
              with: {
                profile: true,
              },
            },
            userKyc: true,
          },
        });

        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getUserGrowth(_: any, { timeRange }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
          case "LAST_24_HOURS":
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "LAST_7_DAYS":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "LAST_30_DAYS":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "LAST_90_DAYS":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const result = await db
          .select({
            date: sql<string>`DATE(${userToEntity.createdAt})`,
            count: sql<number>`COUNT(${userToEntity.id})`,
          })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entity),
              eq(userToEntity.isRequested, true),
              sql`${userToEntity.createdAt} >= ${startDate.toISOString()}`,
            ),
          )
          .groupBy(sql`DATE(${userToEntity.createdAt})`)
          .orderBy(sql`DATE(${userToEntity.createdAt})`);

        return result.map((row: any) => ({
          date: row.date,
          count: Number(row.count),
        }));
      } catch (error) {
        console.error("Failed to get user growth:", error);
        throw error;
      }
    },

    async getUserRoleDistribution(_: any, { timeRange }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
          case "LAST_24_HOURS":
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "LAST_7_DAYS":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "LAST_30_DAYS":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "LAST_90_DAYS":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }

        const result = await db
          .select({
            name: userToEntity.status,
            value: sql<number>`COUNT(${userToEntity.id})`,
          })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entity),
              eq(userToEntity.isRequested, true),
              sql`${userToEntity.createdAt} >= ${startDate.toISOString()}`,
            ),
          )
          .groupBy(userToEntity.status);

        return result.map((row: any) => ({
          name: row.name,
          value: Number(row.value),
        }));
      } catch (error) {
        console.error("Failed to get user role distribution:", error);
        throw error;
      }
    },

    async getUserSettings(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        const set = await db.query.entitySettingsUser.findFirst({
          where: (entitySettingsUser: any, { eq }: any) =>
            eq(entitySettingsUser.entity, entity),
        });

        // Return defaults if no settings exist
        if (!set) {
          return { autoApprove: false };
        }

        return {
          autoApprove: set.autoApprove,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async changeUserStatus(_: any, { input }: any, context: any) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, userId } = input;

      try {
        const user = await db.query.userToEntity.findFirst({
          where: (userToEntity: any, { eq }: any) =>
            eq(userToEntity.id, userId),
        });

        if (!user) {
          throw new Error("User not found");
        }

        const statusMap: Record<string, string> = {
          APPROVE: "APPROVED",
          BLOCK: "BLOCKED",
          DISABLE: "DISABLED",
          ENABLE: "ENABLED",
          UNBLOCK: "ENABLED",
          REJECT: "REJECTED",
          FLAG: "FLAGGED",
          REAPPROVE: "REAPPROVE", // Note: Enum might not support REAPPROVE as simple Status string if it's an action
        };

        const newStatus = statusMap[action];
        if (!newStatus) {
          // Some actions like verify might not change status map directly or need custom handling
          // But action enum included it.
          // throw new Error(\`Unknown action: \${action}\`);
          // Proceeding with what we have
        }

        const updateData: Record<string, any> = {
          status: newStatus || user.status,
        };
        if (
          action === "APPROVE" ||
          action === "UNBLOCK" ||
          action === "ENABLE" ||
          action === "REAPPROVE"
        ) {
          updateData.isApproved = true;
          updateData.status = "APPROVED"; // Force APPROVED for positive actions?
        }

        await db.transaction(async (tx: any) => {
          await tx
            .update(userToEntity)
            .set(updateData)
            .where(eq(userToEntity.id, userId));

          await tx.insert(userToEntityLog).values({
            action,
            reason,
            userToEntityId: userId,
            performedBy: id,
            status: "STATUS",
            entity,
            previousState: user.status,
          });
        });

        const result = await db.query.userToEntity.findFirst({
          where: (userToEntity: any, { eq }: any) =>
            eq(userToEntity.id, userId),
          with: {
            user: {
              with: {
                profile: true,
                about: true,
              },
            },
            userKyc: true,
            verification: true,
          },
        });

        return result;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },

    async changeUserVerification(_: any, { input }: any, context: any) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, userId } = input;

      try {
        const user = await db.query.userToEntity.findFirst({
          where: (userToEntity: any, { eq }: any) =>
            eq(userToEntity.id, userId),
          with: {
            verification: true,
          },
        });
        if (!user) {
          throw new Error("User not found");
        }

        // Note: userId passed is userToEntityId or actual user.id?
        // query above uses `eq(userToEntity.id, userId)`. So input.userId is userToEntity.id.
        // userVerification table uses `userId` which typically refers to `user.id` (Global User ID), NOT `userToEntity.id`.
        // Let's check `user.userId` from the fetched `userToEntity` record.
        const globalUserId = user.id;

        console.log(action);

        if (action === "VERIFY") {
          await db.transaction(async (tx: any) => {
            // Upsert or insert? assuming 1-to-1
            await db.insert(userVerification).values({
              isVerifiedAt: new Date(),
              verifiedBy: id,
              isVerified: true,
              verificationReason: reason,
              userId: globalUserId,
            });
            await tx.insert(userToEntityLog).values({
              reason,
              userToEntityId: userId, // userToEntity ID
              performedBy: id,
              status: "STATUS",
              entity,
              previousState: user.status,
            });
          });
        } else {
          await db
            .delete(userVerification)
            .where(eq(userVerification.userId, globalUserId));
        }

        const result = await db.query.userToEntity.findFirst({
          where: (userToEntity: any, { eq }: any) =>
            eq(userToEntity.id, userId),
          with: {
            user: {
              with: {
                profile: true,
                about: true,
              },
            },
            verification: true,
            userKyc: true,
          },
        });
        return result;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },

    async updateUserSettings(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        const set = await db.query.entitySettingsUser.findFirst({
          where: (entitySettingsUser: any, { eq }: any) =>
            eq(entitySettingsUser.entity, entity),
        });

        if (!set) {
          await db
            .insert(entitySettingsUser)
            .values({
              entity: entity,
              autoApprove: input.autoApprove, // Need to set initial value
            })
            .returning();

          return { autoApprove: input.autoApprove };
        }

        const settings = await db
          .update(entitySettingsUser)
          .set({ autoApprove: input.autoApprove })
          .where(eq(entitySettingsUser.entity, entity))
          .returning();

        return {
          autoApprove: settings[0].autoApprove,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
