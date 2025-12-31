import { relations, sql } from "drizzle-orm";

import {
  boolean,
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { entity } from "./details";

export const pagesEnum = pgEnum("pagesEnum", ["WORDPRESS", "HTML"]);

export const websiteType = pgTable(
  "websiteType",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pagesTypes: pagesEnum("pageType").notNull(),
    entity: uuid("entity_id"),
    isReady: boolean("isReady").default(false),
    userName: text("userName"),
    password: text("password"),
    url: text("url"),
  },
  (table) => {
    return {
      addedByCheck: check(
        "url_password_required_if_wordpress",
        sql`(${table.pagesTypes} === "WORDPRESS" OR ${table.url} IS NOT NULL OR ${table.password} IS NOT NULL , ${table.userName} IS NOT NULL)`
      ),
    };
  }
);

export const customPagesRelations = relations(websiteType, ({ one, many }) => ({
  entity: one(entity, {
    fields: [websiteType.entity],
    references: [entity.id],
  }),
  pages: many(staticPages),
}));

export const staticPages = pgTable(
  "staticPages",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    type: uuid("type_id").notNull(),
    content: text("content"),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: varchar("meta_description", { length: 500 }),
    metaKeywords: varchar("meta_keywords", { length: 500 }),
    canonicalUrl: varchar("canonical_url", { length: 500 }),

    ogTitle: varchar("og_title", { length: 255 }),
    ogDescription: varchar("og_description", { length: 500 }),
    ogImage: varchar("og_image", { length: 500 }),

    twitterTitle: varchar("twitter_title", { length: 255 }),
    twitterDescription: varchar("twitter_description", { length: 500 }),
    twitterImage: varchar("twitter_image", { length: 500 }),

    createdAt: timestamp("created_at").defaultNow(),
    isPublished: boolean("isPublished").default(false),
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => ({
    slugTypeIndex: uniqueIndex("static_pages_slug_type_unique").on(
      table.slug,
      table.type
    ),
  })
);

export const page = relations(staticPages, ({ one, many }) => ({
  websiteType: one(websiteType, {
    fields: [staticPages.type],
    references: [websiteType.id],
  }),
}));
