import { is, relations, sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { addedBy, logStatus } from "./enum";
import { user } from "./member";
import { discussionForumStatus } from "./discussion-forum";

export const offerCategories = pgTable("offer_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  entityId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  image: text("image"),
  discount: text("discount"),
  categoryId: uuid("category_id").references(() => offerCategories.id),
  validityStart: timestamp("validity_start"),
  validityEnd: timestamp("validity_end"),
  status: discussionForumStatus("status").notNull().default("PENDING"),
  isApprovedAt: timestamp("isApprovedAt"),
  addedBy: addedBy("addedBy").default("USER"),
  userId: uuid("user_id").references(() => user.id),
  claimsCount: integer("claims_count").default(0).notNull(),
  viewsCount: integer("views_count").default(0).notNull(),
  sharesCount: integer("shares_count").default(0).notNull(),
  location: jsonb("location"),
  company: jsonb("company"),
  timeline: jsonb("timeline"),
  termsAndConditions: text("terms_and_conditions"),
  website: varchar("website", { length: 255 }),
  entityId: uuid("org_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const offerVerification = pgTable("offerVerification", {
  id: uuid("id").defaultRandom().primaryKey(),
  isVerifiedAt: timestamp("isVerifiedAt"),
  verifiedBy: uuid("verifiedBy").references(() => user.id),
  isVerified: boolean("isVerified").default(false),
  verificationReason: text("verificationReason"),
  offerId: uuid("offer_id")
    .notNull()
    .references(() => offers.id),
});

export const offerAuditLogs = pgTable("offerAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  offerId: uuid("offerId").notNull(),
  status: logStatus("logStatus"),
  performedBy: uuid("performedBy").notNull(),
  reason: text("reason"),
  previousState: jsonb("previousState"),
  newState: jsonb("newState"),
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const offersRelations = relations(offers, ({ one }) => ({
  category: one(offerCategories, {
    fields: [offers.categoryId],
    references: [offerCategories.id],
  }),
  verification: one(offerVerification),
  creator: one(user, {
    fields: [offers.userId],
    references: [user.id],
  }),
}));

export const offerCategoriesRelations = relations(
  offerCategories,
  ({ many }) => ({
    offers: many(offers),
  }),
);

export const offerVerificationRelations = relations(
  offerVerification,
  ({ one }) => ({
    offer: one(offers, {
      fields: [offerVerification.offerId],
      references: [offers.id],
    }),
    verifier: one(user, {
      fields: [offerVerification.verifiedBy],
      references: [user.id],
    }),
  }),
);

export const offerAuditLogRelations = relations(offerAuditLogs, ({ one }) => ({
  offer: one(offers, {
    fields: [offerAuditLogs.offerId],
    references: [offers.id],
  }),
  performedBy: one(user, {
    fields: [offerAuditLogs.performedBy],
    references: [user.id],
  }),
}));
