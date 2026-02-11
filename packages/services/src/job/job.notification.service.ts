import { NotificationService } from "../notification/notification.service";
import { log } from "@thrico/logging";

export class JobNotificationService {
  static async publishJobApplication({
    jobData,
    userId,
    name,
    jobId,
    db,
  }: {
    jobData: any;
    userId: string;
    name: string;
    jobId: string;
    db: any;
  }) {
    try {
      // Send notification to job poster
      if (jobData.postedBy && jobData.postedBy !== userId) {
        await NotificationService.createNotification({
          db,
          userId: jobData.postedBy,
          senderId: userId,
          entityId: jobData.entityId,
          module: "JOB",
          type: "JOB_APPLICATION",
          content: `${name} applied for your job "${jobData.title}".`,
          shouldSendPush: true,
          pushTitle: "New Job Application",
          pushBody: `${name} applied for your job "${jobData.title}".`,
          jobId,
        }).catch((err) => {
          log.error("Failed to send job application notification to poster", {
            jobId,
            error: err.message,
          });
        });
      }

      // Send notification to applicant
      await NotificationService.createNotification({
        db,
        userId,
        senderId: jobData.postedBy || undefined, // Sent by job poster or system
        entityId: jobData.entityId,
        module: "JOB",
        type: "JOB_APPLIED",
        content: `You have successfully applied for "${jobData.title}".`,
        shouldSendPush: true,
        pushTitle: "Application Submitted",
        pushBody: `You have successfully applied for "${jobData.title}".`,
        jobId,
      }).catch((err) => {
        log.error("Failed to send job application notification to applicant", {
          jobId,
          error: err.message,
        });
      });
    } catch (error: any) {
      log.error("Error in publishJobApplication", {
        error: error.message,
        jobId,
        userId,
      });
    }
  }

  static async publishJobPosted({
    userId,
    jobId,
    jobTitle,
    entityId,
    db,
  }: {
    userId: string;
    jobId: string;
    jobTitle: string;
    entityId: string;
    db: any;
  }) {
    try {
      // Notify the job poster (confirmation)
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        module: "JOB",
        type: "JOB_POSTED",
        content: `Your job "${jobTitle}" has been posted successfully.`,
        shouldSendPush: true,
        pushTitle: "Job Posted",
        pushBody: `Your job "${jobTitle}" is now live!`,
        jobId,
      }).catch((err) => {
        log.error("Failed to send job posted notification", {
          userId,
          jobId,
          error: err.message,
        });
      });

      log.info("Job posted notification sent to owner", {
        jobId,
        userId,
      });
    } catch (error: any) {
      log.error("Error in publishJobPosted", {
        error: error.message,
        jobId,
        userId,
      });
    }
  }

  static async notifyJobLike({
    db,
    userId,
    senderId,
    entityId,
    jobId,
    jobTitle,
    likerName,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    jobId: string;
    jobTitle: string;
    likerName: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "JOB",
        type: "JOB_LIKE",
        content: `${likerName} liked your job posting "${jobTitle}".`,
        shouldSendPush: true,
        pushTitle: "Job Liked",
        pushBody: `${likerName} liked your job "${jobTitle}"`,
        jobId,
      }).catch((err) => {
        log.error("Failed to send job like notification", {
          userId,
          jobId,
          error: err.message,
        });
      });

      log.info("Job like notification sent", { userId, jobId });
    } catch (error: any) {
      log.error("Error in notifyJobLike", {
        error: error.message,
        jobId,
        userId,
      });
    }
  }

  static async getJobNotifications({
    db,
    userId,
    cursor,
    limit = 10,
  }: {
    db: any;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    try {
      const { lt, desc, and, eq } = await import("drizzle-orm");
      const { jobNotifications, user, userToEntity, jobs } =
        await import("@thrico/database");

      log.debug("Getting job notifications", { userId, cursor, limit });

      const query = db
        .select({
          id: jobNotifications.id,
          type: jobNotifications.type,
          content: jobNotifications.content,
          isRead: jobNotifications.isRead,
          createdAt: jobNotifications.createdAt,
          sender: {
            id: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          job: jobs,
        })
        .from(jobNotifications)
        .leftJoin(userToEntity, eq(jobNotifications.senderId, userToEntity.id))
        .leftJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(jobs, eq(jobNotifications.jobId, jobs.id))
        .where(
          and(
            eq(jobNotifications.userId, userId),
            cursor
              ? lt(jobNotifications.createdAt, new Date(cursor))
              : undefined,
          ),
        )
        .orderBy(desc(jobNotifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getJobNotifications", { error, userId });
      throw error;
    }
  }
}
