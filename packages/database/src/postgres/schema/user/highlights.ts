import { relations, sql } from "drizzle-orm";
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";
import { events } from "./events";
import { userStory } from "./alumniStories";
import { userToEntity } from "./member/user";
import { announcements } from "./announcements";

export const highlightsType = pgEnum("highlightsType", [
  "STORIES",
  "ANNOUNCEMENT",
  "EVENTS",
]);
export const highlights = pgTable("highlights", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title"),
  entity: uuid("entity_Id").notNull(),
  userId: uuid("user_Id"),
  highlightsType: highlightsType("highlightsType").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  announcementId: uuid("announcement_id"),
  storyId: uuid("story_id"),
  isExpirable: boolean("isExpirable").notNull(),
  expiry: timestamp("expiry")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
export const highlightsRelations = relations(highlights, ({ one, many }) => ({
  entity: one(entity, {
    fields: [highlights.entity],
    references: [entity.id],
  }),

  user: one(userToEntity, {
    fields: [highlights.userId],
    references: [userToEntity.userId],
  }),
  announcement: one(announcements, {
    fields: [highlights.announcementId],
    references: [announcements.id],
  }),
  story: one(userStory, {
    fields: [highlights.storyId],
    references: [userStory.id],
  }),
}));
