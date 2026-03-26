import { ReportService } from "@thrico/services";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { user } from "@thrico/database";
import { eq } from "drizzle-orm";
import { ensurePermission, AdminModule, PermissionAction } from "../../utils/auth/permissions.utils";

export const reportResolvers = {
  Query: {
    async getAllReports(_: any, { module, status, page = 1, limit = 10 }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.REPORTS, PermissionAction.READ);
        const { db, entityId } = auth;
        
        return await ReportService.getAllReports({
          db,
          entityId: entityId!,
          module,
          status,
          page,
          limit,
        });
      } catch (error: any) {
        log.error("Error in getAllReports (admin-graphql)", { error, module, status });
        throw error;
      }
    },

    async getReportById(_: any, { id }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        
        const report = await db.query.reports.findFirst({
           where: (reports: any, { eq }: any) => eq(reports.id, id)
        });
        
        return report;
      } catch (error: any) {
        log.error("Error in getReportById (admin-graphql)", { error, id });
        throw error;
      }
    }
  },

  Mutation: {
    async updateReportStatus(_: any, { reportId, status }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.REPORTS, PermissionAction.EDIT);
        const { db, entityId } = auth;
        
        return await ReportService.updateReportStatus({
          db,
          entityId: entityId!,
          reportId,
          status,
        });
      } catch (error: any) {
        log.error("Error in updateReportStatus (admin-graphql)", { error, reportId, status });
        throw error;
      }
    }
  },

  Report: {
    async reporter(parent: any, _: any, context: any) {
      if (!parent.reportedBy) return null;
      try {
        const { db } = await checkAuth(context);
        const userDetails = await db.query.user.findFirst({
          where: eq(user.id, parent.reportedBy)
        });
        return userDetails;
      } catch (error) {
        log.error("Error resolving reporter in Report", { error, reportedBy: parent.reportedBy });
        return null;
      }
    }
  }
};
