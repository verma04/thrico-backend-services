import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  boolean,
  json,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./member";
import { entity } from "../tenant";
// Make sure this path is correct

export const stories = pgTable("storiesss", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entityId").notNull(),
  userId: uuid("user_id").notNull(),
  image: varchar("image", { length: 512 }).notNull(),
  caption: varchar("caption", { length: 300 }),
  textOverlays: json("text_overlays").$type<
    Array<{
      id: string;
      text: string;
      color: string;
      fontSize: number;
      x: number;
      y: number;
    }>
  >(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const storiesRelations = relations(stories, ({ one }) => ({
  user: one(user, {
    fields: [stories.userId],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [stories.entity],
    references: [entity.id],
  }),
}));

export const userStories = pgTable("user_storiess", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entityId").notNull(),
  userId: uuid("user_id").notNull(),
  mediaUrl: varchar("media_url", { length: 512 }).notNull(),
  caption: varchar("caption", { length: 300 }),
  textOverlays: json("text_overlays").$type<
    Array<{
      id: string;
      text: string;
      color: string;
      fontSize: number;
      x: number;
      y: number;
    }>
  >(),
  createdAt: timestamp("created_at").notNull(),
  expiredAt: timestamp("expired_at").notNull(),
  deleted: boolean("deleted").notNull().default(false),
});

export const expiredStoriesRelations = relations(userStories, ({ one }) => ({
  user: one(user, {
    fields: [userStories.userId],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [userStories.entity],
    references: [entity.id],
  }),
}));
