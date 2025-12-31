import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  pgEnum,
  numeric,
  boolean,
  json,
  timestamp,
  date,
  time,
} from "drizzle-orm/pg-core";
import { userToEntity } from "./member/user";
import { entity } from "../tenant/entity/details";

export const campaignTypeEnum = pgEnum("CampaignType", ["specific", "open"]);

export const campaignCategory = pgTable("campaignCategory", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entity: uuid("org_id").notNull(),
});
export const campaignCategoryRelations = relations(
  campaignCategory,
  ({ one, many }) => ({
    campaign: many(campaign),
    entity: one(entity, {
      fields: [campaignCategory.entity],
      references: [entity.id],
    }),
  })
);

export const campaignAmountRecommendation = pgTable(
  "campaignAmountRecommendation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    price: numeric("price").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    entity: uuid("org_id").notNull(),
  }
);
export const campaignAmountRecommendationRelations = relations(
  campaignAmountRecommendation,
  ({ one, many }) => ({
    entity: one(entity, {
      fields: [campaignAmountRecommendation.entity],
      references: [entity.id],
    }),
  })
);

export const campaignGallery = pgTable("fundCampaignGallery", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  campaign: text("campaign_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
export const campaignGalleryRelations = relations(
  campaignGallery,
  ({ one }) => ({
    campaign: one(campaign, {
      fields: [campaignGallery.id],
      references: [campaign.id],
    }),
  })
);
export const campaign = pgTable("fundCampaign", {
  id: uuid("id").defaultRandom().primaryKey(),
  user: uuid("user_id").notNull(),
  category: uuid("category").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  cover: text("cover").notNull(),
  entity: uuid("org_id").notNull(),
  slug: text("slug").notNull().unique(),
  isApproved: boolean("isApproved").notNull(),
  shortDescription: text("shortDescription").notNull(),
  description: text("description").notNull(),
  campaignType: campaignTypeEnum("campaignType").notNull(),
  amount: numeric("amount"),
  endDate: date("endDate").notNull(),
});

export const campaignRelations = relations(campaign, ({ one, many }) => ({
  campaign: many(campaignGallery),

  user: one(userToEntity, {
    fields: [campaign.user],
    references: [userToEntity.userId],
  }),
  category: one(campaignCategory, {
    fields: [campaign.category],
    references: [campaignCategory.id],
  }),
  entity: one(entity, {
    fields: [campaign.entity],
    references: [entity.id],
  }),
}));
