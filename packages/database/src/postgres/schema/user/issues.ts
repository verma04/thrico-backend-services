import { relations, sql } from "drizzle-orm";

import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";
import { userToEntity } from "./member/user";
// import { visibilityEnum } from "./events";
import { feedComment } from "./feed";

export const module = pgEnum("module", ["event", "communities", "jobs"]);

export const issues = pgTable("issue", {
  id: uuid("id").defaultRandom().primaryKey(),
  // visibility: visibilityEnum("visibility").notNull(),
title: text("title").notNull(),
  summary: text("summary"),
  page: text("page"),
  details: text("details"),
  module: text("module"),
  feature: text("feature"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entity: uuid("entity_id").notNull(),
  user: uuid("user_id").notNull(),
  ticket: integer("ticket").notNull(),
  type: text("type").notNull(),
  status: boolean("status").notNull().default(false),
});

export const issuesRelations = relations(issues, ({ one, many }) => ({
  entity: one(entity, {
    fields: [issues.entity],
    references: [entity.id],
  }),
  user: one(userToEntity, {
    fields: [issues.user],
    references: [userToEntity.userId],
  }),
  comment: many(issueComment),
}));

export const issueComment = pgTable("issueComment", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  user: uuid("user_id").notNull(),
  issue: uuid("issue_id").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const issueCommentRelations = relations(
  issueComment,
  ({ one, many }) => ({
    user: one(userToEntity, {
      fields: [issueComment.user],
      references: [userToEntity.userId],
    }),
    issue: one(issues, {
      fields: [issueComment.issue],
      references: [issues.id],
    }),
  })
);
