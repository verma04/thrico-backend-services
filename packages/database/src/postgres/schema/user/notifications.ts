import { relations, sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { userToEntity } from "./member/user";
import { userFeed } from "./feed";
import { groups } from "./communities";

// ========== ENUMS ==========

export const communityNotificationType = pgEnum("communityNotificationType", [
  "COMMUNITY_WELCOME",
  "COMMUNITY_JOIN_REQUEST",
  "COMMUNITY_CREATED",
  "COMMUNITY_MEMBER_JOINED",
  "COMMUNITY_RATING_RECEIVED",
  "COMMUNITY_ROLE_UPDATED",
  "COMMUNITY_JOIN_APPROVED",
  "COMMUNITY_POST_PENDING",
  "COMMUNITY_POST_CREATED",
  "COMMUNITY_POST_APPROVED",
]);

export const feedNotificationType = pgEnum("feedNotificationType", [
  "FEED_COMMENT",
  "FEED_LIKE",
  "FEED_REPOST",
  "POLL_VOTE",
  "CLOSE_FRIEND_STORY",
  "STORY",
  "FEED_POST",
]);

export const networkNotificationType = pgEnum("networkNotificationType", [
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
]);

export const jobNotificationType = pgEnum("jobNotificationType", [
  "JOB_APPLICATION",
  "JOB_POSTED",
  "JOB_LIKE",
]);

export const listingNotificationType = pgEnum("listingNotificationType", [
  "LISTING_APPROVED",
  "LISTING_CONTACT",
  "LISTING_MESSAGE",
  "LISTING_LIKE",
]);

export const gamificationNotificationType = pgEnum(
  "gamificationNotificationType",
  ["POINTS_EARNED", "BADGE_UNLOCKED", "RANK_UP", "LEADERBOARD"],
);

export const notificationModule = pgEnum("notificationModule", [
  "COMMUNITY",
  "FEED",
  "NETWORK",
  "JOB",
  "LISTING",
  "GAMIFICATION",
]);

// ========== TABLES ==========

// Central Notifications Registry
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  module: notificationModule("module").notNull(),
  userId: uuid("user_id").notNull(),
  entityId: uuid("entity_id").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Foreign keys to module-specific tables
  communityNotificationId: uuid("community_notification_id"),
  feedNotificationId: uuid("feed_notification_id"),
  networkNotificationId: uuid("network_notification_id"),
  jobNotificationId: uuid("job_notification_id"),
  listingNotificationId: uuid("listing_notification_id"),
  gamificationNotificationId: uuid("gamification_notification_id"),
});

// Community Notifications
export const communityNotifications = pgTable("communityNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: communityNotificationType("type").notNull(),
  userId: uuid("user_id").notNull(),
  senderId: uuid("sender_id"),
  entityId: uuid("entity_id").notNull(),
  communityId: uuid("community_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Feed Notifications
export const feedNotifications = pgTable("feedNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: feedNotificationType("type").notNull(),
  userId: uuid("user_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  entityId: uuid("entity_id").notNull(),
  feedId: uuid("feed_id"),
  content: text("content").notNull(),
  actors: jsonb("actors").$type<string[]>(),
  count: integer("count").default(1).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Network Notifications
export const networkNotifications = pgTable("networkNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: networkNotificationType("type").notNull(),
  userId: uuid("user_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  entityId: uuid("entity_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Job Notifications
export const jobNotifications = pgTable("jobNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: jobNotificationType("type").notNull(),
  userId: uuid("user_id").notNull(),
  senderId: uuid("sender_id"),
  entityId: uuid("entity_id").notNull(),
  jobId: uuid("job_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Listing Notifications
export const listingNotifications = pgTable("listingNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: listingNotificationType("type").notNull(),
  userId: uuid("user_id").notNull(),
  senderId: uuid("sender_id"),
  entityId: uuid("entity_id").notNull(),
  listingId: uuid("listing_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Gamification Notifications
export const gamificationNotifications = pgTable("gamificationNotifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: gamificationNotificationType("type").notNull(),
  userId: uuid("user_id").notNull(),
  entityId: uuid("entity_id").notNull(),
  content: text("content").notNull(),
  points: integer("points"),
  badgeName: text("badge_name"),
  badgeImageUrl: text("badge_image_url"),
  rankName: text("rank_name"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========== RELATIONS ==========

export const communityNotificationsRelations = relations(
  communityNotifications,
  ({ one }) => ({
    user: one(userToEntity, {
      fields: [communityNotifications.userId],
      references: [userToEntity.id],
    }),
    sender: one(userToEntity, {
      fields: [communityNotifications.senderId],
      references: [userToEntity.id],
    }),
    community: one(groups, {
      fields: [communityNotifications.communityId],
      references: [groups.id],
    }),
  }),
);

export const feedNotificationsRelations = relations(
  feedNotifications,
  ({ one }) => ({
    user: one(userToEntity, {
      fields: [feedNotifications.userId],
      references: [userToEntity.id],
    }),
    sender: one(userToEntity, {
      fields: [feedNotifications.senderId],
      references: [userToEntity.id],
    }),
    feed: one(userFeed, {
      fields: [feedNotifications.feedId],
      references: [userFeed.id],
    }),
  }),
);

export const networkNotificationsRelations = relations(
  networkNotifications,
  ({ one }) => ({
    user: one(userToEntity, {
      fields: [networkNotifications.userId],
      references: [userToEntity.id],
    }),
    sender: one(userToEntity, {
      fields: [networkNotifications.senderId],
      references: [userToEntity.id],
    }),
  }),
);

export const jobNotificationsRelations = relations(
  jobNotifications,
  ({ one }) => ({
    user: one(userToEntity, {
      fields: [jobNotifications.userId],
      references: [userToEntity.id],
    }),
    sender: one(userToEntity, {
      fields: [jobNotifications.senderId],
      references: [userToEntity.id],
    }),
  }),
);

export const listingNotificationsRelations = relations(
  listingNotifications,
  ({ one }) => ({
    user: one(userToEntity, {
      fields: [listingNotifications.userId],
      references: [userToEntity.id],
    }),
    sender: one(userToEntity, {
      fields: [listingNotifications.senderId],
      references: [userToEntity.id],
    }),
  }),
);

export const gamificationNotificationsRelations = relations(
  gamificationNotifications,
  ({ one }) => ({
    user: one(userToEntity, {
      fields: [gamificationNotifications.userId],
      references: [userToEntity.id],
    }),
  }),
);

// Central Notifications Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(userToEntity, {
    fields: [notifications.userId],
    references: [userToEntity.id],
  }),
  communityNotification: one(communityNotifications, {
    fields: [notifications.communityNotificationId],
    references: [communityNotifications.id],
  }),
  feedNotification: one(feedNotifications, {
    fields: [notifications.feedNotificationId],
    references: [feedNotifications.id],
  }),
  networkNotification: one(networkNotifications, {
    fields: [notifications.networkNotificationId],
    references: [networkNotifications.id],
  }),
  jobNotification: one(jobNotifications, {
    fields: [notifications.jobNotificationId],
    references: [jobNotifications.id],
  }),
  listingNotification: one(listingNotifications, {
    fields: [notifications.listingNotificationId],
    references: [listingNotifications.id],
  }),
  gamificationNotification: one(gamificationNotifications, {
    fields: [notifications.gamificationNotificationId],
    references: [gamificationNotifications.id],
  }),
}));
