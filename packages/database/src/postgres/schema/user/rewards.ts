import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./member";
import { entityCurrencyConfig } from "./currency";

export const rewards = pgTable("rewards", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  image: text("image"),
  tcCost: integer("tc_cost").default(0).notNull(),
  inventoryRequired: boolean("inventory_required").default(false).notNull(),
  perUserLimit: integer("per_user_limit").default(1).notNull(),
  totalUsageLimit: integer("total_usage_limit").default(0).notNull(), // 0 = unlimited
  minAccountAge: integer("min_account_age").default(0).notNull(),
  minActivityRequired: integer("min_activity_required").default(0).notNull(),
  blockWarnedUsers: boolean("block_warned_users").default(false).notNull(),
  cooldownPeriod: integer("cooldown_period").default(0).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
  entityId: uuid("org_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const vouchers = pgTable("vouchers", {
  id: uuid("id").defaultRandom().primaryKey(),
  rewardId: uuid("reward_id")
    .notNull()
    .references(() => rewards.id),
  code: varchar("code", { length: 255 }).notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  assignedTo: uuid("assigned_to").references(() => user.id),
  assignedAt: timestamp("assigned_at"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  entityId: uuid("org_id").notNull(),
});

export const redemptions = pgTable("redemptions_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  rewardId: uuid("reward_id")
    .notNull()
    .references(() => rewards.id),
  ecUsed: integer("ec_used").notNull().default(0),
  tcUsed: integer("tc_used").notNull().default(0),
  totalCost: integer("total_cost").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("COMPLETED"),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
  entityId: uuid("org_id").notNull(),
});

export const rewardsRelations = relations(rewards, ({ many }) => ({
  vouchers: many(vouchers),
  redemptions: many(redemptions),
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  reward: one(rewards, {
    fields: [vouchers.rewardId],
    references: [rewards.id],
  }),
  user: one(user, {
    fields: [vouchers.assignedTo],
    references: [user.id],
  }),
}));

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  reward: one(rewards, {
    fields: [redemptions.rewardId],
    references: [rewards.id],
  }),
  user: one(user, {
    fields: [redemptions.userId],
    references: [user.id],
  }),
}));
