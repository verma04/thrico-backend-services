import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  integer,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";

import { entity } from "../tenant/entity";
import { reportStatusEnum, user } from "../user";

export const contentStatusEnum = pgEnum("content_status", [
  "PENDING",
  "APPROVED",
  "BLOCKED",
  "DELETED",
  "SHADOW_BANNED",
]);

export const moderationDecisionEnum = pgEnum("moderation_decision", [
  "ALLOW",
  "SHADOW_HIDE",
  "WARNING",
  "BLOCK",
  "SUSPEND",
]);

export const userRiskProfiles = pgTable("user_risk_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => user.id)
    .notNull(),
  entityId: uuid("entity_id")
    .references(() => entity.id)
    .notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).default("0.0"), // 0.0 to 1.0 (or 100.0)
  warningCount: integer("warning_count").default(0),
  blockedContentCount: integer("blocked_content_count").default(0),
  lastViolationAt: timestamp("last_violation_at"),
  status: text("status").default("ACTIVE"), // ACTIVE, SUSPENDED, BANNED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const moderationLogs = pgTable("moderation_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").references(() => entity.id),
  contentId: text("content_id").notNull(), // ID of the post/comment/etc
  contentType: text("content_type").notNull(), // POST, COMMENT, USER_PROFILE, etc
  userId: uuid("user_id").references(() => user.id),

  aiScore: decimal("ai_score", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
  aiLabel: text("ai_label"), // toxic, spam, etc
  aiCategories: jsonb("ai_categories"), // Full category breakdown

  decision: moderationDecisionEnum("decision"),
  actionTaken: text("action_taken"), // description of action

  createdAt: timestamp("created_at").defaultNow(),
});

export const severityEnum = pgEnum("severity", ["LOW", "MEDIUM", "HIGH"]);
export const linkTypeEnum = pgEnum("link_type", ["DOMAIN", "URL", "PATTERN"]);

export const bannedWords = pgTable("banned_words", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id")
    .references(() => entity.id)
    .notNull(),
  word: text("word").notNull(),
  severity: severityEnum("severity").default("MEDIUM"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blockedLinks = pgTable("blocked_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id")
    .references(() => entity.id)
    .notNull(),
  url: text("url").notNull(),
  type: linkTypeEnum("link_type").default("DOMAIN"),
  isBlocked: boolean("is_blocked").default(true),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentReports = pgTable("content_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id")
    .references(() => entity.id)
    .notNull(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  reportedById: uuid("reported_by_id")
    .references(() => user.id)
    .notNull(),
  reportedUserId: uuid("reported_user_id")
    .references(() => user.id)
    .notNull(),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").default("PENDING"),
  resolvedById: uuid("resolved_by_id").references(() => user.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const moderationSettings = pgTable("moderation_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id")
    .references(() => entity.id)
    .notNull()
    .unique(),
  autoModerationEnabled: boolean("auto_moderation_enabled").default(true),
  bannedWordsAction: text("banned_words_action").default("FLAG"),
  blockedLinksAction: text("blocked_links_action").default("DELETE"),
  spamDetectionEnabled: boolean("spam_detection_enabled").default(true),
  spamThreshold: integer("spam_threshold").default(50),
  autoFlagThreshold: integer("auto_flag_threshold").default(3),
  autoHideThreshold: integer("auto_hide_threshold").default(5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
