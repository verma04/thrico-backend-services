import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./member";

import { rewards } from "./rewards";

// ─────────────────────────────────────────────────────
// Prize Type Enum
// ─────────────────────────────────────────────────────
export const prizeTypeEnum = pgEnum("prize_type", [
  "TC",
  "VOUCHER",
  "PREMIUM",
  "NOTHING",
]);

// ─────────────────────────────────────────────────────
// Spin Wheel Configuration (per entity)
// ─────────────────────────────────────────────────────
export const spinWheelConfig = pgTable(
  "spin_wheel_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").notNull(),
    costPerSpin: integer("cost_per_spin").notNull().default(20),
    maxSpinsPerDay: integer("max_spins_per_day").notNull().default(3),
    isActive: boolean("is_active").notNull().default(false),
    campaignStartDate: timestamp("campaign_start_date"),
    campaignEndDate: timestamp("campaign_end_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntity: unique().on(table.entityId),
  }),
);

// ─────────────────────────────────────────────────────
// Scratch Card Configuration (per entity)
// ─────────────────────────────────────────────────────
export const scratchCardConfig = pgTable(
  "scratch_card_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").notNull(),
    costPerScratch: integer("cost_per_scratch").notNull().default(15),
    maxScratchesPerDay: integer("max_scratches_per_day").notNull().default(5),
    isActive: boolean("is_active").notNull().default(false),
    campaignStartDate: timestamp("campaign_start_date"),
    campaignEndDate: timestamp("campaign_end_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntity: unique().on(table.entityId),
  }),
);

// ─────────────────────────────────────────────────────
// Spin Wheel Prizes (slots on the wheel)
// ─────────────────────────────────────────────────────
export const spinWheelPrizes = pgTable("spin_wheel_prizes", {
  id: uuid("id").primaryKey().defaultRandom(),
  configId: uuid("config_id")
    .notNull()
    .references(() => spinWheelConfig.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull(),
  rewardId: uuid("reward_id").references(() => rewards.id),
  label: varchar("label", { length: 255 }).notNull(),
  type: prizeTypeEnum("type").notNull(),
  value: integer("value").notNull().default(0), // TC amount, premium days, etc.
  probability: decimal("probability", { precision: 5, scale: 2 })
    .notNull()
    .default("0"), // percentage 0-100
  color: varchar("color", { length: 20 }).default("#4F46E5"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────
// Scratch Card Prizes
// ─────────────────────────────────────────────────────
export const scratchCardPrizes = pgTable("scratch_card_prizes", {
  id: uuid("id").primaryKey().defaultRandom(),
  configId: uuid("config_id")
    .notNull()
    .references(() => scratchCardConfig.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  type: prizeTypeEnum("type").notNull(),
  value: integer("value").notNull().default(0),
  probability: decimal("probability", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────
// Spin Wheel Play Log
// ─────────────────────────────────────────────────────
export const spinWheelPlays = pgTable("spin_wheel_plays", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  entityId: uuid("entity_id").notNull(),
  prizeId: uuid("prize_id").references(() => spinWheelPrizes.id),
  prizeType: prizeTypeEnum("prize_type").notNull(),
  prizeValue: integer("prize_value").notNull().default(0),
  tcSpent: integer("tc_spent").notNull().default(0),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────
// Scratch Card Play Log
// ─────────────────────────────────────────────────────
export const scratchCardPlays = pgTable("scratch_card_plays", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  entityId: uuid("entity_id").notNull(),
  prizeId: uuid("prize_id").references(() => scratchCardPrizes.id),
  prizeType: prizeTypeEnum("prize_type").notNull(),
  prizeValue: integer("prize_value").notNull().default(0),
  tcSpent: integer("tc_spent").notNull().default(0),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────
// Match & Win Configuration
// ─────────────────────────────────────────────────────
export const matchWinConfig = pgTable(
  "match_win_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").notNull(),
    costPerPlay: integer("cost_per_play").notNull().default(25),
    maxPlaysPerDay: integer("max_plays_per_day").notNull().default(3),
    isActive: boolean("is_active").notNull().default(false),
    festivalMode: boolean("festival_mode").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntity: unique().on(table.entityId),
  }),
);

// ─────────────────────────────────────────────────────
// Match & Win Symbols  (e.g. Star, Coin, Gift)
// ─────────────────────────────────────────────────────
export const matchWinSymbols = pgTable(
  "match_win_symbols",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    configId: uuid("config_id")
      .notNull()
      .references(() => matchWinConfig.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull(),
    key: varchar("key", { length: 50 }).notNull(), // e.g. "s1"
    label: varchar("label", { length: 100 }).notNull(), // e.g. "Star"
    icon: varchar("icon", { length: 100 }), // e.g. "star"
    color: varchar("color", { length: 20 }), // e.g. "#FBBF24"
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSymbolKey: unique().on(table.configId, table.key),
  }),
);

// ─────────────────────────────────────────────────────
// Match & Win Combinations  (3-symbol winning combo)
// ─────────────────────────────────────────────────────
export const matchWinCombinations = pgTable(
  "match_win_combinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    configId: uuid("config_id")
      .notNull()
      .references(() => matchWinConfig.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull(),
    key: varchar("key", { length: 50 }).notNull(), // e.g. "c1" or "any"
    // The 3 reel slots — null means "any symbol" (used for the NOTHING fallback)
    symbol1Id: uuid("symbol1_id").references(() => matchWinSymbols.id, {
      onDelete: "set null",
    }),
    symbol2Id: uuid("symbol2_id").references(() => matchWinSymbols.id, {
      onDelete: "set null",
    }),
    symbol3Id: uuid("symbol3_id").references(() => matchWinSymbols.id, {
      onDelete: "set null",
    }),
    type: prizeTypeEnum("type").notNull().default("NOTHING"),
    value: integer("value").notNull().default(0),
    probability: decimal("probability", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    maxWins: integer("max_wins"), // null = unlimited
    rewardId: uuid("reward_id").references(() => rewards.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueComboKey: unique().on(table.configId, table.key),
  }),
);

// ─────────────────────────────────────────────────────
// Match & Win Play Log
// ─────────────────────────────────────────────────────
export const matchWinPlays = pgTable("match_win_plays", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  entityId: uuid("entity_id").notNull(),
  combinationId: uuid("combination_id").references(
    () => matchWinCombinations.id,
    { onDelete: "set null" },
  ),
  prizeType: prizeTypeEnum("prize_type").notNull(),
  prizeValue: integer("prize_value").notNull().default(0),
  tcSpent: integer("tc_spent").notNull().default(0),
  symbolsWon: text("symbols_won"), // Comma-separated symbol labels shown on reels
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────

export const spinWheelConfigRelations = relations(
  spinWheelConfig,
  ({ many }) => ({
    prizes: many(spinWheelPrizes),
  }),
);

export const scratchCardConfigRelations = relations(
  scratchCardConfig,
  ({ many }) => ({
    prizes: many(scratchCardPrizes),
  }),
);

export const matchWinConfigRelations = relations(
  matchWinConfig,
  ({ many }) => ({
    symbols: many(matchWinSymbols),
    combinations: many(matchWinCombinations),
    plays: many(matchWinPlays),
  }),
);

export const matchWinSymbolsRelations = relations(
  matchWinSymbols,
  ({ one }) => ({
    config: one(matchWinConfig, {
      fields: [matchWinSymbols.configId],
      references: [matchWinConfig.id],
    }),
  }),
);

export const matchWinCombinationsRelations = relations(
  matchWinCombinations,
  ({ one }) => ({
    config: one(matchWinConfig, {
      fields: [matchWinCombinations.configId],
      references: [matchWinConfig.id],
    }),
    symbol1: one(matchWinSymbols, {
      fields: [matchWinCombinations.symbol1Id],
      references: [matchWinSymbols.id],
      relationName: "combo_symbol1",
    }),
    symbol2: one(matchWinSymbols, {
      fields: [matchWinCombinations.symbol2Id],
      references: [matchWinSymbols.id],
      relationName: "combo_symbol2",
    }),
    symbol3: one(matchWinSymbols, {
      fields: [matchWinCombinations.symbol3Id],
      references: [matchWinSymbols.id],
      relationName: "combo_symbol3",
    }),
    reward: one(rewards, {
      fields: [matchWinCombinations.rewardId],
      references: [rewards.id],
    }),
  }),
);

export const spinWheelPrizesRelations = relations(
  spinWheelPrizes,
  ({ one }) => ({
    config: one(spinWheelConfig, {
      fields: [spinWheelPrizes.configId],
      references: [spinWheelConfig.id],
    }),
    reward: one(rewards, {
      fields: [spinWheelPrizes.rewardId],
      references: [rewards.id],
    }),
  }),
);

export const scratchCardPrizesRelations = relations(
  scratchCardPrizes,
  ({ one }) => ({
    config: one(scratchCardConfig, {
      fields: [scratchCardPrizes.configId],
      references: [scratchCardConfig.id],
    }),
  }),
);

export const spinWheelPlaysRelations = relations(spinWheelPlays, ({ one }) => ({
  user: one(user, {
    fields: [spinWheelPlays.userId],
    references: [user.id],
  }),
  prize: one(spinWheelPrizes, {
    fields: [spinWheelPlays.prizeId],
    references: [spinWheelPrizes.id],
  }),
}));

export const scratchCardPlaysRelations = relations(
  scratchCardPlays,
  ({ one }) => ({
    user: one(user, {
      fields: [scratchCardPlays.userId],
      references: [user.id],
    }),
    prize: one(scratchCardPrizes, {
      fields: [scratchCardPlays.prizeId],
      references: [scratchCardPrizes.id],
    }),
  }),
);

export const matchWinPlaysRelations = relations(matchWinPlays, ({ one }) => ({
  user: one(user, {
    fields: [matchWinPlays.userId],
    references: [user.id],
  }),
  combination: one(matchWinCombinations, {
    fields: [matchWinPlays.combinationId],
    references: [matchWinCombinations.id],
  }),
}));
