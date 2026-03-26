import { PAGE } from "@thrico/database";
import { JobService, ReportService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { log } from "@thrico/logging";

const jobsResolvers: any = {
  Query: {
    async getJobCompany(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const allPages = await PAGE.scan().exec();
        const pages = allPages.filter((page) =>
          page.name.toLowerCase().includes((input.value || "").toLowerCase()),
        );

        return pages.map((page) => page.toJSON());
      } catch (error) {
        log.error("Error in getJobCompany", { error });
        throw error;
      }
    },

    async getAllJobsUserId(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search;

        const result = await JobService.getAllJobs({
          entityId,
          db,
          cursor,
          limit,
          currentUserId: userId,
          targetUserId: input.id,
          search,
        });

        return result;
      } catch (error) {
        log.error("Error in getAllJobsUserId", { error, input });
        throw error;
      }
    },

    async getAllJobs(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search;

        return JobService.getAllJobs({
          entityId,
          db,
          cursor,
          limit,
          currentUserId: userId,
          search,
        });
      } catch (error) {
        log.error("Error in getAllJobs", { error, input });
        throw error;
      }
    },

    async getJobDetailsById(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        return JobService.getJobDetails({
          jobId: input.id,
          currentUserId: userId,
          db,
        });
      } catch (error) {
        log.error("Error in getJobDetailsById", { error, input });
        throw error;
      }
    },

    async getAllTrendingJobs(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search;

        return JobService.getAllTrendingJobs({
          entityId: (await checkAuth(context)).entityId, // ensuring entityId
          db,
          cursor,
          limit,
          search,
        });
      } catch (error) {
        log.error("Error in getAllTrendingJobs", { error, input });
        throw error;
      }
    },

    async getFeaturedJobs(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search;

        return JobService.getFeaturedJobs({
          entityId,
          db,
          cursor,
          limit,
          search,
        });
      } catch (error) {
        log.error("Error in getFeaturedJobs", { error, input });
        throw error;
      }
    },

    async getMyJobs(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search;

        return JobService.getMyJobs({
          userId: userId,
          entityId,
          db,
          cursor,
          limit,
          search,
        });
      } catch (error) {
        log.error("Error in getMyJobs", { error, input });
        throw error;
      }
    },

    async getAllJobsApplied(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search;

        return JobService.getAllJobsApplied({
          userId: userId,
          db,
          cursor,
          limit,
          currentUserId: userId,
          search,
        });
      } catch (error) {
        log.error("Error in getAllJobsApplied", { error, input });
        throw error;
      }
    },

    async getApplicantsForJob(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;

        return JobService.getApplicantsForJob({
          jobId: input.id,
          ownerId: userId,
          db,
          cursor,
          limit,
        });
      } catch (error) {
        log.error("Error in getApplicantsForJob", { error, input });
        throw error;
      }
    },

    async getNumberApplicantOfJobs(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return JobService.getApplicantsCountForJobs({
          jobIds: [input.id],
          db,
        });
      } catch (error) {
        log.error("Error in getNumberApplicantOfJobs", { error, input });
        throw error;
      }
    },

    async getJobStatistics(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return JobService.getJobsStatistics({
          jobIds: [input.id],
          db,
        });
      } catch (error) {
        log.error("Error in getJobStatistics", { error, input });
        throw error;
      }
    },
  },
  Mutation: {
    async addJob(_: any, { input }: any, context: any) {
      try {
        const { entityId, userId, db } = await checkAuth(context);

        return JobService.postJob({ input, userId, entityId, db });
      } catch (error) {
        log.error("Error in addJob", { error, input });
        throw error;
      }
    },

    async addJobCompany(_: any, { input }: any, context: any) {
      try {
        await checkAuth(context);
        let logo;
        // if (input?.logo) {
        //   logo = await upload(input.logo);
        // }
        return {
          logo: logo ? logo : "/defaultLogo.webp",
          name: input.name,
        };
      } catch (error) {
        log.error("Error in addJobCompany", { error, input });
        throw error;
      }
    },

    async applyJob(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const { jobId, name, email, resume } = input;
        await JobService.applyToJob({
          jobId,
          name,
          email,
          resume,
          db,
          userId: userId,
        });
        return {
          success: true,
        };
      } catch (error) {
        log.error("Error in applyJob", { error, input });
        throw error;
      }
    },

    async reportJob(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const { jobId, reason, description } = input;
        const report = await ReportService.reportContent({
          db,
          entityId,
          reporterId: userId,
          input: {
            targetId: jobId,
            module: "JOB",
            reason,
            description,
          },
        });
        return {
          ...report,
          jobId: report.targetId,
        };
      } catch (error) {
        log.error("Error in reportJob", { error, input });
        throw error;
      }
    },

    async deleteJob(_: any, { jobId }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        return JobService.deleteJob({
          jobId,
          userId,
          db,
        });
      } catch (error) {
        log.error("Error in deleteJob", { error, jobId });
        throw error;
      }
    },

    async editJob(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const { jobId, ...updateInput } = input;
        return JobService.editJob({
          jobId,
          userId: userId,
          input: updateInput,
          db,
        });
      } catch (error) {
        log.error("Error in editJob", { error, input });
        throw error;
      }
    },

    async saveJob(_: any, { jobId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return JobService.saveJob({
          jobId,
          userId: userId,
          db,
        });
      } catch (error) {
        log.error("Error in saveJob", { error, jobId });
        throw error;
      }
    },
  },
};

export { jobsResolvers };
