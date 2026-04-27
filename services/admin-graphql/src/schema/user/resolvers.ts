import { v4 as uuidv4 } from "uuid";
import { and, eq, sql, or, count, desc, inArray, exists } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";
import {
  user,
  aboutUser,
  entitySettingsUser,
  userToEntity,
  userToEntityLog,
  userVerification,
  userProfile,
  userFeed,
  feedComment,
  connections as userConnections,
  groupMember as communityMember,
  events,
  marketPlace,
  offers,
  jobs,
  badges,
  entity as entityTable,
  moderationLogs,
  memberToIndustry,
} from "@thrico/database";
import {
  GamificationQueryService,
  NotificationService,
  EmailService,
} from "@thrico/services";
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
          .where(and(whereClause, eq(userToEntity.isApproved, true)));
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
    async searchUserByName(_: any, { name }: any, context: any) {
      try {
        log.info(`Searching users by name: ${name}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { db, entity } = auth;

        // Use EXISTS with subquery to filter by joined user table's first/last name
        const result = await db.query.userToEntity.findMany({
          where: (ute: any, { eq, and, sql }: any) =>
            and(
              eq(ute.entityId, entity),
              sql`EXISTS (
                SELECT 1 FROM "thricoUser" 
                WHERE "thricoUser"."id" = ${ute.userId} 
                AND ("thricoUser"."firstName" ILIKE ${`%%${name}%%`} OR "thricoUser"."lastName" ILIKE ${`%%${name}%%`})
              )`,
            ),
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
          orderBy: (ute: any, { desc }: any) => [desc(ute.createdAt)],
          limit: 20,
        });

        return result;
      } catch (error) {
        log.error("Error in searchUserByName:", error);
        throw error;
      }
    },
    async getAllUser(_: any, { input }: any, context: any) {
      try {
        log.info(`Querying all users with status: ${input?.status}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { db, entity } = auth;

        const result = await db.query.userToEntity.findMany({
          where: (ute: any, { and, eq, exists }: any) => {
            const conditions = [eq(ute.entityId, entity)];
            if (input.status && input.status !== "ALL") {
              conditions.push(eq(ute.status, input.status));
            }
            if (input.industryId) {
              conditions.push(
                exists(
                  db
                    .select()
                    .from(memberToIndustry)
                    .where(
                      and(
                        eq(memberToIndustry.memberId, ute.id),
                        eq(memberToIndustry.industryId, input.industryId),
                      ),
                    ),
                ),
              );
            }
            return and(...conditions);
          },
          with: {
            user: {
              with: {
                profile: true,
                about: true,
              },
            },
            userKyc: true,
            verification: true,
            industries: {
              with: {
                industry: true,
              },
            },
          },
          orderBy: (ute: any, { desc }: any) => [desc(ute.createdAt)],
          limit: input.limit || 50,
          offset: input.offset || 0,
        });

        return result;
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
            industries: {
              with: {
                industry: true,
              },
            },
          },
        });

        return result;
      } catch (error) {
        log.error("Error in getUserDetailsById:", error);
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
        log.error("Failed to get user growth:", error);
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
        log.error("Failed to get user role distribution:", error);
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
          where: (esu: any, { eq }: any) => eq(esu.entity, entity),
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
      return await (userResolvers as any).userToEntity.stats(
        { userId: input.userId },
        null,
        context,
      );
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
    industries: (parent: any) => {
      if (parent.industries) {
        return parent.industries.map((mi: any) => mi.industry);
      }
      return [];
    },
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
      try {
        log.info(`Fetching stats for userToEntity: ${parent.userId}`);
        const auth = await checkAuth(context);
        const { db, entity } = auth;
        const userId = parent.userId;

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
            .where(
              and(eq(userFeed.userId, userId), eq(userFeed.entity, entity)),
            ),
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
            .innerJoin(
              userToEntity,
              eq(communityMember.userId, userToEntity.id),
            )
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
      } catch (error) {
        log.error("Error in userToEntity.stats resolver:", error);
        throw error;
      }
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

            if (action === "BLOCK") {
              await tx.insert(moderationLogs).values({
                userId: user.userId,
                entityId: entity,
                contentId: user.userId,
                contentType: "USER",
                decision: "BLOCK",
                actionTaken: `User manually blocked by admin. Reason: ${
                  reason || "No reason provided"
                }`,
              });
            }
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
        const userFound = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) => eq(ute.id, userId),
        });

        if (!userFound) {
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
          status: newStatus || userFound.status,
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
            previousState: userFound.status,
          });

          if (action === "BLOCK") {
            await tx.insert(moderationLogs).values({
              userId: userFound.userId,
              entityId: entity,
              contentId: userFound.userId,
              contentType: "USER",
              decision: "BLOCK",
              actionTaken: `User manually blocked by admin. Reason: ${
                reason || "No reason provided"
              }`,
            });
          }
        });

        const result = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) => eq(ute.id, userId),
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
          targetUserId: userFound.userId,
          previousState: userFound,
          newState: result,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        if (action === "APPROVE") {
          await NotificationService.sendPushNotification({
            userId: userFound.userId,
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
        log.error("Error in changeUserStatus:", error);
        throw error;
      }
    },
    async updateUserSettings(_: any, { input }: any, context: any) {
      try {
        log.info("Updating user settings");
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.EDIT);
        const { db, entity } = auth;

        const set = await db.query.entitySettingsUser.findFirst({
          where: (esu: any, { eq }: any) => eq(esu.entity, entity),
        });

        if (!set) {
          const [newSet] = await db
            .insert(entitySettingsUser)
            .values({
              entity,
              autoApprove: input.autoApprove,
            })
            .returning();
          return { autoApprove: newSet.autoApprove };
        }

        const [updatedSet] = await db
          .update(entitySettingsUser)
          .set({ autoApprove: input.autoApprove })
          .where(eq(entitySettingsUser.entity, entity))
          .returning();

        return { autoApprove: updatedSet.autoApprove };
      } catch (error) {
        log.error("Error in updateUserSettings:", error);
        throw error;
      }
    },
    async changeUserVerification(_: any, { input }: any, context: any) {
      try {
        log.info(`Changing user verification: ${input?.userId}`, {
          action: input?.action,
        });
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.EDIT);
        const { db, id: adminId, entity } = auth;
        const { action, reason, userId } = input;

        const ute = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) => eq(ute.id, userId),
        });

        if (!ute) {
          throw new Error("User not found");
        }

        const isVerified = action === "VERIFY";

        await db.transaction(async (tx: any) => {
          const existingVerification =
            await tx.query.userVerification.findFirst({
              where: (uv: any, { eq }: any) => eq(uv.userId, userId),
            });

          if (existingVerification) {
            await tx
              .update(userVerification)
              .set({
                isVerified,
                verifiedBy: adminId,
                isVerifiedAt: isVerified ? new Date() : null,
                verificationReason: reason,
              })
              .where(eq(userVerification.userId, userId));
          } else {
            await tx.insert(userVerification).values({
              userId,
              isVerified,
              verifiedBy: adminId,
              isVerifiedAt: isVerified ? new Date() : null,
              verificationReason: reason,
            });
          }

          await tx.insert(userToEntityLog).values({
            action,
            reason,
            userToEntityId: userId,
            performedBy: adminId,
            status: "VERIFICATION",
            entity,
          });
        });

        const result = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) => eq(ute.id, userId),
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
        log.error("Error in changeUserVerification:", error);
        throw error;
      }
    },
    async addNewMember(_: any, { input }: any, context: any) {
      try {
        log.info(`Adding new member with email: ${input?.email}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.CREATE);
        const { db, entity: entityId, id: adminId } = auth;
        const {
          email,
          firstName,
          lastName,
          avatar,
          headline,
          about,
          DOB,
          industryIds,
        } = input;

        // 1. Check if user already exists in thricoUser for this entity
        const existingUserInEntity = await db.query.user.findFirst({
          where: (u: any, { eq, and }: any) =>
            and(eq(u.email, email), eq(u.entityId, entityId)),
        });

        if (existingUserInEntity) {
          throw new Error("User already exists in this entity");
        }

        // 2. Check if user exists globally (in ANY entity) to get thricoId
        const existingUserGlobal = await db.query.user.findFirst({
          where: (u: any, { eq }: any) => eq(u.email, email),
        });

        let thricoId = existingUserGlobal ? existingUserGlobal.thricoId : uuidv4();

        // 3. Create thricoUser record for this entity
        const userData: any = {
          thricoId,
          firstName,
          lastName,
          email,
          entityId,
          isActive: true,
          isBlocked: false,
        };
        if (avatar) userData.avatar = avatar;

        const [newUser] = await db.insert(user).values(userData).returning();

        // 4. Create userToEntity record
        const [newUserToEntity] = await db
          .insert(userToEntity)
          .values({
            userId: newUser.id,
            entityId,
            isApproved: true,
            isRequested: true,
            status: "APPROVED",
          })
          .returning();

        // 5. Create aboutUser record
        await db.insert(aboutUser).values({
          userId: newUser.id,
          headline: headline || "Community Member",
          about: about || "",
        });

        // 6. Create userProfile record (for DOB)
        await db.insert(userProfile).values({
          userId: newUser.id,
          DOB: DOB || null,
        });

        // 7. Link industries
        if (industryIds && industryIds.length > 0) {
          await db.insert(memberToIndustry).values(
            industryIds.map((industryId: string) => ({
              memberId: newUserToEntity.id,
              industryId,
            })),
          );
        }

        // 6. Send welcome email
        try {
          // Fetch entity name for the email
          const currentEntity = await db.query.entity.findFirst({
            where: eq(entityTable.id, entityId),
          });

          await EmailService.sendEmail({
            db,
            entityId,
            input: {
              to: email,
              templateSlug: "new-member-welcome",
              variables: {
                entity_name: currentEntity?.name || "Community",
                firstName: firstName,
                login_url: `https://${context.headers.host}/login`, // Minimal dynamic URL
              },
            },
          });
        } catch (emailError: any) {
          log.error("Failed to send welcome email in addNewMember:", emailError);
          // We intentionally do not throw here so the member creation doesn't fail just because email failed.
        }

        log.info("New member added successfully", {
          userId: newUser.id,
          userToEntityId: newUserToEntity.id,
        });

        // Optional: Audit log
        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.USERS,
          action: "ADD_MEMBER",
          resourceId: newUserToEntity.id,
          targetUserId: newUser.id,
          newState: newUserToEntity,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        // Fetch and return the result with user relations
        const result = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) => eq(ute.id, newUserToEntity.id),
          with: {
            user: {
              with: {
                profile: true,
                about: true,
              },
            },
            userKyc: true,
            verification: true,
            industries: {
              with: {
                industry: true,
              },
            },
          },
        });

        return result;
      } catch (error) {
        log.error("Error in addNewMember:", error);
        throw error;
      }
    },
    async updateMember(_: any, { input }: any, context: any) {
      try {
        log.info(`Updating member with ID: ${input?.id}`);
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.EDIT);
        const { db, entity: entityId, id: adminId } = auth;
        const {
          id,
          email,
          firstName,
          lastName,
          avatar,
          headline,
          about,
          DOB,
          industryIds,
        } = input;

        // 1. Fetch existing userToEntity to verify ownership and get userId
        const existingUte = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq, and }: any) =>
            and(eq(ute.id, id), eq(ute.entityId, entityId)),
          with: {
            user: true,
          },
        });

        if (!existingUte) {
          throw new Error("Member not found in this entity");
        }

        const userId = existingUte.userId;

        await db.transaction(async (tx: any) => {
          // 2. Update thricoUser record
          const userUpdateData: any = {};
          if (firstName !== undefined) userUpdateData.firstName = firstName;
          if (lastName !== undefined) userUpdateData.lastName = lastName;
          if (email !== undefined) userUpdateData.email = email;
          if (avatar !== undefined) userUpdateData.avatar = avatar;

          if (Object.keys(userUpdateData).length > 0) {
            await tx.update(user).set(userUpdateData).where(eq(user.id, userId));
          }

          // 3. Update aboutUser record
          const aboutUpdateData: any = {};
          if (headline !== undefined) aboutUpdateData.headline = headline;
          if (about !== undefined) aboutUpdateData.about = about;

          if (Object.keys(aboutUpdateData).length > 0) {
            // Check if it exists
            const existingAbout = await tx.query.aboutUser.findFirst({
              where: (au: any, { eq }: any) => eq(au.userId, userId),
            });
            if (existingAbout) {
              await tx
                .update(aboutUser)
                .set(aboutUpdateData)
                .where(eq(aboutUser.userId, userId));
            } else {
              await tx.insert(aboutUser).values({ userId, ...aboutUpdateData });
            }
          }

          // 4. Update userProfile record
          if (DOB !== undefined) {
            const existingProfile = await tx.query.userProfile.findFirst({
              where: (up: any, { eq }: any) => eq(up.userId, userId),
            });
            if (existingProfile) {
              await tx
                .update(userProfile)
                .set({ DOB: DOB || null })
                .where(eq(userProfile.userId, userId));
            } else {
              await tx.insert(userProfile).values({ userId, DOB: DOB || null });
            }
          }

          // 5. Update industries
          if (industryIds !== undefined) {
            // Remove old links
            await tx.delete(memberToIndustry).where(eq(memberToIndustry.memberId, id));
            // Add new links
            if (industryIds.length > 0) {
              await tx.insert(memberToIndustry).values(
                industryIds.map((industryId: string) => ({
                  memberId: id,
                  industryId,
                })),
              );
            }
          }
        });

        log.info("Member updated successfully", { memberId: id });

        // Optional: Audit log
        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.USERS,
          action: "UPDATE_MEMBER",
          resourceId: id,
          targetUserId: userId,
          previousState: existingUte,
          newState: { ...existingUte, ...input }, // Rough approximation for audit
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        // Fetch and return the updated result
        const result = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq }: any) => eq(ute.id, id),
          with: {
            user: {
              with: {
                profile: true,
                about: true,
              },
            },
            userKyc: true,
            verification: true,
            industries: {
              with: {
                industry: true,
              },
            },
          },
        });

        return result;
      } catch (error) {
        log.error("Error in updateMember:", error);
        throw error;
      }
    },
  },
};
