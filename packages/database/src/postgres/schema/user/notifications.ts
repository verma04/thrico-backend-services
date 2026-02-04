import { relations, sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { userToEntity } from "./member/user";
import { userFeed } from "./feed";

export const notificationType = pgEnum("notificationType", [
  "FEED_COMMENT",
  "FEED_LIKE",
  "NETWORK",
  "COMMUNITIES",
  "LISTING_LIKE",
  "JOB_LIKE",
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "POINTS_EARNED",
  "BADGE_UNLOCKED",
  "RANK_UP",
]);

export const notifications = pgTable("userNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  notificationType: notificationType("notificationType").notNull(),
  user: uuid("user_id").notNull(),
  sender: uuid("sender_id"),
  entity: uuid("entity_id").notNull(),
  content: text("content"),
  feed: uuid("feed_id"),
  connection: uuid("connection_id"),
  communities: uuid("communities_id"),
  isRead: text("is_read").default("false"), // Changed to text for simpler handling or keep as boolean if prefer. User requested isRead.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Listing Like Notification Table
export const listingNotification = pgTable("listingNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  user: uuid("user_id").notNull(),
  listing: uuid("listing_id"),
  notification: uuid("notification_id").notNull(),
});

// Job Like Notification Table
export const jobNotification = pgTable("jobNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  user: uuid("user_id").notNull(),
  job: uuid("job_id").notNull(),
  notification: uuid("notification_id").notNull(),
});

export const notificationsRelations = relations(
  notifications,
  ({ one, many }) => ({
    listingNotifications: many(listingNotification),
    jobNotifications: many(jobNotification),
    user: one(userToEntity, {
      relationName: "user_id",
      fields: [notifications.user],
      references: [userToEntity.id],
    }),
    sender: one(userToEntity, {
      relationName: "sender_id",
      fields: [notifications.sender],
      references: [userToEntity.id],
    }),
    feed: one(userFeed, {
      fields: [notifications.feed],
      references: [userFeed.id],
    }),
  }),
);

export const listingNotificationRelations = relations(
  listingNotification,
  ({ one }) => ({
    user: one(userToEntity, {
      relationName: "user_id",
      fields: [listingNotification.user],
      references: [userToEntity.id],
    }),
    notification: one(notifications, {
      relationName: "notification_id",
      fields: [listingNotification.notification],
      references: [notifications.id],
    }),
    // Add listing relation if you have a listing table
  }),
);

export const jobNotificationRelations = relations(
  jobNotification,
  ({ one }) => ({
    user: one(userToEntity, {
      relationName: "user_id",
      fields: [jobNotification.user],
      references: [userToEntity.id],
    }),
    notification: one(notifications, {
      relationName: "notification_id",
      fields: [jobNotification.notification],
      references: [notifications.id],
    }),
    // Add job relation if you have a job table
  }),
);
