import { Queue, Worker, QueueEvents } from "bullmq";
import { redis } from "@thrico/database";
import { log } from "@thrico/logging";

const QUEUE_NAME = "automation:jobs";

export class AutomationQueueService {
  private static queue: Queue | null = null;

  static getQueue(): Queue {
    if (!this.queue) {
      this.queue = new Queue(QUEUE_NAME, {
        connection: redis.client,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        },
      });
    }
    return this.queue;
  }

  static async addJob(jobId: string, data: any) {
    try {
      const q = this.getQueue();
      await q.add(jobId, data, {
        jobId, // Use job ID from DB for idempotency
      });
      log.info(`Job added to automation queue: ${jobId}`);
    } catch (err) {
      log.error(`Failed to add job ${jobId} to queue`, { err });
      throw err;
    }
  }

  static async addJobs(jobs: { id: string; data: any }[]) {
    try {
      const q = this.getQueue();
      await q.addBulk(
        jobs.map((j) => ({
          name: j.id,
          data: j.data,
          opts: { jobId: j.id },
        }))
      );
      log.info(`${jobs.length} jobs added to automation queue`);
    } catch (err) {
      log.error(`Failed to add bulk jobs to queue`, { err });
      throw err;
    }
  }
}
