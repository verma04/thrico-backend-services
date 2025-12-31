import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { userToEntity } from "./user";
import { relations } from "drizzle-orm";
import { logStatus, logTypeEnum } from "../enum";

export const userToEntityLog = pgTable("userAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userToEntityId: uuid("userToEntityId").notNull(),
  action: logTypeEnum("actonEnum"),
  status: logStatus("logStatus"), // e.g., "APPROVED", "REQUESTED", "REJECTED"
  performedBy: uuid("performedBy").notNull(), // The admin/moderator or user who triggered the action
  reason: text("reason"), // Optional reason for the change
  previousState: jsonb("previousState"), // Optionally store the previous record state
  newState: jsonb("newState"), // Optionally store the new record state
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
});

export const userToEntityLogRelation = relations(
  userToEntityLog,
  ({ one }) => ({
    userToEntity: one(userToEntity, {
      fields: [userToEntityLog.userToEntityId],
      references: [userToEntity.id],
    }),
  })
);
