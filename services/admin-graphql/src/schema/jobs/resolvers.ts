import { and, eq, sql } from "drizzle-orm";
// import { userOrg } from "./mentorship.resolvers";
import { GraphQLError } from "graphql";

import {
  jobApplicant,
  jobLogs,
  jobVerification,
  jobViews,
  jobs,
  userFeed,
  // currency,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import generateSlug from "../../utils/slug.utils";

export const jobsResolvers = {
  Query: {
    async getJob(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const { status } = input || {}; // status: "ALL" | "APPROVED" | "PENDING" | "REJECTED" | "DISABLED"

        let whereClause;
        if (status === "APPROVED") {
          whereClause = (job: any, { eq }: any) =>
            and(eq(job.entityId, entity), eq(job.status, "APPROVED"));
        } else if (status === "PENDING") {
          whereClause = (job: any, { eq }: any) =>
            and(eq(job.entityId, entity), eq(job.status, "PENDING"));
        } else if (status === "REJECTED") {
          whereClause = (job: any, { eq }: any) =>
            and(eq(job.entityId, entity), eq(job.status, "REJECTED"));
        } else if (status === "DISABLED") {
          whereClause = (job: any, { eq }: any) =>
            and(eq(job.entityId, entity), eq(job.status, "DISABLED"));
        } else {
          // ALL
          whereClause = (job: any, { eq }: any) => eq(job.entityId, entity);
        }

        const jobsList = await db.query.jobs.findMany({
          where: whereClause,
          with: {
            verification: true,
          },
          orderBy: (job: any, { desc }: any) => desc(job.updatedAt),
        });

        return jobsList;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getJobStats(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        // 1. Total Jobs (all time)
        const totalJobsResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(jobs)
          .where(sql`${jobs.entityId} = ${entity}`);
        const totalJobs = totalJobsResult[0]?.count || 0;

        // 2. Active Jobs (status = APPROVED and isActive = true)
        const activeJobsResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(jobs)
          .where(
            sql`${jobs.entityId} = ${entity} AND ${jobs.status} = 'APPROVED' AND ${jobs.isActive} = true`
          );
        const activeJobs = activeJobsResult[0]?.count || 0;

        // 3. Total Applications (all time)
        const totalApplicationsResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(jobApplicant)
          .where(
            sql`${jobApplicant.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity})`
          );
        const totalApplications = totalApplicationsResult[0]?.count || 0;

        // 4. Total Views (all time)
        const totalViewsResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(jobViews)
          .where(
            sql`${jobViews.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity})`
          );
        const totalViews = totalViewsResult[0]?.count || 0;

        // 5. Avg. Applications per job
        const avgApplications =
          totalJobs > 0 ? Math.round(totalApplications / totalJobs) : 0;

        // 6. Applications this week
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const applicationsThisWeekResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(jobApplicant)
          .where(
            sql`${jobApplicant.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity}) AND ${jobApplicant.createdAt} >= ${startOfWeek}`
          );
        const applicationsThisWeek = applicationsThisWeekResult[0]?.count || 0;

        // 7. Views this week
        const viewsThisWeekResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(jobViews)
          .where(
            sql`${jobViews.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity}) AND ${jobViews.viewedAt} >= ${startOfWeek}`
          );
        const viewsThisWeek = viewsThisWeekResult[0]?.count || 0;

        // 8. Views last week
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);

        const viewsLastWeekResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(jobViews)
          .where(
            sql`${jobViews.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity}) AND ${jobViews.viewedAt} >= ${startOfLastWeek} AND ${jobViews.viewedAt} < ${startOfWeek}`
          );
        const viewsLastWeek = viewsLastWeekResult[0]?.count || 0;

        // 9. Applications last week
        const applicationsLastWeekResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(jobApplicant)
          .where(
            sql`${jobApplicant.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity}) AND ${jobApplicant.createdAt} >= ${startOfLastWeek} AND ${jobApplicant.createdAt} < ${startOfWeek}`
          );
        const applicationsLastWeek = applicationsLastWeekResult[0]?.count || 0;

        // 10. Views weekly percent change
        let viewsWeeklyChange = 0;
        if (viewsLastWeek > 0) {
          viewsWeeklyChange = Math.round(
            ((viewsThisWeek - viewsLastWeek) / viewsLastWeek) * 100
          );
        } else if (viewsThisWeek > 0) {
          viewsWeeklyChange = 100;
        }

        // 11. Applications weekly percent change
        let applicationsWeeklyChange = 0;
        if (applicationsLastWeek > 0) {
          applicationsWeeklyChange = Math.round(
            ((applicationsThisWeek - applicationsLastWeek) /
              applicationsLastWeek) *
              100
          );
        } else if (applicationsThisWeek > 0) {
          applicationsWeeklyChange = 100;
        }

        return {
          totalJobs,
          activeJobs,
          totalApplications,
          totalViews,
          avgApplications,
          applicationsThisWeek,
          applicationsLastWeek,
          applicationsWeeklyChange,
          viewsThisWeek,
          viewsLastWeek,
          viewsWeeklyChange,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async changeJobStatus(_: any, { input }: any, context: any) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, jobId } = input;

      try {
        const job = await db.query.jobs.findFirst({
          where: (job: any, { eq, and }: any) =>
            and(eq(job.id, jobId), eq(job.entityId, entity)),
        });

        if (!job) {
          throw new GraphQLError("Job not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        // Action → Status mapping
        const statusMap: Record<
          string,
          {
            status:
              | "APPROVED"
              | "BLOCKED"
              | "PENDING"
              | "REJECTED"
              | "DISABLED"
              | "PAUSED";
            isApproved: boolean;
          }
        > = {
          APPROVE: { status: "APPROVED", isApproved: true },
          REAPPROVE: { status: "APPROVED", isApproved: true },
          ENABLE: { status: "APPROVED", isApproved: true },
          REJECT: { status: "REJECTED", isApproved: false },
          DISABLE: { status: "DISABLED", isApproved: false },
          PAUSE: { status: "PAUSED", isApproved: false },
        };

        const mapped = statusMap[action];
        if (!mapped) {
          throw new GraphQLError(`Unknown action: ${action}`, {
            extensions: { code: "BAD_USER_INPUT", http: { status: 400 } },
          });
        }

        await db.transaction(async (tx: any) => {
          await tx
            .update(jobs)
            .set({ status: mapped.status, isApproved: mapped.isApproved })
            .where(eq(jobs.id, jobId));

          await tx.insert(jobLogs).values({
            action: "STATUS",
            reason,
            jobId,
            performedBy: id,
            status: mapped.status,
            entity,
            previousState: job.status,
          });
        });

        const updatedJob = await db.query.jobs.findFirst({
          where: (job: any, { eq }: any) => eq(job.id, jobId),
        });

        return updatedJob;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },

    async changeJobVerification(_: any, { input }: any, context: any) {
      const { db, id, entity } = await checkAuth(context);
      const { action, reason, jobId } = input;

      try {
        // Fetch the job and its verification record
        const job = await db.query.jobs.findFirst({
          where: (job: any, { eq, and }: any) =>
            and(eq(job.id, jobId), eq(job.entityId, entity)),
        });

        if (!job) {
          throw new GraphQLError("Job not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        const verification = await db.query.jobVerification.findFirst({
          where: (verification: any, { eq }: any) =>
            eq(verification.jobId, jobId),
        });

        if (!verification) {
          throw new GraphQLError("Verification record not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        // Action → Verification mapping
        const verificationMap: Record<
          string,
          { isVerified: boolean; verificationReason: string }
        > = {
          VERIFY: {
            isVerified: true,
            verificationReason: reason || "Verified by admin",
          },
          UNVERIFY: {
            isVerified: false,
            verificationReason: reason || "Unverified by admin",
          },
        };

        const mapped = verificationMap[action];
        if (!mapped) {
          throw new GraphQLError(`Unknown action: ${action}`, {
            extensions: { code: "BAD_USER_INPUT", http: { status: 400 } },
          });
        }

        // Update verification record
        const [updatedVerification] = await db
          .update(jobVerification)
          .set({
            isVerified: mapped.isVerified,
            verificationReason: mapped.verificationReason,
            verifiedBy: id,
            isVerifiedAt: new Date(),
          })
          .where(eq(jobVerification.jobId, jobId))
          .returning();

        return job;
      } catch (error) {
        console.error("Failed to change verification:", error);
        throw error;
      }
    },

    async addJob(_: any, { input }: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        const checkAutoApprove = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entity),
        });

        // Use a transaction to ensure both job and verification are created atomically
        const [createdJob, insertedVerification] = await db.transaction(
          async (tx: any) => {
            const [job] = await tx
              .insert(jobs)
              .values({
                title: input.title,
                // company: input.company,  // Company object or ID? Input says company: CompanyInput. Schema says company: Company.
                // Assuming customization handles this, or need to fix.
                // Assuming 'jobs' table has 'company' column which is JSON or similar? Or separate table?
                // Let's assume schema handles it or pass it as is if compatible.
                location: input.location?.name,
                // locationLatLong: input.location
                company: input.company,
                //   ? sql`ST_SetSRID(ST_MakePoint(${input.location.longitude}, ${input.location.latitude}), 4326)`
                //   : undefined,
                salary: input.salary,
                jobType: input.jobType,
                workplaceType: input.workplaceType,
                experienceLevel: input.experienceLevel,
                applicationDeadline: input.applicationDeadline
                  ? new Date(input.applicationDeadline).toISOString()
                  : null,
                description: input.description,
                requirements: input.requirements
                  ? JSON.stringify(input.requirements)
                  : null,
                responsibilities: input.responsibilities
                  ? JSON.stringify(input.responsibilities)
                  : null,
                benefits: input.benefits
                  ? JSON.stringify(input.benefits)
                  : null,
                skills: input.skills ? JSON.stringify(input.skills) : null,
                addedBy: "ENTITY",
                entityId: entity,
                isApproved: !!checkAutoApprove?.autoApproveJobs,
                status: checkAutoApprove?.autoApproveJobs
                  ? "APPROVED"
                  : "PENDING",
                slug: generateSlug(input.title),
              })
              .returning();

            const [verification] = await tx
              .insert(jobVerification)
              .values({
                isVerifiedAt: new Date(),
                verifiedBy: id,
                isVerified: true,
                verificationReason: "Created by admin",
                jobId: job.id,
              })
              .returning();

            await tx.insert(userFeed).values({
              addedBy: "ENTITY",
              entity: entity,
              description: "New Job Added",
              jobId: job.id,
              source: "jobs",
            });

            return [job, verification];
          }
        );

        console.log("Job created:", createdJob, insertedVerification);
        return {
          ...createdJob,
          verification: insertedVerification,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async addJobCompany(_: any, { input }: any, context: any) {
      throw new GraphQLError("Not Implemented");
    },
  },
};
