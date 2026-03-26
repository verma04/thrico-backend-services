import { relations, sql } from "drizzle-orm";
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { userToEntity } from "./user";

export const reportModuleENum = pgEnum("reportModule", [
  "FEED",
  "MEMBER",
  "DISCUSSION_FORUM",
  "COMMUNITY",
  "JOB",
  "LISTING",
  "MOMENT",
  "OFFER",
  "EVENT",
  "USER",
  "SHOP",
  "SURVEY",
]);

export const logStatusEnum = pgEnum("reportStatus", [
  "PENDING",
  "RESOLVED",
  "DISMISSED",
]);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetId: uuid("targetId").notNull(),
  module: reportModuleENum("module"),
  reportedBy: uuid("reportedBy"),
  reason: text("reason"),
  description: text("description"),
  status: logStatusEnum("status").default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entityId: uuid("entity_id").notNull(),
});

export const reportsRelation = relations(reports, ({ one }) => ({
  reporter: one(userToEntity, {
    fields: [reports.reportedBy],
    references: [userToEntity.id],
  }),
}));
