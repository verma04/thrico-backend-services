import { and, eq, sql, desc } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { moments } from "@thrico/database";
import { MomentService } from "@thrico/services";
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const momentResolvers = {
  Query: {
    getAllMoments: async (_: any, { pagination }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.MOMENTS, PermissionAction.READ);
        const { entityId, db } = auth;
        
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 10;
        const offset = (page - 1) * limit;

        const baseConditions = [eq(moments.entityId, entityId as string)];

        const results = await db.query.moments.findMany({
          where: and(...baseConditions),
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
          orderBy: [desc(moments.createdAt)],
          limit: limit,
          offset: offset,
        });

        const [totalCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(moments)
          .where(and(...baseConditions));

        const totalItems = Number(totalCountResult.count);
        const totalPages = Math.ceil(totalItems / limit);

        return {
          data: results,
          meta: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      } catch (error) {
        console.error("Error in getAllMoments:", error);
        throw error;
      }
    },
    getMomentDetailsById: async (_: any, { input }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.MOMENTS, PermissionAction.READ);
        const { entityId, db } = auth;
        const { id } = input;
        const moment = await db.query.moments.findFirst({
          where: and(
            eq(moments.id, id),
            eq(moments.entityId, entityId as string),
          ),
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        });

        if (!moment) return null;

        return moment;
      } catch (error) {
        console.error("Error in getMomentDetailsById:", error);
        throw error;
      }
    },
    getMomentAnalytics: async (_: any, { timeRange }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.MOMENTS, PermissionAction.READ);
        const { entityId, db } = auth;

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

        const whereClause = [eq(moments.entityId, entityId as string)];
        if (startDate.getTime() > 0) {
          whereClause.push(sql`${moments.createdAt} >= ${startDate.toISOString()}`);
        }

        const totals = await db
          .select({
            totalMoments: sql<number>`COUNT(*)`,
            totalViews: sql<number>`SUM(${moments.totalViews})`,
            totalReactions: sql<number>`SUM(${moments.totalReactions})`,
            totalComments: sql<number>`SUM(${moments.totalComments})`,
            activeCreators: sql<number>`COUNT(DISTINCT ${moments.userId})`,
          })
          .from(moments)
          .where(and(...whereClause));

        const growth = await db
          .select({
            date: sql<string>`DATE(${moments.createdAt})`,
            count: sql<number>`COUNT(*)`,
          })
          .from(moments)
          .where(and(...whereClause))
          .groupBy(sql`DATE(${moments.createdAt})`)
          .orderBy(sql`DATE(${moments.createdAt})`);

        return {
          totalMoments: Number(totals[0]?.totalMoments || 0),
          totalViews: Number(totals[0]?.totalViews || 0),
          totalReactions: Number(totals[0]?.totalReactions || 0),
          totalComments: Number(totals[0]?.totalComments || 0),
          activeCreators: Number(totals[0]?.activeCreators || 0),
          growth: growth.map((row: any) => ({
            date: row.date,
            count: Number(row.count),
          })),
          engagement: [
            { name: "Reactions", value: Number(totals[0]?.totalReactions || 0) },
            { name: "Comments", value: Number(totals[0]?.totalComments || 0) },
          ],
        };
      } catch (error) {
        console.error("Error in getMomentAnalytics:", error);
        throw error;
      }
    },
  },
  Mutation: {
    adminDeleteMoment: async (_: any, { id }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.MOMENTS, PermissionAction.DELETE);
        const { entityId, db } = auth;

        const [moment] = await db
          .select()
          .from(moments)
          .where(
            and(eq(moments.id, id), eq(moments.entityId, entityId as string)),
          );

        if (!moment) {
          throw new Error("Moment not found");
        }

        await db
          .delete(moments)
          .where(
            and(eq(moments.id, id), eq(moments.entityId, entityId as string)),
          );

        // Audit Log
        await createAuditLog(db, {
          adminId: auth.id,
          entityId: auth.entity,
          module: AdminModule.MOMENTS,
          action: "DELETE",
          resourceId: id,
          targetUserId: moment.userId,
          previousState: moment,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return true;
      } catch (error) {
        console.error("Error in adminDeleteMoment:", error);
        throw error;
      }
    },
    adminEditMoment: async (_: any, { id, input }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.MOMENTS, PermissionAction.EDIT);
        const { entityId, db } = auth;

        const [previousMoment] = await db
          .select()
          .from(moments)
          .where(
            and(eq(moments.id, id), eq(moments.entityId, entityId as string)),
          );

        if (!previousMoment) {
          throw new Error("Moment not found");
        }

        const updates: any = {};
        if (input.caption !== undefined) updates.caption = input.caption;
        if (input.thumbnailUrl !== undefined)
          updates.thumbnailUrl = input.thumbnailUrl;
        if (input.status !== undefined) updates.status = input.status;

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
        }

        const [updatedMoment] = await db
          .update(moments)
          .set(updates)
          .where(
            and(eq(moments.id, id), eq(moments.entityId, entityId as string)),
          )
          .returning();

        if (!updatedMoment) {
          throw new Error("Moment not found");
        }

        // Fetch owner logic again or simply return the basic without owner
        const momentDetails = await db.query.moments.findFirst({
          where: and(
            eq(moments.id, id),
            eq(moments.entityId, entityId as string),
          ),
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        });

        const [updatedRecord] = await db
          .select()
          .from(moments)
          .where(eq(moments.id, id));

        // Audit Log
        await createAuditLog(db, {
          adminId: auth.id,
          entityId: auth.entity,
          module: AdminModule.MOMENTS,
          action: "UPDATE",
          resourceId: id,
          targetUserId: previousMoment.userId,
          previousState: previousMoment,
          newState: updatedRecord,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return momentDetails;
      } catch (error) {
        console.error("Error in adminEditMoment:", error);
        throw error;
      }
    },

    adminGenerateMomentUploadUrl: async (_: any, { input }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.MOMENTS, PermissionAction.CREATE);
        const { entityId, db, id: adminId, userId } = auth;

        const data = await MomentService.generateUploadUrl(
          input,
          entityId as string,
          userId,
          db,
        );

        // Audit Log
        await createAuditLog(db, {
          adminId,
          entityId: auth.entity,
          module: AdminModule.MOMENTS,
          action: "GENERATE_UPLOAD_URL",
          resourceId: data.momentId,
          newState: { videoFileName: input.videoFileName, thumbnailFileName: input.thumbnailFileName },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return data;
      } catch (error) {
        console.error("Error in adminGenerateMomentUploadUrl:", error);
        throw error;
      }
    },

    adminConfirmMomentUpload: async (_: any, { input }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.MOMENTS, PermissionAction.CREATE);
        const { entityId, db, id: adminId, userId: adminUserId } = auth;

        const { fileUrl, caption, thumbnailUrl, shareInFeed = true, isAiContent = false, userId: targetUserId } = input;
        const momentUserId = targetUserId || adminUserId;

        const moment = await MomentService.confirmUpload(
          fileUrl,
          caption,
          entityId as string,
          momentUserId,
          db,
          thumbnailUrl,
          shareInFeed,
          isAiContent,
          "ENTITY",
        );

        // Audit Log
        await createAuditLog(db, {
          adminId,
          entityId: auth.entity,
          module: AdminModule.MOMENTS,
          action: "CREATE",
          resourceId: moment.id,
          newState: { caption, fileUrl, thumbnailUrl, shareInFeed, isAiContent },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        // Refetch with owner info for the AdminMoment type
        const momentDetails = await db.query.moments.findFirst({
          where: eq(moments.id, moment.id),
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        });

        return momentDetails;
      } catch (error) {
        console.error("Error in adminConfirmMomentUpload:", error);
        throw error;
      }
    },

    adminMomentUpload: async (_: any, { input }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.MOMENTS, PermissionAction.CREATE);
        const { entityId, db, id: adminId, userId: adminUserId } = auth;

        const { fileUrl, caption, thumbnailUrl, shareInFeed = true, isAiContent = false, userId: targetUserId } = input;
        const momentUserId = targetUserId || adminUserId;

        const moment = await MomentService.confirmUpload(
          fileUrl,
          caption,
          entityId as string,
          momentUserId,
          db,
          thumbnailUrl,
          shareInFeed,
          isAiContent,
          "ENTITY",
        );

        // Audit Log
        await createAuditLog(db, {
          adminId,
          entityId: auth.entity,
          module: AdminModule.MOMENTS,
          action: "CREATE",
          resourceId: moment.id,
          newState: { caption, fileUrl, thumbnailUrl, shareInFeed, isAiContent },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        // Refetch with owner info for the AdminMoment type
        const momentDetails = await db.query.moments.findFirst({
          where: eq(moments.id, moment.id),
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        });

        return momentDetails;
      } catch (error) {
        console.error("Error in adminMomentUpload:", error);
        throw error;
      }
    },
  },

  AdminMoment: {
    owner: (moment: any) => {
      if (!moment.user) return null;
      return {
        ...moment.user,
        headline: moment.user.about?.headline,
      };
    },
  },
};

