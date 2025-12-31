import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  pgEnum,
  json,
  integer,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";

import { user, userToEntity } from "./member/user";
import { entity } from "../tenant/entity/details";
import {
  addedBy,
  communityEntityStatus,
  logAction,
  reportStatusEnum,
  status,
} from "./enum";
import { geometry } from "./geomtry";

export const conditionEnum = pgEnum("listingConditionEnums", [
  "NEW",
  "USED_LIKE_NEW",
  "USED_LIKE_GOOD",
  "USED_LIKE_FAIR",
]);

export const marketPlace = pgTable("listing0", {
  id: uuid("id").defaultRandom().primaryKey(),
  postedBy: uuid("postedBy_id"),
  addedBy: addedBy("addedBy"),
  entityId: uuid("entity_id").notNull(),
  title: text("title").notNull(),
  currency: text("currency").notNull(),
  price: text("price").notNull(),
  condition: conditionEnum("condition").notNull(),
  status: communityEntityStatus("status").notNull(),
  sku: text("sku"),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  isApproved: boolean("isApproved").notNull().default(false),
  isExpired: boolean("isExpired").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  tag: json("tag"),
  isFeatured: boolean("isFeatured").notNull().default(false),
  numberOfViews: integer("numberOfViews").default(0),
  numberOfContactClick: integer("numberOfContactClick").default(0),
  interests: text("interests").array(),
  categories: text("categories").array(),
  location: jsonb("location").notNull(),
  isSold: boolean("isSold").notNull().default(false),
  locationLatLong: geometry("locationLatLong", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }),
  lat: text("lat"),
  lng: text("lng"),
});

export const marketPlaceRelations = relations(marketPlace, ({ one, many }) => ({
  media: many(marketPlaceMedia),
  entity: one(entity, {
    fields: [marketPlace.entityId],
    references: [entity.id],
  }),
  verification: one(listingVerification),
  postedBy: one(user, {
    fields: [marketPlace.postedBy],
    references: [user.id],
  }),
  contacts: many(listingContact),
  ratings: many(listingRating),
  reports: many(listingReport),
  logs: many(listingLogs),
  conversations: many(listingConversation),
}));

export const listingVerification = pgTable("listingVerification", {
  id: uuid("id").defaultRandom().primaryKey(),
  isVerifiedAt: timestamp("isVerifiedAt"),
  verifiedBy: uuid("verifiedBy"),
  isVerified: boolean("isVerified").default(false),
  verificationReason: text("verificationReason"),
  listingId: uuid("listingId").notNull(),
});

export const listingVerificationRelations = relations(
  listingVerification,
  ({ one }) => ({
    listing: one(marketPlace, {
      fields: [listingVerification.listingId],
      references: [marketPlace.id],
    }),
  })
);

export const marketPlaceMedia = pgTable("marketPlaceMedia", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  marketPlace: uuid("marketPlace_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const marketPlaceMediaRelation = relations(
  marketPlaceMedia,
  ({ one }) => ({
    marketPlace: one(marketPlace, {
      fields: [marketPlaceMedia.marketPlace],
      references: [marketPlace.id],
    }),
  })
);

export const listingLogs = pgTable("listingAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listingId").notNull(),
  status: communityEntityStatus("logStatus"),
  performedBy: uuid("performedBy").notNull(),
  reason: text("reason"),
  previousState: jsonb("previousState"),
  newState: jsonb("newState"),
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  action: logAction("action"),
});

export const listingLogsRelations = relations(listingLogs, ({ one }) => ({
  listing: one(marketPlace, {
    fields: [listingLogs.listingId],
    references: [marketPlace.id],
  }),
  performedBy: one(user, {
    fields: [listingLogs.performedBy],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [listingLogs.entity],
    references: [entity.id],
  }),
}));

// ============================================================================
// Marketplace Messaging Schema
// ============================================================================

export const listingConversation = pgTable("listingConversation", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listingId").notNull(),
  buyerId: uuid("buyerId").notNull(),
  sellerId: uuid("sellerId").notNull(),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const listingConversationRelations = relations(
  listingConversation,
  ({ one, many }) => ({
    listing: one(marketPlace, {
      fields: [listingConversation.listingId],
      references: [marketPlace.id],
    }),
    buyer: one(user, {
      fields: [listingConversation.buyerId],
      references: [user.id],
    }),
    seller: one(user, {
      fields: [listingConversation.sellerId],
      references: [user.id],
    }),
    messages: many(listingMessage),
  })
);

export const listingMessage = pgTable("listingMessage", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversationId").notNull(),
  senderId: uuid("senderId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const listingMessageRelations = relations(listingMessage, ({ one }) => ({
  conversation: one(listingConversation, {
    fields: [listingMessage.conversationId],
    references: [listingConversation.id],
  }),
  sender: one(user, {
    fields: [listingMessage.senderId],
    references: [user.id],
  }),
}));

export const listingContact = pgTable("listingContacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listingId").notNull(),
  contactedBy: uuid("contactedBy").notNull(),
  sellerId: uuid("sellerId").notNull(),
  conversationId: uuid("conversationId").notNull(),
  messageId: uuid("messageId").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listingContactRelations = relations(listingContact, ({ one }) => ({
  listing: one(marketPlace, {
    fields: [listingContact.listingId],
    references: [marketPlace.id],
  }),
  buyer: one(user, {
    fields: [listingContact.contactedBy],
    references: [user.id],
  }),
  seller: one(user, {
    fields: [listingContact.sellerId],
    references: [user.id],
  }),
  conversation: one(listingConversation, {
    fields: [listingContact.conversationId],
    references: [listingConversation.id],
  }),
  message: one(listingMessage, {
    fields: [listingContact.messageId],
    references: [listingMessage.id],
  }),
}));

export const listingRating = pgTable("listingRating", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listingId").notNull(),
  sellerId: uuid("sellerId").notNull(),
  ratedBy: uuid("ratedBy").notNull(),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const listingRatingRelations = relations(listingRating, ({ one }) => ({
  listing: one(marketPlace, {
    fields: [listingRating.listingId],
    references: [marketPlace.id],
  }),
  seller: one(user, {
    fields: [listingRating.sellerId],
    references: [user.id],
  }),
  buyer: one(user, {
    fields: [listingRating.ratedBy],
    references: [user.id],
  }),
}));

export const listingReport = pgTable("listingReport", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listingId").notNull(),
  reportedBy: uuid("reportedBy").notNull(),
  entityId: uuid("entityId").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").notNull().default("PENDING"),
  reviewedBy: uuid("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const listingReportRelations = relations(listingReport, ({ one }) => ({
  listing: one(marketPlace, {
    fields: [listingReport.listingId],
    references: [marketPlace.id],
  }),
  reportedBy: one(user, {
    fields: [listingReport.reportedBy],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [listingReport.entityId],
    references: [entity.id],
  }),
  reviewedBy: one(user, {
    fields: [listingReport.reviewedBy],
    references: [user.id],
  }),
}));
