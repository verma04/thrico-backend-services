import { relations } from "drizzle-orm";

import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { entity } from "../tenant";

export const entitySettingsGroups = pgTable("entitySettingsGroups", {
  id: uuid("id").defaultRandom().primaryKey(),
  autoApprove: boolean("autoApprove").default(false),
  entity: uuid("entity_id").notNull(),
  termAndCondition: text("termsAndCondition")
    .notNull()
    .default("<p>Terns and conditions</p>"),
  guideLine: text("guideLine").notNull().default("<p>guideLine</p>"),
  isComplted: boolean("isComplted").default(false),
});

export const entityGroupSettingsRelations = relations(
  entitySettingsGroups,
  ({ one }) => ({
    entity: one(entity, {
      fields: [entitySettingsGroups.entity],
      references: [entity.id],
    }),
  })
);

export const entitySettingsJobs = pgTable("entitySettingsJobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  autoApprove: boolean("autoApprove").default(false),
  entity: uuid("entity_id").notNull(),
  isComplted: boolean("isComplted").default(false),
});

export const entitySettingsJobsRelations = relations(
  entitySettingsJobs,
  ({ one }) => ({
    entity: one(entity, {
      fields: [entitySettingsJobs.entity],
      references: [entity.id],
    }),
  })
);
export const entitySettingsListing = pgTable("entitySettingsListing", {
  id: uuid("id").defaultRandom().primaryKey(),
  autoApprove: boolean("autoApprove").default(false),
  entity: uuid("entity_id").notNull(),
  isComplted: boolean("isComplted").default(false),
});

export const entitySettingsListingRelations = relations(
  entitySettingsListing,
  ({ one }) => ({
    entity: one(entity, {
      fields: [entitySettingsListing.entity],
      references: [entity.id],
    }),
  })
);

export const entitySettingsEvents = pgTable(" entitySettingsEvents", {
  id: uuid("id").defaultRandom().primaryKey(),
  autoApprove: boolean("autoApprove").default(false),
  entity: uuid("entity_id").notNull(),
  termAndCondition: text("termsAndCondition")
    .notNull()
    .default("<p>Terns and conditions</p>"),
  guideLine: text("guideLine").notNull().default("<p>guideLine</p>"),
  isComplted: boolean("isComplted").default(false),
});

export const entitySettingsEventsRelations = relations(
  entitySettingsEvents,
  ({ one }) => ({
    entity: one(entity, {
      fields: [entitySettingsEvents.entity],
      references: [entity.id],
    }),
  })
);

export const entityStoriesSettings = pgTable("entityStoriesSettings", {
  id: uuid("id").defaultRandom().primaryKey(),
  autoApprove: boolean("autoApprove").default(false),
  entity: uuid("entity_id").notNull(),
  termAndCondition: text("termsAndCondition")
    .notNull()
    .default("<p>Terns and conditions</p>"),
  guideLine: text("guideLine").notNull().default("<p>guideLine</p>"),
  isComplted: boolean("isComplted").default(false),
});

export const entityStoriesRelations = relations(
  entityStoriesSettings,
  ({ one }) => ({
    entity: one(entity, {
      fields: [entityStoriesSettings.entity],
      references: [entity.id],
    }),
  })
);
