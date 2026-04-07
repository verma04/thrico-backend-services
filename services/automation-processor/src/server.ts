import { log } from "@thrico/logging";
import { redis, getDb } from "@thrico/database";
import { AutomationService, AutomationQueueService } from "@thrico/services";
import cron from "node-cron";
import dotenv from "dotenv";
import path from "path";
import http from "http";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const STREAM_NAME = "automation:events";
const GROUP_NAME = "automation-processor-group";
const CONSUMER_NAME = `processor-${process.env.HOSTNAME || "local"}`;

async function setupConsumerGroup() {
  try {
    await redis.client.xgroup("CREATE", STREAM_NAME, GROUP_NAME, "0", "MKSTREAM");
    log.info(`Consumer group ${GROUP_NAME} created on stream ${STREAM_NAME}`);
  } catch (err: any) {
    if (!err.message.includes("BUSYGROUP")) {
      log.error("Error creating consumer group", { err });
      throw err;
    }
    log.info(`Consumer group ${GROUP_NAME} already exists`);
  }
}

async function processEvents() {
  log.info("🚀 Automation event processor started...");
  
  while (true) {
    try {
      const results: any = await redis.client.xreadgroup(
        "GROUP", GROUP_NAME, CONSUMER_NAME,
        "COUNT", "10", "BLOCK", "5000",
        "STREAMS", STREAM_NAME, ">"
      );

      if (!results) continue;

      for (const [streamName, messages] of results) {
        for (const [id, [fieldName, content]] of messages) {
          const payload = JSON.parse(content);
          log.debug(`Processing automation event: ${payload.eventName}`, { id });
          
          await handleTrigger(payload);

          // Acknowledge the message
          await redis.client.xack(STREAM_NAME, GROUP_NAME, id);
        }
      }
    } catch (err) {
      log.error("Error in event processor loop", { err });
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

async function handleTrigger(payload: { eventName: string, userId: string, entityId: string, metadata?: any }) {
  const db = await getDb();
  
  // 1. Matching
  const campaigns = await AutomationService.matchEventCampaigns(db, payload.eventName, payload.entityId);
  
  for (const campaign of campaigns) {
    // 2. Segmentation
    const isMatched = await AutomationService.evaluateSegmentation(db, campaign, payload.userId, payload.metadata);
    
    if (isMatched) {
      // 3. Create Jobs
      const jobs = await AutomationService.createJobs(db, campaign.id, [payload.userId], payload.metadata);
      
      // 4. Queue Jobs
      if (jobs.length > 0) {
        await AutomationQueueService.addJobs(jobs.map(j => ({ id: j.id, data: j })));
      }
    }
  }
}

async function runScheduledCampaigns() {
  log.debug("Running scheduled campaigns check...");
  // TODO: Add logic to fetch SCHEDULED/DATE campaigns and find matching users
}

async function init() {
  await setupConsumerGroup();
  
  // Start event processing loop
  processEvents().catch(err => {
    log.error("Fatal error in event processing loop", { err });
    process.exit(1);
  });

  // Start scheduler
  cron.schedule("* * * * *", async () => {
    try {
      await runScheduledCampaigns();
    } catch (err) {
      log.error("Error running scheduled campaigns", { err });
    }
  });

  log.info("🔔 Automation Processor fully initialized");
}

const HEALTH_PORT = process.env.AUTOMATION_PROCESSOR_HEALTH_PORT || 3010;
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "automation-processor" }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(HEALTH_PORT, () => {
  log.info(`Health check listening on port ${HEALTH_PORT}`);
});

init().catch(err => {
  log.error("Failed to initialize Automation Processor", { err });
  process.exit(1);
});
