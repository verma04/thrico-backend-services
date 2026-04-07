import { 
  AppDatabase, 
  automationCampaign, 
  automationJob, 
  automationCampaignStatusEnum,
  user
} from "@thrico/database";
import { and, eq, sql, inArray } from "drizzle-orm";
import { log } from "@thrico/logging";

export class AutomationService {
  /**
   * Finds all active campaigns that match an event trigger.
   */
  static async matchEventCampaigns(
    db: AppDatabase, 
    eventName: string, 
    entityId: string
  ) {
    try {
      // Find campaigns where triggerConfig.event matching eventName
      const matchingCampaigns = await db.query.automationCampaign.findMany({
        where: and(
          eq(automationCampaign.entityId, entityId),
          eq(automationCampaign.status, "active"),
          eq(automationCampaign.triggerType, "EVENT"),
          sql`${automationCampaign.triggerConfig} ->> 'event' = ${eventName}`
        ),
      });

      return matchingCampaigns;
    } catch (err) {
      log.error(`Error matching event campaigns for ${eventName}`, { err });
      return [];
    }
  }

  /**
   * Evaluates if a user matches the segmentation criteria of a campaign.
   */
  static async evaluateSegmentation(
    db: AppDatabase, 
    campaign: any, 
    userId: string, 
    context?: any
  ): Promise<boolean> {
    const config = campaign.segmentationConfig;
    if (!config || Object.keys(config).length === 0) {
      return true; // No segmentation means everyone matches
    }

    // TODO: Implement sophisticated segmentation logic based on rules
    // For now, assume it's true unless explicit rules say otherwise
    return true;
  }

  /**
   * Creates jobs for the matched users.
   */
  static async createJobs(
    db: AppDatabase, 
    campaignId: string, 
    userIds: string[], 
    context?: any
  ) {
    if (userIds.length === 0) return [];

    try {
      const chunks = this.chunkArray(userIds, 100);
      const createdJobs = [];

      for (const chunk of chunks) {
        const jobs = await db
          .insert(automationJob)
          .values(
            chunk.map((userId) => ({
              campaignId,
              userId,
              status: "PENDING",
              context,
            }))
          )
          .returning();
        createdJobs.push(...jobs);
      }

      return createdJobs;
    } catch (err) {
      log.error(`Error creating automation jobs for campaign ${campaignId}`, { err });
      throw err;
    }
  }

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  }
}
