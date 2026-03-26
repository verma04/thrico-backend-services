import { ReportService } from "@thrico/services";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const reportResolvers = {
  Query: {
    async getAllReports(
      _: any,
      { module, status, page, limit }: any,
      context: any,
    ) {
      try {
        const { db, entityId } = await checkAuth(context);

        return await ReportService.getAllReports({
          db,
          entityId,
          module,
          status,
          page: page || 1,
          limit: limit || 10,
        });
      } catch (error: any) {
        log.error("Error in getAllReports resolver", { error });
        throw error;
      }
    },
  },
  Mutation: {
    async reportContent(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        const report = await ReportService.reportContent({
          db,
          entityId,
          reporterId: userId,
          input: {
            targetId: input.targetId,
            module: input.module,
            reason: input.reason,
            description: input.description,
          },
        });

        return {
          success: true,
          message: "Content reported successfully",
          report,
        };
      } catch (error: any) {
        log.error("Error in reportContent resolver", { error, input });
        throw error;
      }
    },

    async updateReportStatus(_: any, { reportId, status }: any, context: any) {
      try {
        const { db, entityId } = await checkAuth(context);

        const report = await ReportService.updateReportStatus({
          db,
          entityId,
          reportId,
          status,
        });

        return {
          success: true,
          message: "Report status updated successfully",
          report,
        };
      } catch (error: any) {
        log.error("Error in updateReportStatus resolver", { error, reportId });
        throw error;
      }
    },
  },
};
