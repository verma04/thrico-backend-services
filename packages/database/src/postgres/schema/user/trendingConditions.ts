import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { entity } from "../tenant";

export const trendingConditionsGroups = pgTable("trendingConditionsGroups", {
  id: uuid("id").defaultRandom().primaryKey(),
  views: boolean("views").default(true),
  discussion: boolean("discussion").default(true),
  user: boolean("user").default(true),
  likes: boolean("likes").default(true),
  entity: uuid("entity_id").notNull(),
  length: integer("length").notNull().default(5),
});

export const trendingConditionsGroupsRelations = relations(
  trendingConditionsGroups,
  ({ one }) => ({
    entity: one(entity, {
      fields: [trendingConditionsGroups.entity],
      references: [entity.id],
    }),
  })
);

export const trendingConditionsJobs = pgTable("trendingConditionsJobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  views: boolean("views").default(true),
  applicant: boolean("applicant").default(true),
  entity: uuid("entity_id").notNull(),
  length: integer("length").notNull().default(5),
});

export const trendingConditionsJobsRelations = relations(
  trendingConditionsJobs,
  ({ one }) => ({
    entity: one(entity, {
      fields: [trendingConditionsJobs.entity],
      references: [entity.id],
    }),
  })
);

export const trendingConditionsListing = pgTable("trendingConditionsListing", {
  id: uuid("id").defaultRandom().primaryKey(),
  views: boolean("views").default(true),
  entity: uuid("entity_id").notNull(),
  length: integer("length").notNull().default(5),
});

export const trendingConditionsListingRelations = relations(
  trendingConditionsListing,
  ({ one }) => ({
    entity: one(entity, {
      fields: [trendingConditionsListing.entity],
      references: [entity.id],
    }),
  })
);

export const trendingConditionsEvents = pgTable("trendingConditionsEvents", {
  id: uuid("id").defaultRandom().primaryKey(),
  views: boolean("views").default(true),
  discussion: boolean("discussion").default(true),
  attendees: boolean("user").default(true),
  entity: uuid("entity_id").notNull(),
  length: integer("length").notNull().default(5),
});

export const trendingConditionsEventsRelations = relations(
  trendingConditionsEvents,
  ({ one }) => ({
    entity: one(entity, {
      fields: [trendingConditionsEvents.entity],
      references: [entity.id],
    }),
  })
);

export const trendingConditionsStories = pgTable("trendingConditionsStories", {
  id: uuid("id").defaultRandom().primaryKey(),
  views: boolean("views").default(true),
  lastAdded: boolean("lastAdded").default(true),
  entity: uuid("entity_id").notNull(),
});

export const trendingConditionsStoriesRelations = relations(
  trendingConditionsStories,
  ({ one }) => ({
    entity: one(entity, {
      fields: [trendingConditionsStories.entity],
      references: [entity.id],
    }),
  })
);
