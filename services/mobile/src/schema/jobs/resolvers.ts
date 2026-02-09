import { PAGE, user } from "@thrico/database";
import { JobService, upload } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

const jobsResolvers: any = {
  Query: {
    // async getJob(_: any, { input }: any, context: any) {
    //   try {
    //     if (input.value) {
    //       const allPages = await PAGE.scan().exec();
    //       const pages = allPages.filter((page) =>
    //         page.name.toLowerCase().includes((input.value || "").toLowerCase())
    //       );
    //
    //       return pages.map((page) => page.toJSON());
    //     }
    //   } catch (error) {
    //     console.log(error);
    //     throw error;
    //   }
    // },

    async getJobCompany(_: any, { input }: any, context: any) {
      try {
        const allPages = await PAGE.scan().exec();
        const pages = allPages.filter((page) =>
          page.name.toLowerCase().includes((input.value || "").toLowerCase()),
        );

        return pages.map((page) => page.toJSON());
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getAllJobsUserId(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, id } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search;

        const result = await JobService.getAllJobs({
          entityId,
          db,
          cursor,
          limit,
          currentUserId: id,
          targetUserId: input.id,
          search,
        });

        return result;
      } catch (error) {
        console.log(error);
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
        console.log(error);
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
        console.log(error);
        throw error;
      }
    },

    async getAllTrendingJobs(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search;

        return JobService.getAllTrendingJobs({
          entityId,
          db,
          cursor,
          limit,
          search,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getFeaturedJobs(_: any, { input }: any, context: any) {
      try {
        const { entityId, db } = await checkAuth(context);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
        throw error;
      }
    },

    async getNumberApplicantOfJobs(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        // input.jobIds should be an array of job IDs
        return JobService.getApplicantsCountForJobs({
          jobIds: [input.id],
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getJobStatistics(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        // input.jobIds should be an array of job IDs
        return JobService.getJobsStatistics({
          jobIds: [input.id],
          db,
        });
      } catch (error) {
        console.log(error);
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
        console.log(error);
        throw error;
      }
    },

    async addJobCompany(_: any, { input }: any, context: any) {
      try {
        let logo;
        if (input?.logo) {
          logo = await upload(input.logo);
        }
        // Implement company creation logic if needed
        return {
          logo: logo ? logo : "/defaultLogo.webp",
          name: input.name,
        };
      } catch (error) {
        throw error;
      }
    },

    async applyJob(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        const { jobId, name, email, resume } = input;
        const job = await JobService.applyToJob({
          jobId,
          name,
          email,
          resume,
          db,
          userId: jobId,
        });
        return {
          succuss: true,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async reportJob(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);
        const { jobId, reason, description } = input;
        return JobService.reportJob({
          jobId,
          reportedBy: id,
          entityId,
          reason,
          description,
          db,
        });
      } catch (error) {
        console.log(error);
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
        console.log(error);
        throw error;
      }
    },

    async editJob(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const { jobId, ...updateInput } = input;
        return JobService.editJob({
          jobId,
          userId: id,
          input: updateInput,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async saveJob(_: any, { jobId }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        return JobService.saveJob({
          jobId,
          userId: id,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { jobsResolvers };
