import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user, userToEntity } from "./member";

import { addedBy, logStatus } from "./enum";
import { userFeed } from "./feed";

export const pollsStatus = pgEnum("pollsStatus", ["APPROVED", "DISABLED"]);

export const pollResultVisibilityType = pgEnum("pollResultVisibilityType", [
  "ALWAYS",
  "AFTER_VOTE",
  "AFTER_END",
  "ADMIN",
]);

export const polls = pgTable("polls", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  isApproved: boolean("isApproved").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  status: pollsStatus("status").notNull().default("APPROVED"),
  resultVisibility: pollResultVisibilityType("resultVisibility").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  endDate: timestamp("endDate"),
  question: varchar("question", { length: 255 }).notNull(),
  addedBy: addedBy("addedBy").default("USER"),
  userId: uuid("user_id"),
  totalVotes: integer("totalVotes").notNull().default(0),
});

// New table for poll options

export const pollsRelations = relations(polls, ({ one, many }) => ({
  user: one(user, {
    fields: [polls.userId],
    references: [user.id],
  }),
  feed: one(userFeed),
  // results: one(pollResults),
  options: many(pollOptions),
  results: many(pollResults),
}));

export const pollOptions = pgTable("pollOptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pollId: uuid("poll_id").notNull(),
  text: varchar("text", { length: 255 }).notNull(),
  order: integer("order").notNull(),
  votes: integer("votes").notNull().default(0),
});

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  results: many(pollResults),
}));

export const pollResults = pgTable("pollResults", {
  id: uuid("id").defaultRandom().primaryKey(),
  pollOptionId: uuid("pollOptions_id").notNull(),
  pollId: uuid("poll_id").notNull(),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  votedBy: addedBy("voted").default("USER"),
});

export const pollResultsRelations = relations(pollResults, ({ one, many }) => ({
  pollOptions: one(pollOptions, {
    fields: [pollResults.pollOptionId],
    references: [pollOptions.id],
  }),
  poll: one(polls, {
    fields: [pollResults.pollId],
    references: [polls.id],
  }),
  user: one(user, {
    fields: [pollResults.userId],
    references: [user.id],
  }),
}));

export const pollsAuditLogs = pgTable("pollsAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  pollsId: uuid("pollsId").notNull(),
  status: logStatus("logStatus"), // e.g., "APPROVED", "REQUESTED", "REJECTED"
  performedBy: uuid("performedBy").notNull(), // The admin/moderator or user who triggered the action
  reason: text("reason"), // Optional reason for the change
  previousState: jsonb("previousState"), // Optionally store the previous record state
  newState: jsonb("newState"), // Optionally store the new record state
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const pollsLogRelation = relations(pollsAuditLogs, ({ one }) => ({
  userToEntity: one(userToEntity, {
    fields: [pollsAuditLogs.entity],
    references: [userToEntity.id],
  }),
  poll: one(polls, {
    fields: [pollsAuditLogs.pollsId],
    references: [polls.id],
  }),
}));
