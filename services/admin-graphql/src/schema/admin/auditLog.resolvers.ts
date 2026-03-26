import { and, eq, sql, desc, or } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { AdminModule, ensurePermission, PermissionAction } from "../../utils/auth/permissions.utils";
import { adminAuditLogs } from "@thrico/database";

export const auditLogResolvers = {
  Query: {
    auditLogs: async (_: any, { pagination, userId, module: moduleFilter }: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.AUDIT_LOGS, PermissionAction.READ);
        const { entityId, db } = auth;

        const page = pagination?.page || 1;
        const limit = pagination?.limit || 10;
        const offset = (page - 1) * limit;

        const baseConditions = [eq(adminAuditLogs.entityId, entityId as string)];
        
        if (userId) {
          baseConditions.push(
            or(
              eq(adminAuditLogs.adminId, userId),
              eq(adminAuditLogs.targetUserId, userId)
            ) as any
          );
        }

        if (moduleFilter) {
          baseConditions.push(eq(adminAuditLogs.module, moduleFilter));
        }

        const stats = await db
          .select({ count: sql<number>`count(*)` })
          .from(adminAuditLogs)
          .where(and(...baseConditions));

        const totalItems = Number(stats[0]?.count || 0);
        const totalPages = Math.ceil(totalItems / limit);

        const data = await db.query.adminAuditLogs.findMany({
          where: and(...baseConditions),
          with: {
            admin: true,
            targetUser: true,
          },
          orderBy: [desc(adminAuditLogs.createdAt)],
          limit: limit,
          offset: offset,
        });

        return {
          data,
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
        console.error("Error in auditLogs resolver:", error);
        throw error;
      }
    },

    auditLogById: async (_: any, { id }: { id: string }, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.AUDIT_LOGS, PermissionAction.READ);
        const { entityId, db } = auth;

        const log = await db.query.adminAuditLogs.findFirst({
          where: and(
            eq(adminAuditLogs.id, id),
            eq(adminAuditLogs.entityId, entityId as string)
          ),
          with: {
            admin: true,
            targetUser: true,
          },
        });

        return log;
      } catch (error) {
        console.error("Error in auditLogById resolver:", error);
        throw error;
      }
    },

    auditLogModules: async (_: any, __: any, context: any) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.AUDIT_LOGS, PermissionAction.READ);
        
        // Return values from the AdminModule enum
        return Object.values(AdminModule);
      } catch (error) {
        console.error("Error in auditLogModules resolver:", error);
        throw error;
      }
    },
  },
};
