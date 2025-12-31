import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { domain } from "../domain/domain";
import { currency, users } from "../admin";
import { events, groups, marketPlace, userKyc, userToEntity } from "../../user";
import { websiteType } from "./page";
export const entityCountryEnum = pgEnum("entityCountryEnum", [
  "IND",
  "USA",
  "UAE",
]);
export const entity = pgTable("entity", {
  id: uuid("id").defaultRandom().primaryKey(),
  address: text("address").notNull(),
  entityType: text("entityType").notNull(),
  name: text("name").notNull(),
  timeZone: text("timeZone").notNull(),
  logo: text("logo").notNull(),
  website: text("website").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  userId: uuid("user_id"),
  favicon: text("favicon"),
  color: text("color"),
  currency: uuid("currency_id"),
  country: entityCountryEnum("country").default("IND").notNull(),
});

export const entityRelations = relations(entity, ({ one, many }) => ({
  domain: one(domain),
  razorpay: one(razorpay),
  stripe: one(stripe),
  //   group: many(groups),
  events: many(events),
  entity: many(userToEntity),
  marketPlaceListing: many(marketPlace),

  theme: one(theme),
  userKyc: one(userKyc),
  orgSocialMedia: one(orgSocialMedia),
  groupSettings: one(entitySettings),
  settings: one(entitySettings),
  websiteType: one(websiteType),
  user: one(users, {
    fields: [entity.userId],
    references: [users.id],
  }),
  currency: one(currency, {
    fields: [entity.currency],
    references: [currency.id],
  }),
  customDomain: one(customDomain),
  tag: many(entityTag),
}));

export const theme = pgTable("theme", {
  id: uuid("id").defaultRandom().primaryKey(),
  colorPrimary: text("colorPrimary").notNull().default("#0972cc"),
  borderRadius: text("borderRadius").notNull().default("2"),
  colorBgContainer: text("colorBgContainer").notNull().default("#ffffff"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entityId: uuid("entity_id"),
});

export const themeRelations = relations(theme, ({ one }) => ({
  user: one(entity, {
    fields: [theme.entityId],
    references: [entity.id],
  }),
}));

export const razorpay = pgTable("razorpay", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyID: text("key_id").unique(),
  keySecret: text("key_secret").unique(),
  entity: uuid("entity_id").notNull(),
  isEnabled: boolean("isEnabled").default(false),
});

export const razorpayRelations = relations(razorpay, ({ one }) => ({
  entity: one(entity, {
    fields: [razorpay.entity],
    references: [entity.id],
  }),
}));

export const stripe = pgTable("stripe ", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyID: text("key_id").unique(),
  keySecret: text("key_secret").unique(),
  entity: uuid("entity_id").notNull(),
  isEnabled: boolean("isEnabled").default(false),
});

export const stripeRelations = relations(stripe, ({ one }) => ({
  entity: one(entity, {
    fields: [stripe.entity],
    references: [entity.id],
  }),
}));

export const orgSocialMedia = pgTable("orgSocialMedia", {
  id: uuid("id").defaultRandom().primaryKey(),
  twitter: text("twitter"),
  linkedin: text("linkedin"),
  instagram: text("instagram"),
  youtube: text("youtube"),
  entity: uuid("entity_id"),
});

export const orgSocialMediaRelations = relations(orgSocialMedia, ({ one }) => ({
  entity: one(entity, {
    fields: [orgSocialMedia.entity],
    references: [entity.id],
  }),
}));

export const headerLinks = pgTable("headerLinks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  link: text("link").notNull(),
  entity: uuid("entity_id").notNull(),
  sort: integer("sort").notNull(),
  subMenu: json("subMenu"),
});

export const headerLinksRelations = relations(headerLinks, ({ one }) => ({
  entity: one(entity, {
    fields: [headerLinks.entity],
    references: [entity.id],
  }),
}));

export const customDomain = pgTable("customDomain", {
  id: uuid("id").defaultRandom().primaryKey(),
  domain: text("domain").notNull().unique(),
  dnsConfig: boolean("dnsConfig").notNull().default(false),
  ssl: boolean("ssl").notNull().default(false),
  status: boolean("status").notNull().default(false),
  entity: uuid("entity_id").notNull(),
});

export const customDomainRelations = relations(customDomain, ({ one }) => ({
  entity: one(entity, {
    fields: [customDomain.entity],
    references: [entity.id],
  }),
}));

export const entitySettings = pgTable("entitySettings", {
  // Core
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),

  // User Management
  allowNewUser: boolean("allowNewUser").default(true),
  autoApproveUser: boolean("autoApproveUser").default(true),
  termAndConditionsMembers: jsonb("termAndConditionsMembers"),
  faqMembers: jsonb("faqMembers"),

  // Communities
  allowCommunity: boolean("allowCommunity").default(true),
  autoApproveCommunity: boolean("autoApproveCommunity").default(true),
  autoApproveGroup: boolean("autoApproveGroup").default(true),
  termAndConditionsCommunities: jsonb("termAndConditionsCommunities"),
  faqCommunities: jsonb("faqCommunities"),

  // Forums (Discussion Forums)
  allowDiscussionForum: boolean("allowNewDiscussionForum").default(true),
  autoApproveDiscussionForum: boolean("autoApproveDiscussionForum").default(
    true
  ),
  termAndConditionsForums: jsonb("termAndDiscussionForums"),
  faqForums: jsonb("faqForums"),

  // Events
  allowEvents: boolean("allowEvents").default(true),
  autoApproveEvents: boolean("autoApproveEvents").default(true),
  termAndConditionsEvents: jsonb("termAndConditionsEvents"),
  faqEvents: jsonb("faqEvents"),

  // Jobs & Careers
  allowJobs: boolean("allowJobs").default(true),
  autoApproveJobs: boolean("autoApproveJobs").default(true),
  termAndConditionsJobs: jsonb("termAndConditionsJobs"),
  faqJobs: jsonb("faqJobs"),

  // Mentorship
  allowMentorship: boolean("allowMentorship").default(true),
  autoApproveMentorship: boolean("autoApproveMentorship").default(true),
  termAndConditionsMentorship: jsonb("termAndConditionsMentorship"),
  faqMentorship: jsonb("faqMentorship"),

  // Listing (Marketplace)
  allowListing: boolean("allowListing").default(true),
  autoApproveListing: boolean("autoApproveListing").default(true),
  autoApproveMarketPlace: boolean("autoApproveMarketPlace").default(true),
  termAndConditionsListing: jsonb("termAndConditionsListing"),
  faqListing: jsonb("faqListing"),

  // Shop
  allowShop: boolean("allowShop").default(true),
  autoApproveShop: boolean("autoApproveShop").default(true),
  termAndConditionsShop: jsonb("termAndConditionsShop"),
  faqShop: jsonb("faqShop"),

  // Offers
  allowOffers: boolean("allowOffers").default(true),
  autoApproveOffers: boolean("autoApproveOffers").default(true),
  termAndConditionsOffers: jsonb("termAndConditionsOffers"),
  faqOffers: jsonb("faqOffers"),

  // Surveys
  allowSurveys: boolean("allowSurveys").default(true),
  autoApproveSurveys: boolean("autoApproveSurveys").default(true),
  termAndConditionsSurveys: jsonb("termAndConditionsSurveys"),
  faqSurveys: jsonb("faqSurveys"),

  // Polls
  allowPolls: boolean("allowPolls").default(true),
  autoApprovePolls: boolean("autoApprovePolls").default(true),
  termAndConditionsPolls: jsonb("termAndConditionsPolls"),
  faqPolls: jsonb("faqPolls"),

  // Stories (Content & Engagement)
  allowStories: boolean("allowStories").default(true),
  autoApproveStories: boolean("autoApproveStories").default(true),
  termAndConditionsStories: jsonb("termAndConditionsStories"),
  faqStories: jsonb("faqStories"),

  // Wall of Fame

  termAndConditionsWallOfFame: jsonb("termAndConditionsWallOfFame"),
  faqWallOfFame: jsonb("faqWallOfFame"),

  // Gamification

  termAndConditionsGamification: jsonb("termAndConditionsGamification"),
  faqGamification: jsonb("faqGamification"),
});

export const entitySettingsRelations = relations(entitySettings, ({ one }) => ({
  entity: one(entity, {
    fields: [entitySettings.entity],
    references: [entity.id],
  }),
}));

export const entityTag = pgTable("entityTag", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  entity: uuid("entity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const entityTagRelations = relations(entityTag, ({ one }) => ({
  entity: one(entity, {
    fields: [entityTag.entity],
    references: [entity.id],
  }),
}));

export const entitySettingsUser = pgTable("entitySettingsUserApprovals", {
  id: uuid("id").defaultRandom().primaryKey(),
  autoApprove: boolean("autoApprove").default(false),
  entity: uuid("entity_id").notNull(),
});

export const entitySettingsUsersRelations = relations(
  entitySettingsUser,
  ({ one }) => ({
    entity: one(entity, {
      fields: [entitySettingsUser.entity],
      references: [entity.id],
    }),
  })
);
