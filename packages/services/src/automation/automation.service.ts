import {
  AppDatabase,
  automationCampaign,
  automationJob,
  automationExecutionLog,
  automationCampaignStatusEnum,
  user,
  entity,
  entitySettings,
} from "@thrico/database";
import { and, eq, sql, desc } from "drizzle-orm";
import { log } from "@thrico/logging";
import { GamificationEventService } from "../gamification/gamification-event.service";

export class AutomationService {
  /**
   * Triggers a gamification event (delegates to GamificationEventService).
   */
  static async triggerGamificationEvent(data: {
    triggerId: string;
    moduleId: string;
    userId: string;
    entityId: string;
    referenceId?: string;
  }) {
    return GamificationEventService.triggerEvent(data);
  }

  /**
   * Finds all active campaigns that match an event trigger.
   */
  static async matchEventCampaigns(
    db: AppDatabase,
    eventName: string,
    entityId: string,
  ) {
    try {
      return await db.query.automationCampaign.findMany({
        where: and(
          eq(automationCampaign.entityId, entityId),
          eq(automationCampaign.status, "active"),
          eq(automationCampaign.triggerType, "EVENT"),
          sql`${automationCampaign.triggerConfig} ->> 'event' = ${eventName}`,
        ),
      });
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
    context?: any,
  ): Promise<boolean> {
    const config = campaign.segmentationConfig as any;
    if (!config || !config.conditions || config.conditions.length === 0) {
      return true; // No segmentation means everyone matches
    }

    try {
      // 1. Fetch user with necessary context for segmentation
      const userData = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: {
          profile: true,
          userEntity: true,
          gamification: true,
        }
      });

      if (!userData) {
        log.warn(`User ${userId} not found for automation segmentation`);
        return false;
      }

      // 2. Evaluate conditions
      const { operator = "AND", conditions } = config;
      
      if (operator === "AND") {
        for (const condition of conditions) {
          if (!this.evaluateCondition(userData, condition, context)) {
            return false;
          }
        }
        return true;
      } else if (operator === "OR") {
        for (const condition of conditions) {
          if (this.evaluateCondition(userData, condition, context)) {
            return true;
          }
        }
        return false;
      }

      return true;
    } catch (err) {
      log.error(`Error evaluating segmentation for user ${userId}`, { err });
      return false;
    }
  }

  private static evaluateCondition(userData: any, condition: any, context?: any): boolean {
    const { field, operator, value } = condition;
    
    let actualValue: any;
    if (field.startsWith("context.")) {
      actualValue = this.getNestedValue(context, field.replace("context.", ""));
    } else {
      actualValue = this.getNestedValue(userData, field);
    }

    switch (operator) {
      case "eq": return actualValue === value;
      case "neq": return actualValue !== value;
      case "gt": return actualValue > value;
      case "gte": return actualValue >= value;
      case "lt": return actualValue < value;
      case "lte": return actualValue <= value;
      case "in": return Array.isArray(value) && value.includes(actualValue);
      case "contains": return Array.isArray(actualValue) && actualValue.includes(value);
      case "exists": return actualValue !== undefined && actualValue !== null;
      default:
        log.warn(`Unknown segmentation operator: ${operator}`);
        return false;
    }
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((o, i) => (o ? o[i] : undefined), obj);
  }

  /**
   * Checks if a job already exists for a user and campaign on current date.
   */
  static async checkJobExists(db: AppDatabase, campaignId: string, userId: string) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const job = await db.query.automationJob.findFirst({
        where: and(
          eq(automationJob.campaignId, campaignId),
          eq(automationJob.userId, userId),
          sql`DATE(${automationJob.createdAt}) = ${today}`
        )
      });
      return !!job;
    } catch (err) {
      log.error("Error checking job existence", { err });
      return false;
    }
  }

  /**
   * Creates jobs for the matched users.
   */
  static async createJobs(
    db: AppDatabase,
    campaignId: string,
    userIds: string[],
    context?: any,
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
            })),
          )
          .returning();
        createdJobs.push(...jobs);
      }

      return createdJobs;
    } catch (err) {
      log.error(`Error creating automation jobs for campaign ${campaignId}`, {
        err,
      });
      throw err;
    }
  }

  // --- CRUD METHODS ---

  static async getCampaigns(db: AppDatabase, entityId: string) {
    return db.query.automationCampaign.findMany({
      where: eq(automationCampaign.entityId, entityId),
      orderBy: desc(automationCampaign.createdAt),
    });
  }

  static async getCampaign(db: AppDatabase, id: string) {
    return db.query.automationCampaign.findFirst({
      where: eq(automationCampaign.id, id),
    });
  }

  static async createCampaign(db: AppDatabase, data: any) {
    const [newCampaign] = await db.insert(automationCampaign).values(data).returning();
    return newCampaign;
  }

  static async updateCampaign(db: AppDatabase, id: string, entityId: string, data: any) {
    const [updated] = await db.update(automationCampaign)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(automationCampaign.id, id), eq(automationCampaign.entityId, entityId)))
      .returning();
    return updated;
  }

  static async deleteCampaign(db: AppDatabase, id: string, entityId: string) {
    const [deleted] = await db.delete(automationCampaign)
      .where(and(eq(automationCampaign.id, id), eq(automationCampaign.entityId, entityId)))
      .returning();
    return !!deleted;
  }

  static async getJobs(db: AppDatabase, campaignId: string) {
    return db.query.automationJob.findMany({
      where: eq(automationJob.campaignId, campaignId),
      orderBy: desc(automationJob.createdAt),
      with: { campaign: true }
    });
  }

  static async getLogs(db: AppDatabase, jobId: string) {
    return db.query.automationExecutionLog.findMany({
      where: eq(automationExecutionLog.jobId, jobId),
      orderBy: desc(automationExecutionLog.executedAt),
    });
  }

  static async getMetadata(db: AppDatabase, entityId: string) {
    const settings = await db.query.entitySettings.findFirst({
      where: eq(entitySettings.entity, entityId),
    });
    
    // Use raw query for entity to verify type
    const ent = await db.query.entity.findFirst({
      where: eq(entity.id, entityId),
      columns: { entityType: true }
    });

    const modules = [
      {
        id: "COMMUNITY",
        name: "Community",
        enabled: settings?.allowCommunity ?? true,
        triggers: [
          { id: "COMMUNITY_JOIN", name: "Joined Community" },
          { id: "COMMUNITY_LEAVE", name: "Left Community" },
        ],
        segmentationFields: [
          { id: "userEntity.role", name: "Role", type: "STRING" },
          { id: "userEntity.status", name: "Entity Status", type: "STRING" },
        ]
      },
      {
        id: "USER_PROFILE",
        name: "User Profile",
        enabled: true,
        triggers: [
          { id: "USER_SIGNUP", name: "User Signup" },
          { id: "PROFILE_UPDATED", name: "Profile Updated" },
        ],
        segmentationFields: [
          { id: "profile.firstName", name: "First Name", type: "STRING" },
          { id: "profile.lastName", name: "Last Name", type: "STRING" },
          { id: "profile.gender", name: "Gender", type: "STRING" },
          { id: "profile.location", name: "Location", type: "STRING" },
        ]
      },
      {
        id: "EVENTS",
        name: "Events",
        enabled: settings?.allowEvents ?? true,
        triggers: [
          { id: "EVENT_CREATED", name: "Event Created" },
          { id: "EVENT_REGISTERED", name: "Registered for Event" },
          { id: "EVENT_ATTENDED", name: "Attended Event" },
        ],
        segmentationFields: []
      },
      {
        id: "POLL",
        name: "Polls",
        enabled: settings?.allowPolls ?? true,
        triggers: [
          { id: "POLL_CREATED", name: "Poll Created" },
          { id: "POLL_VOTED", name: "Voted in Poll" },
        ],
        segmentationFields: []
      },
      {
        id: "SURVEYS",
        name: "Surveys",
        enabled: settings?.allowSurveys ?? true,
        triggers: [
          { id: "SURVEY_CREATED", name: "Survey Created" },
          { id: "SURVEY_SUBMITTED", name: "Survey Submitted" },
        ],
        segmentationFields: []
      },
      {
        id: "JOBS",
        name: "Jobs",
        enabled: settings?.allowJobs ?? true,
        triggers: [
          { id: "JOB_CREATED", name: "Job Created" },
          { id: "JOB_APPLIED", name: "Job Applied" },
        ],
        segmentationFields: []
      },
      {
        id: "GAMIFICATION",
        name: "Gamification",
        enabled: true,
        triggers: [
          { id: "POINTS_EARNED", name: "Points Earned" },
          { id: "RANK_UP", name: "Ranked Up" },
          { id: "BADGE_UNLOCKED", name: "Badge Unlocked" },
          { id: "LEVEL_UP", name: "Level Up" },
          { id: "LEADERBOARD_CHANGE", name: "Leaderboard Position Change" },
        ],
        segmentationFields: [
          { id: "gamification.totalPoints", name: "Total Points", type: "NUMBER" },
          { id: "gamification.level", name: "Level", type: "NUMBER" },
          { id: "gamification.coins", name: "Coins", type: "NUMBER" },
        ]
      },
      {
        id: "REWARDS",
        name: "Rewards & Games",
        enabled: true,
        triggers: [
          { id: "REWARD_CLAIMED", name: "Reward Claimed" },
          { id: "SPIN_WHEEL_WIN", name: "Spin Wheel Win" },
          { id: "MATCH_AND_WIN", name: "Match and Win" },
        ],
        segmentationFields: [
          { id: "context.isWinner", name: "Is Winner", type: "BOOLEAN" },
          { id: "context.rewardId", name: "Reward Reference ID", type: "STRING" }
        ]
      }
    ];

    // Filter based on theme (entityType)
    if (ent?.entityType === "ALUMNI") {
      const userProfileModule = modules.find(m => m.id === "USER_PROFILE");
      if (userProfileModule) {
        userProfileModule.segmentationFields.push(
          { id: "profile.graduationYear", name: "Graduation Year", type: "NUMBER" },
          { id: "profile.degree", name: "Degree", type: "STRING" }
        );
      }
    }

    return {
      modules: modules.filter(m => m.enabled)
    };
  }

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  }
}
