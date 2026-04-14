import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";

import { user, userToEntity } from "./member/user";
import { mentorShip } from "./mentor";
import { entity } from "../tenant";
import { marketPlace } from "./marketPlace";

export const chatStatusEnum = pgEnum("connectionStatusEnum", [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "BLOCKED",
]);

export const chatTypeEnum = pgEnum("chatTypeEnum", [
  "CONNECTION",
  "MARKETPLACE",
  "MENTORSHIP",
]);

export const messageTypeEnum = pgEnum("messageTypeEnum", [
  "message",
  "marketPlace",
]);

export const chat = pgTable(
  "chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user1: uuid("user_id").notNull(),
    chatStatusEnum: chatStatusEnum("chatStatusEnum")
      .notNull()
      .default("ACCEPTED"),
    chatType: chatTypeEnum("chatType").notNull().default("CONNECTION"),
    user2: uuid("user2_id").notNull(),
    entity: uuid("entity").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      userPairIndex: uniqueIndex("chats_user_pair_idx").on(
        table.user1,
        table.user2,
        table.entity,
      ),
    };
  },
);

export const chatRelations = relations(chat, ({ one, many }) => ({
  user1: one(userToEntity, {
    relationName: "user_id",
    fields: [chat.user1],
    references: [userToEntity.id],
  }),
  user2: one(userToEntity, {
    relationName: "user2_id",
    fields: [chat.user2],
    references: [userToEntity.id],
  }),
  messages: many(messages),
}));

export const conversation = pgTable("conversation", {
  id: uuid("id").defaultRandom().primaryKey(),
  user1Id: uuid("user1Id").notNull(),
  user2Id: uuid("user2Id").notNull(),
  entityId: uuid("entityId").notNull(),
  // When chatType = 'MARKETPLACE', this references the listing that started the chat
  listingId: uuid("listingId"),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const conversationRelations = relations(
  conversation,
  ({ one, many }) => ({
    user1: one(user, {
      fields: [conversation.user1Id],
      references: [user.id],
    }),
    user2: one(user, {
      fields: [conversation.user2Id],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [conversation.entityId],
      references: [entity.id],
    }),
    listing: one(marketPlace, {
      fields: [conversation.listingId],
      references: [marketPlace.id],
    }),
    messages: many(messages),
  }),
);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversationId").notNull(),
  senderId: uuid("senderId").notNull(),
  content: text("content").notNull(),
  entityId: uuid("entityId").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  readAt: timestamp("readAt"),
  moderationStatus: text("moderation_status").default("PENDING"), // PENDING, APPROVED, REJECTED, FLAGGED
  moderationResult: text("moderation_result"),
  moderatedAt: timestamp("moderated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(chat, {
    fields: [messages.conversationId],
    references: [chat.id],
  }),
  sender: one(user, {
    fields: [messages.senderId],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [messages.entityId],
    references: [entity.id],
  }),
}));
