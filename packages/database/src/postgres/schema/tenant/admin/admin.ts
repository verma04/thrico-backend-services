import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  uuid,
  timestamp,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { entity } from "../entity/details";

export const users = pgTable("admin", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  otp: one(otp),
  entity: one(entity),
  profileInfo: one(profileInfo),
  posts: many(loginSession),
}));

export const profileInfo = pgTable("profileInfo", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  metadata: jsonb("metadata"),
  designation: text("designation").notNull(),
  phone: text("phone").notNull(),
});

export const profileInfoRelations = relations(profileInfo, ({ one }) => ({
  user: one(users, {
    fields: [profileInfo.userId],
    references: [users.id],
  }),
}));

export const otp = pgTable("otp", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  otp: text("otp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  timeOfExpire: integer("timeOfExpire").default(10),
  isExpired: boolean("isExpired").default(false),
});
export const otpRelations = relations(otp, ({ one }) => ({
  user: one(users, {
    fields: [otp.userId],
    references: [users.id],
  }),
}));

export const loginSession = pgTable("session", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull(),
  ip: text("ip"),
  deviceOs: text("deviceOs"),
  deviceId: uuid("deviceId").defaultRandom(),
  userId: uuid("user_id").notNull(),
  ipAddress: text("ipAddress"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  logout: boolean("logout").default(false),
});

export const loginRelations = relations(loginSession, ({ one }) => ({
  author: one(users, {
    fields: [loginSession.userId],
    references: [users.id],
  }),
}));
