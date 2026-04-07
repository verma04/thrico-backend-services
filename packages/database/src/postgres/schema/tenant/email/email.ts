import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { entity } from "../entity/details";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const emailDomainStatusEnum = pgEnum("emailDomainStatus", [
  "pending",
  "verified",
  "failed",
]);

export const emailSubscriptionPlanEnum = pgEnum("emailSubscriptionPlan", [
  "free",
  "pro",
  "enterprise",
]);

export const emailSubscriptionStatusEnum = pgEnum("emailSubscriptionStatus", [
  "active",
  "inactive",
  "expired",
]);

// ─────────────────────────────────────────────
// Email Domain (SES-verified custom domain)
// ─────────────────────────────────────────────

export const emailDomain = pgTable("emailDomain", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),
  domain: text("domain").notNull(),

  // SES verification token
  verificationToken: text("verification_token"),

  // DKIM records from SES (stored as comma-separated)
  dkimTokens: text("dkim_tokens"), // JSON array stringified

  // SPF record
  spfRecord: text("spf_record"),

  // Status
  status: emailDomainStatusEnum("status").default("pending").notNull(),

  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const emailDomainRelations = relations(emailDomain, ({ one }) => ({
  entity: one(entity, {
    fields: [emailDomain.entity],
    references: [entity.id],
  }),
}));

// ─────────────────────────────────────────────
// Email Template
// ─────────────────────────────────────────────

export const emailTemplate = pgTable("emailTemplate", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug"),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  json: text("json"), // Raw JSON from visual editor (Unlayer / MJML etc.)
  isActive: boolean("is_active").default(true),
  isDeletable: boolean("is_deletable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const emailTemplateRelations = relations(emailTemplate, ({ one }) => ({
  entity: one(entity, {
    fields: [emailTemplate.entity],
    references: [entity.id],
  }),
}));

// ─────────────────────────────────────────────
// Email Usage (per entity, per month)
// ─────────────────────────────────────────────

export const emailUsage = pgTable("emailUsage", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),
  emailsSent: integer("emails_sent").default(0).notNull(),
  numberOfEmailsPerMonth: integer("number_of_emails_per_month").default(1000).notNull(),
  periodStart: timestamp("period_start").defaultNow().notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const emailUsageRelations = relations(emailUsage, ({ one }) => ({
  entity: one(entity, {
    fields: [emailUsage.entity],
    references: [entity.id],
  }),
}));

// ─────────────────────────────────────────────
// Email Subscription
// ─────────────────────────────────────────────

export const emailSubscription = pgTable("emailSubscription", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),
  plan: emailSubscriptionPlanEnum("plan").default("free").notNull(),
  numberOfEmailsPerMonth: integer("number_of_emails_per_month").default(1000).notNull(),
  status: emailSubscriptionStatusEnum("status").default("active").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const emailSubscriptionRelations = relations(
  emailSubscription,
  ({ one }) => ({
    entity: one(entity, {
      fields: [emailSubscription.entity],
      references: [entity.id],
    }),
  }),
);

// ─────────────────────────────────────────────
// Email Top-up
// ─────────────────────────────────────────────

export const emailTopup = pgTable("emailTopup", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),
  extraEmails: integer("extra_emails").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailTopupRelations = relations(emailTopup, ({ one }) => ({
  entity: one(entity, {
    fields: [emailTopup.entity],
    references: [entity.id],
  }),
}));

// ─────────────────────────────────────────────
// Email Log (every email sent is recorded)
// ─────────────────────────────────────────────

export const emailLog = pgTable("emailLog", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity_id").notNull(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  senderAddress: text("sender_address").notNull(),
  sesMessageId: text("ses_message_id"),
  status: text("status").default("sent"), // sent, bounced, delivered, failed
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailLogRelations = relations(emailLog, ({ one }) => ({
  entity: one(entity, {
    fields: [emailLog.entity],
    references: [entity.id],
  }),
}));
