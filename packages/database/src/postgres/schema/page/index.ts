import { sql } from "drizzle-orm";

import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const page = pgTable("page", {
  id: uuid("id").defaultRandom().primaryKey(),
  user: uuid("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  website: text("headquarters"),
  headquarters: text("headquarters"),
  cover: text("cover"),
  description: text("description").notNull(),
  slug: text("slug"),
  isApproved: boolean("isApproved").notNull().default(false),
  isVerified: boolean("isVerified").notNull().default(false),
  isBlocked: boolean("isBlocked").notNull().default(false),
  phone: text("phone"),
  email: text("email"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  location: jsonb("payload"),
  type: text("type").notNull(),
  industry: text("industry").notNull(),
});
