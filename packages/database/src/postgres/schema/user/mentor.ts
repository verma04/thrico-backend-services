import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  pgEnum,
  numeric,
  boolean,
  json,
  timestamp,
  date,
  time,
  jsonb,
} from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";
import { userToEntity } from "./member/user";

export const mentorServicesType = pgEnum("mentorServicesType", [
  "1:1 call",
  "webinar",
]);

export const requestStatus = pgEnum("mentorShipRequestStatus", [
  "ACCEPTED",
  "REJECTED",
  "CANCEL",
  "PENDING",
]);
export const mentorStatus = pgEnum("mentorStatus", [
  "APPROVED",
  "BLOCKED",
  "PENDING",
  "REJECTED",
  "REQUESTED",
]);

export const servicesPriceType = pgEnum("servicesPriceType", ["free", "paid"]);

export const mentorShip = pgTable("mentorships", {
  id: uuid("id").defaultRandom().primaryKey(),
  isKyc: boolean("isKyc").notNull().default(false),
  user: uuid("user_id").notNull(),
  entity: uuid("org_id").notNull(),
  mentorStatus: mentorStatus("mentorStatus").notNull().default("REQUESTED"),
  displayName: text("displayName").notNull(),
  isApproved: boolean("isApproved").notNull(),
  slug: text("slug").notNull().unique(),
  intro: text("intro"),
  about: text("about"),
  introVideo: text("introVideo"),
  featuredArticle: text("featuredArticle"),
  whyDoWantBecomeMentor: text("whyDoWantBecomeMentor"),
  greatestAchievement: text("greatestAchievement"),
  availability: json("availability").notNull(),
  agreement: boolean("agreement").notNull(),
  isFeatured: boolean("isFeatured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  category: text("category"),
  skills: jsonb("skills").$type<string[]>(),
});

export const mentorShipRelations = relations(mentorShip, ({ one, many }) => ({
  entity: one(entity, {
    fields: [mentorShip.entity],
    references: [entity.id],
  }),
  user: one(userToEntity, {
    fields: [mentorShip.user],
    references: [userToEntity.id],
  }),

  mentorShipTestimonial: many(mentorShipTestimonials),
  services: many(mentorShipService),
}));

export const mentorShipTestimonials = pgTable("mentorShipTestimonial", {
  id: uuid("id").defaultRandom().primaryKey(),
  testimonial: text("testimonial").notNull(),
  from: text("from").notNull(),
  mentorShip: uuid("mentorship_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const mentorShipTestimonialRelations = relations(
  mentorShipTestimonials,
  ({ one, many }) => ({
    mentorship: one(mentorShip, {
      fields: [mentorShipTestimonials.mentorShip],
      references: [mentorShip.id],
    }),
  }),
);

export const mentorShipBooking = pgTable("mentorBooking", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  razorpay_order_id: text("razorpay_order_id"),
  razorpay_payment_id: text("razorpay_payment_id"),
  razorpay_signature: text("razorpay_signature"),
  user: uuid("user_id").notNull(),
  mentor: uuid("mentor_id").notNull(),
  service: uuid("service_id").notNull(),
  amount: numeric("amount"),
  payment: boolean("payment").notNull(),
  isAccepted: boolean("isAccepted").default(false).notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  isCancel: boolean("isCancel").default(false).notNull(),
  requestStatus: requestStatus("requestStatus"),
  url: text("url"),
  paymentId: uuid("payment_id"),
});

export const mentorShipBookingRelations = relations(
  mentorShipBooking,
  ({ one, many }) => ({
    user: one(userToEntity, {
      fields: [mentorShipBooking.user],
      references: [userToEntity.userId],
    }),
    service: one(mentorShipService, {
      fields: [mentorShipBooking.service],
      references: [mentorShipService.id],
    }),
    mentor: one(mentorShip, {
      fields: [mentorShipBooking.mentor],
      references: [mentorShip.id],
    }),
    payments: one(mentorShip, {
      fields: [mentorShipBooking.mentor],
      references: [mentorShip.id],
    }),
  }),
);

export const mentorShipService = pgTable("mentorShipService", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceType: mentorServicesType("mentorServicesType").notNull(),
  priceType: servicesPriceType("servicesPriceType").notNull(),
  title: text("title").notNull(),
  duration: numeric("duration").notNull(),
  price: numeric("price"),
  shortDescription: text("shortDescription"),
  description: text("description"),
  webinarUrl: text("webinarUrl"),
  mentorShip: uuid("mentorship_id").notNull(),
  webinarDate: text("webinarDate"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const servicesRelations = relations(
  mentorShipService,
  ({ one, many }) => ({
    mentorship: one(mentorShip, {
      fields: [mentorShipService.mentorShip],
      references: [mentorShip.id],
    }),
  }),
);

export const mentorshipCategory = pgTable("mentorshipCategory", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  entity: uuid("org_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const mentorshipCategoryRelations = relations(
  mentorshipCategory,
  ({ one, many }) => ({
    // mentorShip: many(mentorShip),
    entity: one(entity, {
      fields: [mentorshipCategory.entity],
      references: [entity.id],
    }),
  }),
);

export const mentorshipSkills = pgTable("mentorshipSkills", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  entity: uuid("org_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
