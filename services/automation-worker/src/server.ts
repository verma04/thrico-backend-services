import { log } from "@thrico/logging";
import { redis, getDb, automationJob, automationExecutionLog } from "@thrico/database";
import { 
  NotificationService, 
  FirebaseService, 
  AutomationService 
} from "@thrico/services";
import { Worker, Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";
import http from "http";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const QUEUE_NAME = "automation:jobs";

async function processJob(job: Job) {
  const jobData = job.data;
  const db = await getDb();
  
  log.info(`Processing automation job: ${job.id}`, { campaignId: jobData.campaignId });
  
  // 1. Update status to PROCESSING
  await db.update(automationJob)
    .set({ status: "PROCESSING", updatedAt: new Date() })
    .where(eq(automationJob.id, job.id!));

  try {
    // 2. Fetch campaign and actions
    const campaign = await db.query.automationCampaign.findFirst({
      where: eq(automationJob.campaignId, jobData.campaignId)
    });

    if (!campaign) throw new Error("Campaign not found");

    const actions = campaign.actionConfig as any[];
    
    // 3. Execute actions (in sequence for now)
    let actionIndex = 0;
    for (const action of actions) {
      log.debug(`Executing action ${actionIndex}: ${action.type}`, { jobId: job.id });
      
      try {
        const result = await executeAction(db, jobData.userId, action, jobData.context);
        
        // Log successful execution
        await db.insert(automationExecutionLog).values({
          jobId: job.id!,
          campaignId: campaign.id,
          userId: jobData.userId,
          actionIndex: actionIndex.toString(),
          actionType: action.type,
          status: "SUCCESS",
          result: result
        });
      } catch (err: any) {
        log.error(`Action failed: ${action.type}`, { err: err.message });
        
        // Log failed execution
        await db.insert(automationExecutionLog).values({
          jobId: job.id!,
          campaignId: campaign.id,
          userId: jobData.userId,
          actionIndex: actionIndex.toString(),
          actionType: action.type,
          status: "FAILED",
          errorMessage: err.message
        });
        
        throw err; // Stop the sequence on failure
      }
      actionIndex++;
    }

    // 4. Update status to COMPLETED
    await db.update(automationJob)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(automationJob.id, job.id!));

  } catch (err: any) {
    log.error(`Job failed: ${job.id}`, { err: err.message });
    
    await db.update(automationJob)
      .set({ 
        status: "FAILED", 
        lastError: err.message, 
        updatedAt: new Date() 
      })
      .where(eq(automationJob.id, job.id!));
      
    throw err; // Rethrow for BullMQ retry
  }
}

async function executeAction(db: any, userId: string, action: any, context?: any) {
  switch (action.type) {
    case "NOTIFICATION":
      return NotificationService.createNotification({
        db,
        userId,
        entityId: context?.entityId || action.entityId,
        content: action.message || "New notification",
        type: action.notificationType || "SYSTEM",
        shouldSendPush: !!action.push,
        pushTitle: action.pushTitle,
        pushBody: action.pushBody,
      });
    
    case "EMAIL":
      // Placeholder for email delivery
      log.info(`Sending mock email to user ${userId} with template ${action.templateId}`);
      return { sent: true, provider: "SENDGRID_MOCK" };
    
    case "COMMUNITY_JOIN":
      // Action logic: add user to a community automatically
      // Need CommunityActionsService instance...
      log.info(`Automatically joining user ${userId} to community ${action.communityId}`);
      return { success: true };

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

async function init() {
  const worker = new Worker(QUEUE_NAME, processJob, {
    connection: redis.client,
    concurrency: parseInt(process.env.AUTOMATION_WORKER_CONCURRENCY || "10", 10),
  });

  worker.on("completed", (job) => {
    log.info(`Worker job completed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    log.error(`Worker job failed: ${job?.id}`, { err: err.message });
  });

  log.info("🚀 Automation Worker processing jobs...");
}

const HEALTH_PORT = process.env.AUTOMATION_WORKER_HEALTH_PORT || 3011;
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "automation-worker" }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
healthServer.listen(HEALTH_PORT, () => {
  log.info(`Health check listening on port ${HEALTH_PORT}`);
});

init().catch(err => {
  log.error("Fatal error in Automation Worker", { err });
  process.exit(1);
});
