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
          notificationType: "JOB_APPLICATION",
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
        notificationType: "JOB_APPLIED",
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
        notificationType: "JOB_POSTED",
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
}
