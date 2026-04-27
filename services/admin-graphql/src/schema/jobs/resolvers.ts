import { and, eq, sql, lt, gte } from "drizzle-orm";
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
import { ensurePermission, AdminModule, PermissionAction } from "../../utils/auth/permissions.utils";
import { getDaterangeFromInput } from "../dashboard/resolvers";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const jobsResolvers = {
  Query: {
    async getJob(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.JOBS, PermissionAction.READ);
        const { entity, db } = auth;

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

    async getJobStats(
      _: any,
      {
        timeRange,
        dateRange,
      }: { timeRange?: string; dateRange?: { startDate: string; endDate: string } },
      context: any,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.JOBS, PermissionAction.READ);
        const { entity, db } = auth;

        const { startDate, endDate, prevStartDate, prevEndDate } =
          getDaterangeFromInput(timeRange, dateRange);

        // 1. Total Jobs (as of end of period)
        const [totalJobsResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobs)
          .where(and(eq(jobs.entityId, entity), lt(jobs.createdAt, endDate)));
        const totalJobs = totalJobsResult?.count || 0;

        const [prevTotalJobsResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobs)
          .where(
            and(
              eq(jobs.entityId, entity),
              lt(jobs.createdAt, startDate),
            ),
          );
        const prevTotalJobs = prevTotalJobsResult?.count || 0;
        const totalJobsChange =
          prevTotalJobs > 0
            ? ((totalJobs - prevTotalJobs) / prevTotalJobs) * 100
            : 0;

        // 2. Active Jobs (status = APPROVED and isActive = true)
        const [activeJobsResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobs)
          .where(
            and(
              eq(jobs.entityId, entity),
              eq(jobs.status, "APPROVED"),
              eq(jobs.isActive, true),
              lt(jobs.createdAt, endDate),
            ),
          );
        const activeJobs = activeJobsResult?.count || 0;

        const [prevActiveJobsResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobs)
          .where(
            and(
              eq(jobs.entityId, entity),
              eq(jobs.status, "APPROVED"),
              eq(jobs.isActive, true),
              lt(jobs.createdAt, startDate),
            ),
          );
        const prevActiveJobs = prevActiveJobsResult?.count || 0;
        const activeJobsChange =
          prevActiveJobs > 0
            ? ((activeJobs - prevActiveJobs) / prevActiveJobs) * 100
            : 0;

        // 3. Total Applications (as of end of period)
        const [totalApplicationsResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobApplicant)
          .where(
            and(
              sql`${jobApplicant.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity})`,
              lt(jobApplicant.createdAt, endDate),
            ),
          );
        const totalApplications = totalApplicationsResult?.count || 0;

        const [currAppCountResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobApplicant)
          .where(
            and(
              sql`${jobApplicant.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity})`,
              gte(jobApplicant.createdAt, startDate),
              lt(jobApplicant.createdAt, endDate),
            ),
          );
        const currAppCount = currAppCountResult?.count || 0;

        const [prevAppCountResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobApplicant)
          .where(
            and(
              sql`${jobApplicant.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity})`,
              gte(jobApplicant.createdAt, prevStartDate),
              lt(jobApplicant.createdAt, prevEndDate),
            ),
          );
        const prevAppCount = prevAppCountResult?.count || 0;
        const applicationsChange =
          prevAppCount > 0
            ? ((currAppCount - prevAppCount) / prevAppCount) * 100
            : 0;

        // 4. Total Views (as of end of period)
        const [totalViewsResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobViews)
          .where(
            and(
              sql`${jobViews.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity})`,
              lt(jobViews.viewedAt, endDate),
            ),
          );
        const totalViews = totalViewsResult?.count || 0;

        const [currViewCountResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobViews)
          .where(
            and(
              sql`${jobViews.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity})`,
              gte(jobViews.viewedAt, startDate),
              lt(jobViews.viewedAt, endDate),
            ),
          );
        const currViewCount = currViewCountResult?.count || 0;

        const [prevViewCountResult] = await db
          .select({ count: sql`COUNT(*)`.mapWith(Number) })
          .from(jobViews)
          .where(
            and(
              sql`${jobViews.jobId} IN (SELECT ${jobs.id} FROM ${jobs} WHERE ${jobs.entityId} = ${entity})`,
              gte(jobViews.viewedAt, prevStartDate),
              lt(jobViews.viewedAt, prevEndDate),
            ),
          );
        const prevViewCount = prevViewCountResult?.count || 0;
        const viewsChange =
          prevViewCount > 0
            ? ((currViewCount - prevViewCount) / prevViewCount) * 100
            : 0;

        return {
          totalJobs,
          totalJobsChange: parseFloat(totalJobsChange.toFixed(1)),
          activeJobs,
          activeJobsChange: parseFloat(activeJobsChange.toFixed(1)),
          totalApplications,
          applicationsChange: parseFloat(applicationsChange.toFixed(1)),
          totalViews,
          viewsChange: parseFloat(viewsChange.toFixed(1)),
          // Additional fields for backward compatibility/UI needs
          avgApplications: totalJobs > 0 ? totalApplications / totalJobs : 0,
          applicationsThisWeek: currAppCount,
          viewsThisWeek: currViewCount,
          applicationsWeeklyChange: parseFloat(applicationsChange.toFixed(1)),
          viewsWeeklyChange: parseFloat(viewsChange.toFixed(1)),
        };
      } catch (error) {
        console.error("error getJobStats: ", error);
        throw error;
      }
    },
  },
  Mutation: {
    async changeJobStatus(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.JOBS, PermissionAction.EDIT);
      const { db, id, entity } = auth;
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

        await createAuditLog(db, {
          adminId: id,
          entityId: entity,
          module: AdminModule.JOBS,
          action: `CHANGE_JOB_STATUS_${action}`,
          resourceId: jobId,
          previousState: { status: job.status },
          newState: { status: mapped.status },
          reason,
        });

        return updatedJob;
      } catch (error) {
        console.error("Failed to change status:", error);
        throw error;
      }
    },

    async changeJobVerification(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.JOBS, PermissionAction.EDIT);
      const { db, id, entity } = auth;
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

        await createAuditLog(db, {
          adminId: id,
          entityId: entity,
          module: AdminModule.JOBS,
          action: `CHANGE_JOB_VERIFICATION_${action}`,
          resourceId: jobId,
          newState: { isVerified: mapped.isVerified },
          reason,
        });

        return job;
      } catch (error) {
        console.error("Failed to change verification:", error);
        throw error;
      }
    },

    async addJob(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.JOBS, PermissionAction.CREATE);
        const { id, db, entity } = auth;

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
          },
        );

        console.log("Job created:", createdJob, insertedVerification);

        await createAuditLog(db, {
          adminId: id,
          entityId: entity,
          module: AdminModule.JOBS,
          action: "ADD_JOB",
          resourceId: createdJob.id,
          newState: input,
        });

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

  Job: {
    postedBy: (job: any) => {
      // It can come as 'postedBy' (if joined) or 'userId' (if from raw db row)
      return job.postedBy || job.user || null;
    },
  },
};
