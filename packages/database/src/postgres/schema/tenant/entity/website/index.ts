// drizzle/schema/menu.ts

import {
  pgTable,
  text,
  uuid,
  timestamp,
  primaryKey,
  varchar,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entity } from "../details";
// Adjust path if needed

export const siteSocialMedia = pgTable("site_social_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  platform: text("platform").notNull(), // e.g. "facebook"
  url: text("url").notNull(),
  entity: uuid("entity_id"),
});

export const entityNavbar = pgTable("entity_navbar", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),
  items: jsonb("items").notNull(),
});

export const entityFooter = pgTable("entity_footer", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),
  footer: jsonb("footer").notNull(),
});

export const siteSocialMediaRelations = relations(
  siteSocialMedia,
  ({ one }) => ({
    entity: one(entity, {
      fields: [siteSocialMedia.entity],
      references: [entity.id],
    }),
  })
);

export const entityNavbarRelations = relations(entityNavbar, ({ one }) => ({
  entity: one(entity, {
    fields: [entityNavbar.entity],
    references: [entity.id],
  }),
}));

export const entityFooterRelations = relations(entityFooter, ({ one }) => ({
  entity: one(entity, {
    fields: [entityFooter.entity],
    references: [entity.id],
  }),
}));
