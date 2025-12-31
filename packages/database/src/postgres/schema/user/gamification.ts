import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entity, users } from "../tenant";
import { user } from "./member";

// Enums
export const triggerTypeEnum = pgEnum("trigger_type", [
  "FIRST_TIME",
  "RECURRING",
]);
export const badgeTypeEnum = pgEnum("badge_type", ["ACTION", "POINTS"]);
export const rankTypeEnum = pgEnum("rank_type", ["POINTS", "BADGES", "HYBRID"]);
export const moduleEnum = pgEnum("points_ddssdmodule", ["FEED", "LISTING"]);

export const userActionEnum = pgEnum("user_action_gamification", [
  "LIKE_FEED",
  "POST_FEED",
  "COMMENT_FEED",
  "SHARE_FEED",
  "POST_LISTING",
  "SHARE_LISTING",
]);
// Point Rules Table
export const pointRules = pgTable(
  "gamification_point_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    module: moduleEnum("module_").notNull(),
    action: userActionEnum("action").notNull(),
    trigger: triggerTypeEnum("trigger").notNull().default("RECURRING"),
    points: integer("points").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    entityId: uuid("entity_id").notNull(),
  },
  (table) => ({
    uniqueRule: unique().on(
      table.module,
      table.action,
      table.trigger,
      table.entityId
    ),
  })
);

// Badges Table
export const badges = pgTable("gamification_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  type: badgeTypeEnum("type").notNull(),
  module: moduleEnum("module"), // nullable for points-based badges
  action: varchar("action", { length: 100 }), // nullable for points-based badges
  targetValue: integer("target_value").notNull(),
  icon: varchar("icon", { length: 10 }),
  description: text("description"),
  condition: text("condition").notNull(), // computed field for display
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  entityId: uuid("entity_id").notNull(),
});

// Ranks Table
export const ranks = pgTable("gamification_ranks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  type: rankTypeEnum("type").notNull(),
  minPoints: integer("min_points"),
  maxPoints: integer("max_points"), // null means unlimited
  minBadges: integer("min_badges"),
  maxBadges: integer("max_badges"), // null means unlimited
  color: varchar("color", { length: 7 }).notNull(), // hex color
  icon: varchar("icon", { length: 10 }),
  order: integer("order").notNull().default(0), // for sorting ranks
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  entityId: uuid("entity_id").notNull(),
});

export const gamificationUser = pgTable(
  "gamificationUser",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    totalPoints: integer("total_points").notNull().default(0),
    currentRankId: uuid("current_rank_id").references(() => ranks.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    user: uuid("user_id").notNull(),
    entityId: uuid("org_id").notNull(),
  },
  (table) => {
    return {
      unq: unique().on(table.id, table.user),
    };
  }
);

export const gamificationUserRelations = relations(
  gamificationUser,
  ({ many, one }) => ({
    pointsHistory: many(userPointsHistory),
    badges: many(userBadges),
    actions: many(userActions),
    rankHistory: many(userRankHistory),
    currentRank: one(ranks, {
      fields: [gamificationUser.currentRankId],
      references: [ranks.id],
    }),
    user: one(user, {
      fields: [gamificationUser.user],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [gamificationUser.entityId],
      references: [entity.id],
    }),
  })
);

// User Points History Table
export const userPointsHistory = pgTable("gamification_user_points_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => gamificationUser.id),
  pointRuleId: uuid("point_rule_id")
    .notNull()
    .references(() => pointRules.id),
  pointsEarned: integer("points_earned").notNull(),
  metadata: jsonb("metadata"), // store additional context like post_id, job_id, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Badges Table (many-to-many relationship)
export const userBadges = pgTable("gamification_user_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => gamificationUser.id),
  badgeId: uuid("badge_id")
    .notNull()
    .references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  progress: integer("progress").notNull().default(0), // current progress towards badge
  isCompleted: boolean("is_completed").notNull().default(false),
});

// User Actions Table (for tracking user activities)
export const userActions = pgTable("gamification_user_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => gamificationUser.id),
  module: moduleEnum("module").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  metadata: jsonb("metadata"), // store additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Rank History Table
export const userRankHistory = pgTable("gamification_user_rank_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => gamificationUser.id),
  fromRankId: uuid("from_rank_id").references(() => ranks.id),
  toRankId: uuid("to_rank_id")
    .notNull()
    .references(() => ranks.id),
  achievedAt: timestamp("achieved_at").defaultNow().notNull(),
});

// Relations
export const pointRulesRelations = relations(pointRules, ({ many, one }) => ({
  userPointsHistory: many(userPointsHistory),
  entity: one(entity, {
    fields: [pointRules.entityId],
    references: [entity.id],
  }),
}));

export const badgesRelations = relations(badges, ({ many, one }) => ({
  userBadges: many(userBadges),
  entity: one(entity, {
    fields: [badges.entityId],
    references: [entity.id],
  }),
}));

export const ranksRelations = relations(ranks, ({ many, one }) => ({
  user: many(gamificationUser),
  fromRankHistory: many(userRankHistory, { relationName: "fromRank" }),
  toRankHistory: many(userRankHistory, { relationName: "toRank" }),
  entity: one(entity, {
    fields: [ranks.entityId],
    references: [entity.id],
  }),
}));

export const userPointsHistoryRelations = relations(
  userPointsHistory,
  ({ one }) => ({
    user: one(gamificationUser, {
      fields: [userPointsHistory.userId],
      references: [gamificationUser.id],
    }),
    pointRule: one(pointRules, {
      fields: [userPointsHistory.pointRuleId],
      references: [pointRules.id],
    }),
  })
);

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(gamificationUser, {
    fields: [userBadges.userId],
    references: [gamificationUser.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const userActionsRelations = relations(userActions, ({ one }) => ({
  user: one(gamificationUser, {
    fields: [userActions.userId],
    references: [gamificationUser.id],
  }),
}));

export const userRankHistoryRelations = relations(
  userRankHistory,
  ({ one }) => ({
    user: one(gamificationUser, {
      fields: [userRankHistory.userId],
      references: [gamificationUser.id],
    }),
    fromRank: one(ranks, {
      fields: [userRankHistory.fromRankId],
      references: [ranks.id],
      relationName: "fromRank",
    }),
    toRank: one(ranks, {
      fields: [userRankHistory.toRankId],
      references: [ranks.id],
      relationName: "toRank",
    }),
  })
);

// Types for TypeScript
export type PointRule = typeof pointRules.$inferSelect;
export type NewPointRule = typeof pointRules.$inferInsert;

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;

export type Rank = typeof ranks.$inferSelect;
export type NewRank = typeof ranks.$inferInsert;

export type User = typeof gamificationUser.$inferSelect;
export type NewUser = typeof gamificationUser.$inferInsert;

export type UserPointsHistory = typeof userPointsHistory.$inferSelect;
export type NewUserPointsHistory = typeof userPointsHistory.$inferInsert;

export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;

export type UserAction = typeof userActions.$inferSelect;
export type NewUserAction = typeof userActions.$inferInsert;

export type UserRankHistory = typeof userRankHistory.$inferSelect;
export type NewUserRankHistory = typeof userRankHistory.$inferInsert;
