import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, desc, eq, sql, inArray, or } from "drizzle-orm";
import {
  jobApplications,
  jobs,
  userFeed,
  jobReports,
  savedJobs,
  jobViews,
} from "@thrico/database";
import generateSlug from "../generateSlug";
import { GamificationEventService } from "../gamification/gamification-event.service";

export class JobService {
  private static buildSearchCondition(search?: string) {
    if (!search) return undefined;
    return or(
      sql`${jobs.title} ILIKE '%' || ${search} || '%'`,
      sql`${jobs.description} ILIKE '%' || ${search} || '%'`
    );
  }

  static async getAllJobs({
    entityId,
    db,
    page,
    limit,
    currentUserId,
    canReport = true,
    search,
  }: {
    entityId: string;
    db: any;
    page: number;
    limit: number;
    currentUserId?: string;
    canReport?: boolean;
    search?: string;
    slugifyFn?: (text: string) => string;
  }) {
    try {
      if (!entityId || !page || !limit) {
        throw new GraphQLError("Entity ID, page, and limit are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting all jobs", { entityId, page, limit, search });

      const offset = (page - 1) * limit;

      const condition = await db.query.trendingConditionsJobs.findFirst({
        where: (trendingConditionsJobs: any, { eq }: any) =>
          eq(trendingConditionsJobs.entity, entityId),
      });

      const trendingScoreExpr = sql<number>`
        (${condition?.views ? jobs.numberOfViews : 0} + ${
        condition?.applicant ? jobs.numberOfApplicant : 0
      })
      `;

      const whereConditions = [eq(jobs.entityId, entityId)];
      const searchCondition = this.buildSearchCondition(search);
      if (searchCondition) whereConditions.push(searchCondition);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(and(...whereConditions));

      const result = await db
        .select({
          id: jobs.id,
          details: jobs,
          isFeatured: jobs.isFeatured,
          trendingScore: trendingScoreExpr,
          rank: sql<number>`RANK() OVER (ORDER BY ${trendingScoreExpr} DESC)`,
          postedBy: jobs.postedBy,
          applicationCount: sql<number>`
            (SELECT COUNT(*) FROM ${jobApplications} WHERE ${jobApplications.jobId} = ${jobs.id})
          `,
        })
        .from(jobs)
        .where(and(...whereConditions))
        .orderBy(desc(jobs.createdAt))
        .limit(limit)
        .offset(offset);

      const sorted = [...result].sort((a, b) => b.rank - a.rank);
      const topValue = new Set(
        sorted.slice(0, condition?.length || 0).map((j) => j.id)
      );
      const final = result.map((set: any) => {
        const isOwner = currentUserId ? set.postedBy === currentUserId : false;
        const isJobSaved = false;
        return {
          ...set,
          isTrending: topValue.has(set.id),
          isOwner,
          canDelete: isOwner,
          canReport: canReport && !isOwner,
          applicationCount: set.applicationCount,
          isJobSaved,
        };
      });

      log.info("All jobs retrieved", {
        entityId,
        count: final.length,
        totalCount: Number(count),
      });

      return {
        jobs: final,
        totalCount: Number(count),
      };
    } catch (error) {
      log.error("Error in getAllJobs", { error, entityId, page, limit });
      throw error;
    }
  }

  static getAllTrendingJobs = async ({
    entityId,
    db,
    page,
    limit,
    search, // <-- Add this
  }: {
    entityId: string;
    db: any;
    page: number;
    limit: number;
    search?: string; // <-- Add this
  }) => {
    try {
      const offset = (page - 1) * limit;

      const condition = await db.query.trendingConditionsJobs.findFirst({
        where: (trendingConditionsJobs: any, { eq }: any) =>
          eq(trendingConditionsJobs.entity, entityId),
      });

      const trendingScoreExpr = sql<number>`
        (${condition?.views ? jobs.numberOfViews : 0} + ${
        condition?.applicant ? jobs.numberOfApplicant : 0
      })
      `;

      const whereConditions = [eq(jobs.entityId, entityId)];
      const searchCondition = JobService.buildSearchCondition(search);
      if (searchCondition) whereConditions.push(searchCondition);

      const jobsList = await db
        .select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          isFeatured: jobs.isFeatured,
          postedBy: jobs.postedBy,
          createdAt: jobs.createdAt,
          trendingScore: trendingScoreExpr,
        })
        .from(jobs)
        .where(and(...whereConditions))
        .orderBy(desc(trendingScoreExpr))
        .limit(limit)
        .offset(offset);

      return jobsList;
    } catch (error) {
      log.error("getAllTrendingJobs failed:", error);
      throw new Error(`getAllTrendingJobs failed: ${error}`);
    }
  };

  static getFeaturedJobs = async ({
    entityId,
    db,
    page,
    limit,
    search, // <-- Add this
  }: {
    entityId: string;
    db: any;
    page: number;
    limit: number;
    search?: string; // <-- Add this
  }) => {
    try {
      const offset = (page - 1) * limit;

      const whereConditions = [
        eq(jobs.entityId, entityId),
        eq(jobs.isFeatured, true),
      ];
      const searchCondition = JobService.buildSearchCondition(search);
      if (searchCondition) whereConditions.push(searchCondition);

      const jobsList = await db
        .select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          isFeatured: jobs.isFeatured,
          postedBy: jobs.postedBy,
          createdAt: jobs.createdAt,
        })
        .from(jobs)
        .where(and(...whereConditions))
        .orderBy(desc(jobs.createdAt))
        .limit(limit)
        .offset(offset);

      return jobsList;
    } catch (error) {
      log.error("getFeaturedJobs failed:", error);
      throw new Error(`getFeaturedJobs failed: ${error}`);
    }
  };

  static getAllJobsApplied = async ({
    userId,
    db,
    page,
    limit,
    currentUserId,
    canReport = true,
    search, // <-- Add this
  }: {
    userId: string;
    db: any;
    page: number;
    limit: number;
    currentUserId?: string;
    canReport?: boolean;
    search?: string; // <-- Add this
  }) => {
    try {
      const offset = (page - 1) * limit;

      // Get job IDs the user has applied to
      const applied = await db
        .select({ jobId: jobApplications.jobId })
        .from(jobApplications)
        .where(eq(jobApplications.userId, userId))
        .limit(1000);

      const jobIds = applied.map((a: any) => a.jobId);
      if (jobIds.length === 0) return { jobs: [], totalCount: 0 };

      const whereConditions = [inArray(jobs.id, jobIds)];
      const searchCondition = JobService.buildSearchCondition(search);
      if (searchCondition) whereConditions.push(searchCondition);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(and(...whereConditions));

      // Get job details with application count and trending score
      const result = await db
        .select({
          id: jobs.id,
          details: jobs,
          isFeatured: jobs.isFeatured,
          trendingScore: sql<number>`(${jobs.numberOfViews} + ${jobs.numberOfApplicant})`,
          rank: sql<number>`RANK() OVER (ORDER BY (${jobs.numberOfViews} + ${jobs.numberOfApplicant}) DESC)`,
          postedBy: jobs.postedBy,
          applicationCount: sql<number>`
        (SELECT COUNT(*) FROM ${jobApplications} WHERE ${jobApplications.jobId} = ${jobs.id})
      `,
        })
        .from(jobs)
        .where(and(...whereConditions))
        .orderBy(desc(jobs.createdAt))
        .limit(limit)
        .offset(offset);

      // Trending logic
      const sorted = [...result].sort((a, b) => b.rank - a.rank);
      const topValue = new Set(sorted.slice(0, 10).map((j) => j.id)); // 10 trending by default

      const final = result.map((set: any) => {
        const isOwner = currentUserId ? set.postedBy === currentUserId : false;
        return {
          ...set,
          isTrending: topValue.has(set.id),
          isOwner,
          canDelete: isOwner,
          canReport: canReport && !isOwner,
          applicationCount: set.applicationCount,
        };
      });

      return {
        jobs: final,
        totalCount: Number(count),
      };
    } catch (error) {
      log.error("getAllJobsApplied failed:", error);
      throw new Error(`getAllJobsApplied failed: ${error}`);
    }
  };

  static getApplicantsForJob = async ({
    jobId,
    ownerId,
    db,
  }: {
    jobId: string;
    ownerId: string;
    db: any;
  }) => {
    try {
      // Ensure the requester is the owner of the job
      const [job] = await db
        .select({ postedBy: jobs.postedBy })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);

      if (!job || job.postedBy !== ownerId) {
        throw new Error(
          "You are not authorized to view applicants for this job."
        );
      }

      // Get applicants
      const applicants = await db
        .select({
          userId: jobApplications.userId,
          name: jobApplications.name,
          email: jobApplications.email,
          resume: jobApplications.resume,
          appliedAt: jobApplications.appliedAt,
        })
        .from(jobApplications)
        .where(eq(jobApplications.jobId, jobId))
        .orderBy(desc(jobApplications.appliedAt));

      return applicants;
    } catch (error) {
      log.error("getApplicantsForJob failed:", error);
      throw new Error(`getApplicantsForJob failed: ${error}`);
    }
  };

  static getApplicantsCountForJobs = async ({
    jobIds,
    db,
  }: {
    jobIds: string[];
    db: any;
  }) => {
    try {
      if (!jobIds.length) return [];
      const counts = await db
        .select({
          jobId: jobApplications.jobId,
          applicantCount: sql<number>`COUNT(*)`,
        })
        .from(jobApplications)
        .where(inArray(jobApplications.jobId, jobIds))
        .groupBy(jobApplications.jobId);

      return counts; // [{ jobId, applicantCount }, ...]
    } catch (error) {
      log.error("getApplicantsCountForJobs failed:", error);
      throw new Error(`getApplicantsCountForJobs failed: ${error}`);
    }
  };
  static async postJob({
    input,
    userId,
    entityId,
    db,
  }: {
    input: any;
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      if (!input || !userId || !entityId) {
        throw new GraphQLError("Input, User ID, and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (!input.title) {
        throw new GraphQLError("Job title is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Posting job", { userId, entityId, title: input.title });

      const slug = generateSlug(input.title);

      const [jobAdded] = await db.transaction(async (tx: any) => {
        const addedJobs = await tx
          .insert(jobs)
          .values({
            ...input,
            slug,
            status: "APPROVED",
            entityId,
            postedBy: userId,
          })
          .returning();

        await tx.insert(userFeed).values({
          userId,
          entity: entityId,
          description: "New Job Added",
          jobId: addedJobs[0].id,
          source: "jobs",
        });

        return addedJobs;
      });

      await GamificationEventService.triggerEvent({
        triggerId: "tr-job-create",
        moduleId: "jobs",
        userId,
        entityId,
      });

      log.info("Job posted successfully", {
        userId,
        jobId: jobAdded.id,
        title: input.title,
      });
      return jobAdded;
    } catch (error) {
      log.error("Error in postJob", { error, userId, entityId });
      throw error;
    }
  }

  static async applyToJob({
    jobId,
    name,
    email,
    resume,
    db,
    userId,
  }: {
    jobId: string;
    name: string;
    email: string;
    resume: string;
    db: any;
    userId: string;
  }) {
    try {
      if (!jobId || !userId || !name || !email) {
        throw new GraphQLError(
          "Job ID, User ID, name, and email are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Applying to job", { jobId, userId });

      const applications = await db
        .select()
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.jobId, jobId),
            eq(jobApplications.userId, userId)
          )
        );

      if (applications.length >= 3) {
        throw new GraphQLError(
          "You have reached the maximum number of applications (3) for this job.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      const [application] = await db
        .insert(jobApplications)
        .values({
          jobId,
          userId,
          name,
          email,
          resume: resume || "",
          appliedAt: new Date(),
        })
        .returning();

      await db
        .update(jobs)
        .set({
          numberOfApplicant: sql<number>`COALESCE(${jobs.numberOfApplicant}, 0) + 1`,
        })
        .where(eq(jobs.id, jobId));

      log.info("Job application submitted", {
        jobId,
        userId,
        applicationId: application.id,
      });

      // Gamification Trigger
      const [job] = await db
        .select({ entityId: jobs.entityId })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);

      if (job) {
        await GamificationEventService.triggerEvent({
          triggerId: "tr-job-apply",
          moduleId: "jobs",
          userId,
          entityId: job.entityId,
        });
      }

      return application;
    } catch (error) {
      log.error("Error in applyToJob", { error, jobId, userId });
      throw error;
    }
  }

  static async deleteJob({
    jobId,
    userId,
    db,
  }: {
    jobId: string;
    userId: string;
    db: any;
  }) {
    try {
      if (!jobId || !userId) {
        throw new GraphQLError("Job ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Deleting job", { jobId, userId });

      const job = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, jobId), eq(jobs.postedBy, userId)))
        .limit(1);

      if (!job.length) {
        throw new GraphQLError("You are not authorized to delete this job.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      await db.delete(jobs).where(eq(jobs.id, jobId));

      log.info("Job deleted successfully", { jobId, userId });
      return { success: true, message: "Job deleted successfully." };
    } catch (error) {
      log.error("Error in deleteJob", { error, jobId, userId });
      throw error;
    }
  }

  static async editJob({
    jobId,
    userId,
    input,
    db,
  }: {
    jobId: string;
    userId: string;
    input: any;
    db: any;
  }) {
    try {
      if (!jobId || !userId || !input) {
        throw new GraphQLError("Job ID, User ID, and input are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Editing job", { jobId, userId });

      const job = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, jobId), eq(jobs.postedBy, userId)))
        .limit(1);

      if (!job.length) {
        throw new GraphQLError("You are not authorized to edit this job.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      let updateData = { ...input };
      if (input.title) {
        updateData.slug = generateSlug(input.title);
      }

      const [updatedJob] = await db
        .update(jobs)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, jobId))
        .returning();

      log.info("Job edited successfully", { jobId, userId });
      return updatedJob;
    } catch (error) {
      log.error("Error in editJob", { error, jobId, userId });
      throw error;
    }
  }

  static async getJobDetails({
    jobId,
    currentUserId,
    db,
  }: {
    jobId: string;
    currentUserId?: string;
    db: any;
  }) {
    try {
      if (!jobId) {
        throw new GraphQLError("Job ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting job details", { jobId, currentUserId });

      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);

      if (!job) {
        throw new GraphQLError("Job not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (currentUserId && job.postedBy !== currentUserId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentView = await db
          .select()
          .from(jobViews)
          .where(
            and(
              eq(jobViews.jobId, jobId),
              eq(jobViews.userId, currentUserId),
              sql`${jobViews.viewedAt} > ${oneHourAgo}`
            )
          )
          .limit(1);

        if (recentView.length === 0) {
          await db
            .update(jobs)
            .set({
              numberOfViews: sql<number>`COALESCE(${jobs.numberOfViews}, 0) + 1`,
            })
            .where(eq(jobs.id, jobId));

          await db
            .insert(jobViews)
            .values({
              jobId,
              userId: currentUserId,
              viewedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [jobViews.jobId, jobViews.userId],
              set: { viewedAt: new Date() },
            });

          log.debug("Job view recorded", { jobId, currentUserId });
        }
      }

      log.info("Job details retrieved", { jobId });
      return {
        job,
        isOwner: currentUserId ? job.postedBy === currentUserId : false,
      };
    } catch (error) {
      log.error("Error in getJobDetails", { error, jobId });
      throw error;
    }
  }

  static async reportJob({
    jobId,
    reportedBy,
    entityId,
    reason,
    description,
    db,
  }: {
    jobId: string;
    reportedBy: string;
    entityId: string;
    reason: string;
    description?: string;
    db: any;
  }) {
    try {
      if (!jobId || !reportedBy || !entityId || !reason) {
        throw new GraphQLError(
          "Job ID, Reporter ID, Entity ID, and Reason are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Reporting job", { jobId, reportedBy, reason });

      const allowedReasons = [
        "SPAM",
        "INAPPROPRIATE",
        "SCAM",
        "MISLEADING",
        "OTHER",
      ] as const;
      type AllowedReason = (typeof allowedReasons)[number];
      const mappedReason: AllowedReason = allowedReasons.includes(
        reason as AllowedReason
      )
        ? (reason as AllowedReason)
        : "OTHER";

      const [report] = await db
        .insert(jobReports)
        .values({
          jobId,
          reportedBy,
          entityId,
          reason: mappedReason,
          description,
          status: "PENDING",
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      log.info("Job reported", { jobId, reportedBy, reason: mappedReason });
      return report;
    } catch (error) {
      log.error("Error in reportJob", { error, jobId, reportedBy });
      throw error;
    }
  }

  static async saveJob({
    jobId,
    userId,
    db,
  }: {
    jobId: string;
    userId: string;
    db: any;
  }) {
    try {
      if (!jobId || !userId) {
        throw new GraphQLError("Job ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Saving job", { jobId, userId });

      const [saved] = await db
        .insert(savedJobs)
        .values({
          jobId,
          userId,
          savedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      log.info("Job saved", { jobId, userId });
      return saved;
    } catch (error) {
      log.error("Error in saveJob", { error, jobId, userId });
      throw error;
    }
  }

  static getJobsStatistics = async ({
    jobIds,
    db,
  }: {
    jobIds: string[];
    db: any;
  }) => {
    try {
      if (!jobIds.length) return [];
      const stats = await db
        .select({
          jobId: jobs.id,
          status: jobs.status,
          numberOfApplicants: jobs.numberOfApplicant,
          numberOfViews: jobs.numberOfViews,
          numberOfSaves: sql<number>`
          (SELECT COUNT(*) FROM ${savedJobs} WHERE ${savedJobs.jobId} = ${jobs.id})
        `,
        })
        .from(jobs)
        .where(inArray(jobs.id, jobIds));
      return stats; // [{ jobId, status, numberOfApplicants, numberOfViews, numberOfSaves }, ...]
    } catch (error) {
      log.error("getJobsStatistics failed:", error);
      throw new Error(`getJobsStatistics failed: ${error}`);
    }
  };

  static getMyJobs = async ({
    userId,
    entityId,
    db,
    page,
    limit,
    search, // <-- Add this
  }: {
    userId: string;
    entityId: string;
    db: any;
    page: number;
    limit: number;
    search?: string; // <-- Add this
  }) => {
    try {
      const offset = (page - 1) * limit;

      const whereConditions = [
        eq(jobs.entityId, entityId),
        eq(jobs.postedBy, userId),
      ];
      const searchCondition = JobService.buildSearchCondition(search);
      if (searchCondition) whereConditions.push(searchCondition);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(and(...whereConditions));

      // Get paginated jobs with application count
      const result = await db
        .select({
          id: jobs.id,
          details: jobs,
          isFeatured: jobs.isFeatured,
          postedBy: jobs.postedBy,
          applicationCount: sql<number>`
          (SELECT COUNT(*) FROM ${jobApplications} WHERE ${jobApplications.jobId} = ${jobs.id})
        `,
        })
        .from(jobs)
        .where(and(...whereConditions))
        .orderBy(desc(jobs.createdAt))
        .limit(limit)
        .offset(offset);

      const final = result.map((set: any) => {
        const isOwner = true;
        const isJobSaved = false;
        return {
          ...set,
          isTrending: false,
          isOwner,
          canDelete: isOwner,
          canReport: false,
          applicationCount: set.applicationCount,
          isJobSaved,
        };
      });

      return {
        jobs: final,
        totalCount: Number(count),
      };
    } catch (error) {
      console.log(error);
      log.error("getMyJobs failed:", error);
      throw new Error(`getMyJobs failed: ${error}`);
    }
  };
}
