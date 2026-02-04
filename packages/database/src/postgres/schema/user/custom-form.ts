import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { addedBy } from "./enum";
import { user } from "./member";
import { surveys } from "./survey";

/**
 * ENUMS
 */

// Matching the Question["type"] union in ts-types.ts
export const questionTypeEnum = pgEnum("question_type", [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "PHONE",
  "WEBSITE",
  "NUMBER",
  "OPINION_SCALE",
  "RATING",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
  "ISOPTION",
  "DATE",
  "TIME",
  "YES_NO",
  "LEGAL",
]);

export const formStatusEnum = pgEnum("form_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const previewTypeEnum = pgEnum("preview_type", [
  "SCROLL_LONG",
  "MULTI_STEP",
]);

export const ratingTypeEnum = pgEnum("rating_type", ["star", "heart", "thumb"]);

/**
 * TABLES
 */

// Main Form / Survey Table
export const customForms = pgTable("custom_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id").notNull(),
  userId: uuid("user_id"),
  addedBy: addedBy("added_by").default("USER"),

  title: varchar("title", { length: 255 }).notNull().default("Untitled Form"),
  description: text("description"),

  // Storage for FormSettings: primaryColor, secondaryColor, borderRadius, fontSize, etc.
  appearance: jsonb("appearance")
    .$type<{
      primaryColor: string;
      secondaryColor: string;
      backgroundColor: string;
      textColor: string;
      buttonColor: string;
      borderRadius: number;
      borderWidth: number;
      borderStyle: string;
      borderColor: string;
      inputBackground: string;
      inputBorderColor: string;
      fontSize: number;
      fontWeight: string;
      boxShadow: string;
      hoverEffect: string;
    }>()
    .notNull(),

  previewType: previewTypeEnum("preview_type").default("MULTI_STEP"),
  status: formStatusEnum("status").default("DRAFT"),
  endDate: timestamp("end_date"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const customFormsRelations = relations(customForms, ({ one, many }) => ({
  user: one(user, {
    fields: [customForms.userId],
    references: [user.id],
  }),
  questions: many(questions),
  surveys: many(surveys),
}));

// Individual Questions Table
export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id")
    .references(() => customForms.id, { onDelete: "cascade" })
    .notNull(),

  type: questionTypeEnum("type").notNull(),
  question: text("question").notNull(),
  description: text("description"),
  order: integer("order").notNull(), // Used for drag-and-drop sequencing
  required: boolean("required").default(false),

  // Configuration fields
  maxLength: integer("max_length"), // For SHORT_TEXT, LONG_TEXT
  min: integer("min"), // For OPINION_SCALE
  max: integer("max"), // For OPINION_SCALE
  scale: integer("scale"), // For RATING (usually 5 or 10)
  ratingType: ratingTypeEnum("rating_type").default("star"),

  // JSONB fields for dynamic data
  options: jsonb("options").$type<string[]>(), // For MULTIPLE_CHOICE, DROPDOWN
  labels: jsonb("labels").$type<{ start: string; end: string }>(), // For OPINION_SCALE

  allowMultiple: boolean("allow_multiple").default(false), // For MULTIPLE_CHOICE

  // Text for LEGAL question type (Terms & Conditions)
  legalText: text("legal_text"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const questionsRelations = relations(questions, ({ one }) => ({
  form: one(customForms, {
    fields: [questions.formId],
    references: [customForms.id],
  }),
}));
