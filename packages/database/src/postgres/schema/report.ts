import { relations } from "drizzle-orm";
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
]);

export const logStatusEnum = pgEnum("reportStatus", [
  "PENDING",
  "RESOLVED",
  "DISMISSED",
]);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userToEntityId: uuid("userToEntityId").notNull(),
  action: logStatusEnum("action"),
  module: reportModuleENum("module"), // e.g., "FEED", "MEMBER", "DISCUSSION_FORUM" // e.g., "APPROVED", "REQUESTED", "REJECTED"
  reportedBy: uuid("performedBy"), // The admin/moderator or user who triggered the action
  reason: text("reason"), // Optional reason for the change, // Optionally store the new record state
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
});

export const reportsRelation = relations(reports, ({ one }) => ({
  userToEntity: one(userToEntity, {
    fields: [reports.userToEntityId],
    references: [userToEntity.id],
  }),
}));
