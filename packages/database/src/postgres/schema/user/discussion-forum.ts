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
import { entity } from "../tenant";
import { addedBy, logStatus } from "./enum";
import { userFeed } from "./feed";

export const discussionForumStatus = pgEnum("discussionForumStatus", [
  "APPROVED",
  "PENDING",
  "REJECTED",
  "DISABLED",
]);

export const discussionVoteType = pgEnum("discussionVoteType", [
  "UPVOTE",
  "DOWNVOTE",
]);

export const discussionForum = pgTable("discussionForums", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  isApproved: boolean("isApproved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  status: discussionForumStatus("status").notNull().default("PENDING"),
  isApprovedAt: timestamp("isApprovedAt"),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 350 }),
  content: varchar("content", { length: 1000 }).notNull(),
  approvedBy: uuid("approvedBy"),
  approvedReason: varchar("verificationReason", { length: 500 }),
  upVotes: integer("upVotes").default(0),
  downVotes: integer("downVotes").default(0),
  totalComments: integer("totalComments").default(0),
  category: uuid("category").notNull(),
  isAnonymous: boolean("isAnonymous").default(false),
  addedBy: addedBy("addedBy").default("USER"),
  userId: uuid("user_id"),
});

export const discussionForumRelations = relations(
  discussionForum,
  ({ one, many }) => ({
    discussionForumVotes: many(discussionVotes),
    category: one(discussionCategory, {
      fields: [discussionForum.category],
      references: [discussionCategory.id],
    }),
    feed: one(userFeed),
    verification: one(forumVerification),
    user: one(user, {
      fields: [discussionForum.userId],
      references: [user.id],
    }),
  })
);

export const discussionVotes = pgTable(
  "discussionVotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    discussionForumId: uuid("discussionForum_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    votedBy: addedBy("votedBy").default("USER"),
    type: discussionVoteType("type").notNull(),
  },
  (table) => {
    return {
      pk: unique().on(table.userId, table.discussionForumId),
      addedByCheck: check(
        "user_id_required_if_added_by_user",
        sql`(${table.votedBy} != 'USER' OR ${table.userId} IS NOT NULL)`
      ),
    };
  }
);

export const discussionVotesRelations = relations(
  discussionVotes,
  ({ one, many }) => ({
    feed: one(discussionForum, {
      fields: [discussionVotes.discussionForumId],
      references: [discussionForum.id],
    }),
    user: one(user, {
      fields: [discussionVotes.userId],
      references: [user.id],
    }),
  })
);

export const discussionCategory = pgTable("discussionCategory", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  isActive: boolean("isActive").default(true),
  addedBy: uuid("addedBy").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  entity: uuid("entity_id").notNull(),
  slug: text("slug").notNull(),
});

export const discussionCategoryRelations = relations(
  discussionCategory,
  ({ one, many }) => ({
    entity: one(entity, {
      fields: [discussionCategory.entity],
      references: [entity.id],
    }),
  })
);

export const forumVerification = pgTable("forumVerification", {
  id: uuid("id").defaultRandom().primaryKey(),
  isVerifiedAt: timestamp("isVerifiedAt"),
  verifiedBy: uuid("verifiedBy"),
  isVerified: boolean("isVerified").default(false),
  verificationReason: text("verificationReason"),
  discussionForumId: uuid("discussionForumId").notNull(),
});

export const forumVerificationRelations = relations(
  forumVerification,
  ({ one, many }) => ({
    discussionForum: one(discussionForum, {
      fields: [forumVerification.discussionForumId],
      references: [discussionForum.id],
    }),
  })
);

export const discussionForumComment = pgTable(
  "discussionForumComments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    discussionForumId: uuid("discussionForum_id"),
    content: varchar("content", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    commentedBy: addedBy("commentedBy").default("USER"),
  },
  (table) => {
    return {
      pk: unique().on(table.userId, table.discussionForumId, table.createdAt),
      addedByCheck: check(
        "user_id_required_if_commented_by_user",
        sql`(${table.commentedBy} != 'USER' OR ${table.userId} IS NOT NULL)`
      ),
    };
  }
);

export const discussionForumCommentRelations = relations(
  discussionForumComment,
  ({ one, many }) => ({
    discussionForum: one(discussionForum, {
      fields: [discussionForumComment.discussionForumId],
      references: [discussionForum.id],
    }),
    user: one(user, {
      fields: [discussionForumComment.userId],
      references: [user.id],
    }),
  })
);

export const discussionForumAuditLogs = pgTable("discussionForumAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  discussionForumId: uuid("discussionForumId").notNull(),
  status: logStatus("logStatus"), // e.g., "APPROVED", "REQUESTED", "REJECTED"
  performedBy: uuid("performedBy").notNull(), // The admin/moderator or user who triggered the action
  reason: text("reason"), // Optional reason for the change
  previousState: jsonb("previousState"), // Optionally store the previous record state
  newState: jsonb("newState"), // Optionally store the new record state
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const discussionForumLogRelation = relations(
  discussionForumAuditLogs,
  ({ one }) => ({
    userToEntity: one(userToEntity, {
      fields: [discussionForumAuditLogs.discussionForumId],
      references: [userToEntity.id],
    }),
  })
);
