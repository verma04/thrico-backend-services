import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  text,
  timestamp,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entity } from "../tenant";
import { user } from "./member";

// ─────────────────────────────────────────────────────
// Entity Currency Configuration
// Each entity defines normalization + TC opt-in rules
// ─────────────────────────────────────────────────────
export const entityCurrencyConfig = pgTable(
  "entity_currency_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").notNull(),
    currencyName: varchar("currency_name", { length: 100 })
      .notNull()
      .default("Coins"),
    normalizationFactor: integer("normalization_factor").notNull().default(10), // Activity Points ÷ Normalization Factor = EC
    tcConversionRate: decimal("tc_conversion_rate", {
      precision: 10,
      scale: 4,
    })
      .notNull()
      .default("1.0"), // 1 EC = X TC
    tcCoinsAllowed: boolean("tc_coins_allowed").notNull().default(false),
    minTcPercentage: integer("min_tc_percentage").notNull().default(10), // 10-30%
    maxTcPercentage: integer("max_tc_percentage").notNull().default(30), // 10-30%
    minEntityActivityRequired: boolean("min_entity_activity_required")
      .notNull()
      .default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntity: unique().on(table.entityId),
  }),
);

export const entityCurrencyConfigRelations = relations(
  entityCurrencyConfig,
  ({ one }) => ({
    entity: one(entity, {
      fields: [entityCurrencyConfig.entityId],
      references: [entity.id],
    }),
  }),
);

// ─────────────────────────────────────────────────────
// Entity Currency Wallet (per user per entity)
// ─────────────────────────────────────────────────────
export const entityCurrencyWallet = pgTable(
  "entity_currency_wallet",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    balance: decimal("balance", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    totalEarned: decimal("total_earned", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    totalSpent: decimal("total_spent", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    totalConvertedToTc: decimal("total_converted_to_tc", {
      precision: 18,
      scale: 4,
    })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserEntity: unique().on(table.userId, table.entityId),
  }),
);

export const entityCurrencyWalletRelations = relations(
  entityCurrencyWallet,
  ({ one }) => ({
    user: one(user, {
      fields: [entityCurrencyWallet.userId],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [entityCurrencyWallet.entityId],
      references: [entity.id],
    }),
  }),
);

// ─────────────────────────────────────────────────────
// TC Coin Wallet (global per user)
// ─────────────────────────────────────────────────────
export const tcCoinWallet = pgTable(
  "tc_coin_wallet",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    thricoId: uuid("thrico_id").notNull(),
    balance: decimal("balance", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    totalEarned: decimal("total_earned", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    totalSpent: decimal("total_spent", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUser: unique().on(table.thricoId),
  }),
);

export const tcCoinWalletRelations = relations(tcCoinWallet, ({ one }) => ({
  user: one(user, {
    fields: [tcCoinWallet.thricoId],
    references: [user.thricoId],
  }),
}));

// ─────────────────────────────────────────────────────
// Activity Caps (anti-abuse per entity per activity type)
// ─────────────────────────────────────────────────────
export const activityCaps = pgTable(
  "currency_activity_caps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").notNull(),
    activityType: varchar("activity_type", { length: 100 }).notNull(), // LIKE_FEED, COMMENT_FEED, etc.
    dailyCap: integer("daily_cap").notNull().default(0),
    weeklyCap: integer("weekly_cap").notNull().default(0),
    monthlyCap: integer("monthly_cap").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntityActivity: unique().on(table.entityId, table.activityType),
  }),
);

export const activityCapsRelations = relations(activityCaps, ({ one }) => ({
  entity: one(entity, {
    fields: [activityCaps.entityId],
    references: [entity.id],
  }),
}));

// ─────────────────────────────────────────────────────
// TC Conversion Caps (limit how much TC a user can earn)
// ─────────────────────────────────────────────────────
export const tcConversionCaps = pgTable(
  "tc_conversion_caps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").notNull(),
    maxTcPerDay: decimal("max_tc_per_day", { precision: 18, scale: 4 })
      .notNull()
      .default("0"), // 0 = unlimited
    maxTcPerMonth: decimal("max_tc_per_month", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    maxTcPerEntity: decimal("max_tc_per_entity", { precision: 18, scale: 4 })
      .notNull()
      .default("0"), // lifetime cap
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntity: unique().on(table.entityId),
  }),
);

export const tcConversionCapsRelations = relations(
  tcConversionCaps,
  ({ one }) => ({
    entity: one(entity, {
      fields: [tcConversionCaps.entityId],
      references: [entity.id],
    }),
  }),
);

// ─────────────────────────────────────────────────────
// Redemption Caps (limit TC usage per order/month)
// ─────────────────────────────────────────────────────
export const redemptionCaps = pgTable(
  "redemption_caps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").notNull(),
    maxTcPerOrder: decimal("max_tc_per_order", { precision: 18, scale: 4 })
      .notNull()
      .default("0"), // 0 = unlimited
    maxTcPerMonth: decimal("max_tc_per_month", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntity: unique().on(table.entityId),
  }),
);

export const redemptionCapsRelations = relations(redemptionCaps, ({ one }) => ({
  entity: one(entity, {
    fields: [redemptionCaps.entityId],
    references: [entity.id],
  }),
}));

// ─────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────
export type EntityCurrencyConfig = typeof entityCurrencyConfig.$inferSelect;
export type NewEntityCurrencyConfig = typeof entityCurrencyConfig.$inferInsert;

export type EntityCurrencyWallet = typeof entityCurrencyWallet.$inferSelect;
export type NewEntityCurrencyWallet = typeof entityCurrencyWallet.$inferInsert;

export type TCCoinWallet = typeof tcCoinWallet.$inferSelect;
export type NewTCCoinWallet = typeof tcCoinWallet.$inferInsert;

export type ActivityCaps = typeof activityCaps.$inferSelect;
export type NewActivityCaps = typeof activityCaps.$inferInsert;

export type TCConversionCaps = typeof tcConversionCaps.$inferSelect;
export type NewTCConversionCaps = typeof tcConversionCaps.$inferInsert;

export type RedemptionCaps = typeof redemptionCaps.$inferSelect;
export type NewRedemptionCaps = typeof redemptionCaps.$inferInsert;
