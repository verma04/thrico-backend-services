// schema/website.ts
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  boolean,
  integer,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entity } from "./details";

// Website configuration table
export const websites = pgTable("websites", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id")
    .references(() => entity.id)
    .notNull(),
  theme: text("theme").default("academia"), // ThemeType
  font: text("font").default("inter"), // FontType
  isPublished: boolean("is_published").default(false),
  customDomain: text("custom_domain"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const websitesRelations = relations(websites, ({ one, many }) => ({
  entity: one(entity, {
    fields: [websites.entityId],
    references: [entity.id],
  }),
  navbar: one(navbars),
  footer: one(footers),
  pages: many(pages),
}));

// Global navbar configuration
export const navbars = pgTable("navbars", {
  id: uuid("id").primaryKey().defaultRandom(),
  websiteId: uuid("website_id")
    .references(() => websites.id)
    .notNull()
    .unique(),
  layout: text("layout").default("simple"), // LayoutType
  isEnabled: boolean("is_enabled").default(true),
  content: jsonb("content").notNull(), // Store all navbar content as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  name: varchar("name", { length: 255 }).notNull().default("navbar"),
  type: varchar("type", { length: 255 }).notNull().default("navbar"),
});

export const navbarsRelations = relations(navbars, ({ one }) => ({
  website: one(websites, {
    fields: [navbars.websiteId],
    references: [websites.id],
  }),
}));

// Global footer configuration
export const footers = pgTable("footers", {
  id: uuid("id").primaryKey().defaultRandom(),
  websiteId: uuid("website_id")
    .references(() => websites.id)
    .notNull()
    .unique(),
  layout: text("layout").default("columns"), // LayoutType
  isEnabled: boolean("is_enabled").default(true),
  content: jsonb("content").notNull(), // Store all footer content as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  name: varchar("name", { length: 255 }).notNull().default("footer"),
  type: varchar("type", { length: 255 }).notNull().default("footer"),
});

export const footersRelations = relations(footers, ({ one }) => ({
  website: one(websites, {
    fields: [footers.websiteId],
    references: [websites.id],
  }),
}));

// Pages table
export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  websiteId: uuid("website_id")
    .references(() => websites.id)
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  order: integer("order").default(0), // For ordering pages
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pagesRelations = relations(pages, ({ one, many }) => ({
  website: one(websites, {
    fields: [pages.websiteId],
    references: [websites.id],
  }),
  modules: many(modules),
}));

// Modules table (for page content)
export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .references(() => pages.id)
    .notNull(),
  type: text("type").notNull(), // ModuleType
  name: text("name").notNull(),
  layout: text("layout").notNull(), // LayoutType
  isEnabled: boolean("is_enabled").default(true),
  isCustomized: boolean("is_customized").default(false),
  order: integer("order").default(0), // For ordering modules within a page
  content: jsonb("content").notNull(), // Store all module content as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  visibility: text("visibility")
    .$type<"public" | "members" | "admin">()
    .notNull()
    .default("public"),
  includeInSitemap: boolean("includeInSitemap").default(true),
  seo: jsonb("seo"),
});

export const modulesRelations = relations(modules, ({ one }) => ({
  page: one(pages, {
    fields: [modules.pageId],
    references: [pages.id],
  }),
}));
