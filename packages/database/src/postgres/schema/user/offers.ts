import { is, relations, sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const offers = pgTable("offers", {
  cover: text("cover"),
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  location: jsonb("location"),
  company: jsonb("company").notNull(),
  timeline: jsonb("timeline"),
  termsAndConditions: text("terms_and_conditions"),
  website: varchar("website", { length: 255 }),
  entityId: uuid("org_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const offersRelations = relations(offers, ({ one, many }) => ({}));
