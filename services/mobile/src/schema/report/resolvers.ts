import { ReportService } from "@thrico/services";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const reportResolvers = {
  Mutation: {
    async reportContent(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));

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
        log.error("Error in reportContent resolver (mobile)", { error, input });
        throw error;
      }
    },
  },
};
