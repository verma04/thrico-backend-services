import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entity } from "../entity/details";

export const mcpKeys = pgTable("mcp_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  permissions: jsonb("permissions").$type<string[]>().default([]).notNull(), // List of allowed actions
  status: text("status").default("active").notNull(), // active, inactive, revoked
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mcpLogs = pgTable("mcp_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  actionName: text("action_name").notNull(),
  status: text("status").notNull(), // success, failed
  triggerSource: text("trigger_source").notNull(), // AI, System
  payload: jsonb("payload"),
  result: jsonb("result"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const mcpKeysRelations = relations(mcpKeys, ({ one }) => ({
  entity: one(entity, {
    fields: [mcpKeys.entityId],
    references: [entity.id],
  }),
}));

export const mcpLogsRelations = relations(mcpLogs, ({ one }) => ({
  entity: one(entity, {
    fields: [mcpLogs.entityId],
    references: [entity.id],
  }),
}));
