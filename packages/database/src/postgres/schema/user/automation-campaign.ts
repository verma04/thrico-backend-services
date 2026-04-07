import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  pgEnum,
  numeric,
  boolean,
  json,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";

export const automationCampaignStatusEnum = pgEnum("AutomationCampaignStatus", [
  "active",
  "inactive",
  "draft",
]);

export const automationCampaign = pgTable("automation_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  entityId: uuid("org_id").notNull(),
  status: automationCampaignStatusEnum("status").default("draft").notNull(),
  triggerType: text("trigger_type").notNull(), // 'EVENT', 'SCHEDULED', 'DATE'
  triggerConfig: json("trigger_config").notNull(), // { event: 'user_joined', ... } or { cron: '* * * * *' }
  segmentationConfig: json("segmentation_config"), // { conditions: [...] } or { sql: '...' }
  actionConfig: json("action_config").notNull(), // [{ type: 'EMAIL', templateId: '...' }, { type: 'NOTIFICATION', ... }]
  frequency: text("frequency"),
  module: text("module"),
  channelType: text("channel_type"),
  targetUsers: json("target_users"),
  canvasNodes: json("canvas_nodes"),
  canvasEdges: json("canvas_edges"),
  cronType: text("cron_type"),
  cronDay: text("cron_day"),
  cronDate: text("cron_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const automationCampaignRelations = relations(
  automationCampaign,
  ({ one }) => ({
    entity: one(entity, {
      fields: [automationCampaign.entityId],
      references: [entity.id],
    }),
  })
);

export const automationJob = pgTable("automation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => automationCampaign.id),
  userId: uuid("user_id").notNull(),
  status: text("status").notNull(), // 'PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'
  context: json("context"), // Metadata from trigger
  attempts: numeric("attempts").default("0"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const automationJobRelations = relations(automationJob, ({ one }) => ({
  campaign: one(automationCampaign, {
    fields: [automationJob.campaignId],
    references: [automationCampaign.id],
  }),
}));

export const automationExecutionLog = pgTable("automation_execution_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => automationJob.id),
  campaignId: uuid("campaign_id").notNull(),
  userId: uuid("user_id").notNull(),
  actionIndex: numeric("action_index").notNull(),
  actionType: text("action_type").notNull(),
  status: text("status").notNull(), // 'SUCCESS', 'FAILED'
  result: json("result"),
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").defaultNow(),
});
