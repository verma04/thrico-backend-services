import { and, eq, sql, or, count, desc, inArray } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { ensurePermission, AdminModule, PermissionAction } from "../../utils/auth/permissions.utils";
import {
  entitySettingsUser,
  userToEntity,
  userToEntityLog,
  userVerification,
  userFeed,
  feedComment,
  connections as userConnections,
  groupMember as communityMember,
  events,
  marketPlace,
  offers,
  jobs,
  badges,
} from "@thrico/database";
import { GamificationQueryService, NotificationService } from "@thrico/services";
import { log } from "@thrico/logging";

import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const userResolvers = {
  Query: {
    async getUserAnalytics(_: any, { timeRange }: any, context: any) {
      try {
        log.info(`Querying user analytics for timeRange: ${timeRange}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { id, entity, db } = auth;

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
              eq(userToEntity.isApproved, true),
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

        // New Members This Month
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
        log.error("Error in getUserAnalytics:", error);
        throw error;
      }
    },
    async getAllUser(_: any, { input }: any, context: any) {
      try {
        log.info(`Querying all users with status: ${input?.status}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { db, entity } = auth;

        if (input.status === "ALL") {
          const result = await db.query.userToEntity.findMany({
            where: (ute: any, { eq }: any) => and(eq(ute.entityId, entity)),
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
            orderBy: (ute: any, { desc }: any) => [
              desc(ute.createdAt),
            ],
          });
          return result;
        } else {
          const result = await db.query.userToEntity.findMany({
            where: (ute: any, { eq }: any) =>
              and(eq(ute.entityId, entity), eq(ute.status, input.status)),
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
            orderBy: (ute: any, { desc }: any) => [
              desc(ute.createdAt),
            ],
          });

          return result;
        }
      } catch (error) {
        log.error("Error in getAllUser", { error });
        throw error;
      }
    },
    async getUserDetailsById(_: any, { input }: any, context: any) {
      try {
        log.info(`Querying user details by ID: ${input?.id}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { db, entity } = auth;

        const result = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq, and }: any) =>
            and(eq(ute.id, input.id), eq(ute.entityId, entity)),
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
        console.error("Error in getUserDetailsById:", error);
        throw error;
      }
    },

    async getUserGrowth(_: any, { timeRange }: any, context: any) {
      try {
        log.info(`Querying user growth for timeRange: ${timeRange}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { entity, db } = auth;

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
        log.info(`Querying user role distribution for timeRange: ${timeRange}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { entity, db } = auth;

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
        log.info("Fetching user settings");
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { db, entity } = auth;

        const set = await db.query.entitySettingsUser.findFirst({
          where: (esu: any, { eq }: any) =>
            eq(esu.entity, entity),
        });

        if (!set) {
          return { autoApprove: false };
        }

        return {
          autoApprove: set.autoApprove,
        };
      } catch (error) {
        log.error("Error in getUserSettings:", error);
        throw error;
      }
    },

    async getUserStats(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
      const { db, entity } = auth;
      const userId = input.userId;

      const [
        [postsCount],
        [commentsCount],
        [connectionsCount],
        [groupsCount],
        [eventsCount],
        [listingsCount],
        [offersCount],
        [jobsCount],
      ] = await Promise.all([
        db
          .select({ count: count() })
          .from(userFeed)
          .where(and(eq(userFeed.userId, userId), eq(userFeed.entity, entity))),
        db
          .select({ count: count() })
          .from(feedComment)
          .innerJoin(userFeed, eq(feedComment.feedId, userFeed.id))
          .where(
            and(eq(feedComment.user, userId), eq(userFeed.entity, entity)),
          ),
        db
          .select({ count: count() })
          .from(userConnections)
          .where(
            and(
              eq(userConnections.entity, entity),
              eq(userConnections.connectionStatusEnum, "ACCEPTED"),
              or(
                eq(userConnections.user1, userId),
                eq(userConnections.user2, userId),
              ),
            ),
          ),
        db
          .select({ count: count() })
          .from(communityMember)
          .innerJoin(userToEntity, eq(communityMember.userId, userToEntity.id))
          .where(
            and(
              eq(userToEntity.userId, userId),
              eq(userToEntity.entityId, entity),
              eq(communityMember.memberStatusEnum, "ACCEPTED"),
            ),
          ),
        db
          .select({ count: count() })
          .from(events)
          .where(
            and(eq(events.eventCreator, userId), eq(events.entityId, entity)),
          ),
        db
          .select({ count: count() })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.postedBy, userId),
              eq(marketPlace.entityId, entity),
            ),
          ),
        db
          .select({ count: count() })
          .from(offers)
          .where(and(eq(offers.userId, userId), eq(offers.entityId, entity))),
        db
          .select({ count: count() })
          .from(jobs)
          .where(and(eq(jobs.postedBy, userId), eq(jobs.entityId, entity))),
      ]);

      return {
        totalPosts: Number(postsCount?.count || 0),
        totalComments: Number(commentsCount?.count || 0),
        totalConnections: Number(connectionsCount?.count || 0),
        totalGroups: Number(groupsCount?.count || 0),
        totalEvents: Number(eventsCount?.count || 0),
        totalListings: Number(listingsCount?.count || 0),
        totalOffers: Number(offersCount?.count || 0),
        totalJobs: Number(jobsCount?.count || 0),
      };
    },
    async getUserGamificationSummary(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
      return await userResolvers.userToEntity.gamificationSummary(
        { userId: input.userId },
        null,
        context,
      );
    },
    async getUserActivityLog(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
      return await userResolvers.userToEntity.activityLog(
        { userId: input.userId },
        { limit: input.limit, offset: input.offset },
        context,
      );
    },
    async getUserEarnedBadges(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
      return await userResolvers.userToEntity.earnedBadges(
        { userId: input.userId },
        { limit: input.limit, cursor: input.cursor },
        context,
      );
    },
    async getUserAuditLogs(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
      const { db, entity } = auth;

      const logs = await db.query.userToEntityLog.findMany({
        where: (log: any, { eq, and }: any) =>
          and(
            eq(log.entity, entity),
            sql`${log.userToEntityId} IN (
              SELECT id FROM "userToEntity" 
              WHERE "user_id" = ${input.userId} AND "entity_id" = ${entity}
            )`,
          ),
        orderBy: (log: any, { desc }: any) => [desc(log.createdAt)],
        limit: input.limit || 50,
        offset: input.offset || 0,
      });

      return logs;
    },
    async getAllEntityAuditLogs(_: any, { limit, offset }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
      const { db, entity } = auth;

      const logs = await db.query.userToEntityLog.findMany({
        where: (log: any, { eq }: any) => eq(log.entity, entity),
        orderBy: (log: any, { desc }: any) => [desc(log.createdAt)],
        limit: limit || 50,
        offset: offset || 0,
      });

      return logs;
    },
  },

  userToEntity: {
    lastActive: (parent: any) => parent.lastActive,
    isOnline: (parent: any) => parent.isOnline,
    gamificationSummary: async (parent: any, _: any, context: any) => {
      const auth = await checkAuth(context);
      const { db, entity } = auth;
      const queryService = new GamificationQueryService(db);
      const gamificationStats = await queryService.getGamificationStatsByUserId(
        {
          userId: parent.userId,
          entityId: entity,
        },
      );

      return {
        totalPointsEarned: gamificationStats?.totalPoints || 0,
        totalBadgesEarned: gamificationStats?.totalBadges || 0,
        currentStreak: 0,
        rankPosition: gamificationStats?.rank || 0,
        pointsToNextRank: 0,
        badgesProgress: 0,
        recentActivity: [],
      };
    },
    activityLog: async (parent: any, { limit, offset }: any, context: any) => {
      const auth = await checkAuth(context);
      const { db, entity } = auth;
      const queryService = new GamificationQueryService(db);
      return await queryService.getUserGamificationActivityLog({
        userId: parent.userId,
        entityId: entity,
        limit: limit || 10,
        offset: offset || 0,
      });
    },
    earnedBadges: async (parent: any, { limit, cursor }: any, context: any) => {
      const auth = await checkAuth(context);
      const { db, entity } = auth;
      const queryService = new GamificationQueryService(db);
      const result = await queryService.getUserEarnedBadges({
        userId: parent.userId,
        entityId: entity,
        limit: limit || 10,
        cursor,
      });

      return {
        edges: result.edges.map((e: any) => ({
          cursor: e.cursor,
          node: {
            ...e.node.badge,
            userProgress: {
              id: e.node.id,
              progress: e.node.progress,
              isCompleted: e.node.isCompleted,
              earnedAt: e.node.earnedAt,
            },
          },
        })),
        pageInfo: result.pageInfo,
      };
    },
    auditLog: async (parent: any, { limit, offset }: any, context: any) => {
      return await userResolvers.Query.getUserAuditLogs(
        null,
        { input: { userId: parent.userId, limit, offset } },
        context,
      );
    },
    stats: async (parent: any, _: any, context: any) => {
      log.info(`Fetching stats for userToEntity: ${parent.userId}`);
    },
  },
  UserAuditLog: {
    performedBy: async (parent: any, _: any, context: any) => {
      const { db } = await checkAuth(context);
      return await db.query.user.findFirst({
        where: (u: any, { eq }: any) => eq(u.id, parent.performedBy),
        with: {
          profile: true,
          about: true,
        },
      });
    },
  },
  Mutation: {
    async bulkChangeUserStatus(_: any, { input }: any, context: any) {
      log.info(`Bulk changing user status: ${input?.userIds?.join(", ")}`, {
        action: input?.action,
      });
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.EDIT);
      const { db, id: adminId, entity } = auth;
      const { action, reason, userIds } = input;

      try {
        const users = await db.query.userToEntity.findMany({
          where: (ute: any, { inArray }: any) => inArray(ute.id, userIds),
        });

        if (!users || users.length === 0) {
          throw new Error("Users not found");
        }

        const statusMap: Record<string, string> = {
          APPROVE: "APPROVED",
          BLOCK: "BLOCKED",
          DISABLE: "DISABLED",
          ENABLE: "ENABLED",
          UNBLOCK: "ENABLED",
          REJECT: "REJECTED",
          FLAG: "FLAGGED",
          REAPPROVE: "REAPPROVE",
        };

        const newStatus = statusMap[action];
        const updateData: Record<string, any> = {};

        if (
          action === "APPROVE" ||
          action === "UNBLOCK" ||
          action === "ENABLE" ||
          action === "REAPPROVE"
        ) {
          updateData.isApproved = true;
          updateData.status = "APPROVED";
        }

        await db.transaction(async (tx: any) => {
          for (const user of users) {
             const finalUpdateData = { ...updateData };
             if (!finalUpdateData.status) {
                finalUpdateData.status = newStatus || user.status;
             }

            await tx
              .update(userToEntity)
              .set(finalUpdateData)
              .where(eq(userToEntity.id, user.id));

            await tx.insert(userToEntityLog).values({
              action,
              reason,
              userToEntityId: user.id,
              performedBy: adminId,
              status: "STATUS",
              entity,
              previousState: user.status,
            });
          }
        });

        const results = await db.query.userToEntity.findMany({
          where: (ute: any, { inArray }: any) => inArray(ute.id, userIds),
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

        for (const result of results) {
          const originalUser = users.find((u: any) => u.id === result.id);
          
          if (!originalUser) continue;

          await createAuditLog(db, {
            adminId,
            entityId: entity,
            module: AdminModule.USERS,
            action: "UPDATE_STATUS",
            resourceId: result.id,
            targetUserId: originalUser.userId,
            previousState: originalUser,
            newState: result,
            ipAddress: context.ip,
            userAgent: context.userAgent,
          });

          if (action === "APPROVE") {
            await NotificationService.sendPushNotification({
              userId: originalUser.userId,
              entityId: entity,
              title: "Account Approved",
              body: "Your account has been approved.",
              payload: {
                type: "ACCOUNT_APPROVED",
                module: "USER",
              },
            });
          }
        }

        return results;
      } catch (error) {
        log.error("Failed to bulk change status:", error);
        throw error;
      }
    },
    async changeUserStatus(_: any, { input }: any, context: any) {
      log.info(`Changing user status: ${input?.userId}`, {
        action: input?.action,
      });
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.EDIT);
      const { db, id: adminId, entity } = auth;
      const { action, reason, userId } = input;

      try {
        const user = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) =>
            eq(ute.id, userId),
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
          REAPPROVE: "REAPPROVE",
        };

        const newStatus = statusMap[action];
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
          updateData.status = "APPROVED";
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
            performedBy: adminId,
            status: "STATUS",
            entity,
            previousState: user.status,
          });
        });

        const result = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) =>
            eq(ute.id, userId),
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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.USERS,
          action: "UPDATE_STATUS",
          resourceId: userId,
          targetUserId: user.userId,
          previousState: user,
          newState: result,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        if (action === "APPROVE") {
          await NotificationService.sendPushNotification({
            userId: user.userId,
            entityId: entity,
            title: "Account Approved",
            body: "Your account has been approved.",
            payload: {
              type: "ACCOUNT_APPROVED",
              module: "USER",
            },
          });
        }

        return result;
      } catch (error) {
        log.error("Failed to change status:", error);
        throw error;
      }
    },

    async changeUserVerification(_: any, { input }: any, context: any) {
      log.info(`Changing user verification: ${input?.userId}`, {
        action: input?.action,
      });
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.USERS, PermissionAction.EDIT);
      const { db, id: adminId, entity } = auth;
      const { action, reason, userId } = input;

      try {
        const user = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) =>
            eq(ute.id, userId),
          with: {
            verification: true,
          },
        });
        if (!user) {
          throw new Error("User not found");
        }

        const globalUserId = user.id;

        if (action === "VERIFY") {
          await db.transaction(async (tx: any) => {
            await tx.insert(userVerification).values({
              isVerifiedAt: new Date(),
              verifiedBy: adminId,
              isVerified: true,
              verificationReason: reason,
              userId: globalUserId,
            });
            await tx.insert(userToEntityLog).values({
              reason,
              userToEntityId: userId,
              performedBy: adminId,
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
          where: (ute: any, { eq }: any) =>
            eq(ute.id, userId),
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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.USERS,
          action: action === "VERIFY" ? "VERIFY_USER" : "UNVERIFY_USER",
          resourceId: userId,
          targetUserId: user.userId,
          previousState: user,
          newState: result,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        if (action === "VERIFY") {
          await NotificationService.sendPushNotification({
            userId: user.userId,
            entityId: entity,
            title: "Account Verified",
            body: "Your account has been verified.",
            payload: {
              type: "ACCOUNT_VERIFIED",
              module: "USER",
            },
          });
        }

        return result;
      } catch (error) {
        log.error("Failed to change user verification:", error);
        throw error;
      }
    },

    async updateUserSettings(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.EDIT);
        const { id: adminId, db, entity } = auth;

        const previousState = await db.query.entitySettingsUser.findFirst({
          where: (esu: any, { eq }: any) =>
            eq(esu.entity, entity),
        });

        let settings;
        if (!previousState) {
          settings = await db
            .insert(entitySettingsUser)
            .values({
              entity: entity,
              autoApprove: input.autoApprove,
            })
            .returning();
        } else {
          settings = await db
            .update(entitySettingsUser)
            .set({ autoApprove: input.autoApprove })
            .where(eq(entitySettingsUser.entity, entity))
            .returning();
        }

        const newState = settings[0];

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.USERS,
          action: "UPDATE_SETTINGS",
          previousState,
          newState,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return {
          autoApprove: newState.autoApprove,
        };
      } catch (error) {
        log.error("Error in updateUserSettings:", error);
        throw error;
      }
    },
  },
};
