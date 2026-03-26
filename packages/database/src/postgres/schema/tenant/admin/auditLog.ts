import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "../../user/member/user";

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").notNull(), // The ID of the admin who performed the action
  entityId: uuid("entity_id").notNull(), // The entity ID where the action happened
  module: text("module").notNull(), // e.g., "MOMENTS", "USERS", "EVENTS"
  action: text("action").notNull(), // e.g., "CREATE", "UPDATE", "DELETE"
  resourceId: text("resource_id"), // ID of the resource affected
  targetUserId: uuid("target_user_id"), // Optional: ID of the user affected by this action
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(user, {
    fields: [adminAuditLogs.adminId],
    references: [user.id],
    relationName: "performed_by",
  }),
  targetUser: one(user, {
    fields: [adminAuditLogs.targetUserId],
    references: [user.id],
    relationName: "target_user",
  }),
}));
