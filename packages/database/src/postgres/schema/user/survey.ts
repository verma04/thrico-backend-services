import { relations, sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

import { customForms } from "./custom-form";
import { user } from "./member";

export const surveyStatusEnum = pgEnum("survey_status", [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

// Surveys Table (Instances of a CustomForm)
export const surveys = pgTable("surveys", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id").notNull(),
  formId: uuid("form_id")
    .references(() => customForms.id, { onDelete: "cascade" })
    .notNull(),

  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),

  status: surveyStatusEnum("status").default("DRAFT"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),

  sharedAsFeed: boolean("shared_as_feed").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  form: one(customForms, {
    fields: [surveys.formId],
    references: [customForms.id],
  }),
  responses: many(formResponses),
}));

// Survey Submissions / Responses
export const formResponses = pgTable("form_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id")
    .references(() => customForms.id, { onDelete: "cascade" })
    .notNull(),
  surveyId: uuid("survey_id").references(() => surveys.id, {
    onDelete: "set null",
  }),

  // key-value pair of question_id: user_answer
  answers: jsonb("answers").$type<Record<string, any>>().notNull(),

  // Optional linkage to the user who filled it
  respondentId: uuid("respondent_id"),

  isSubmitted: boolean("is_submitted").default(false),

  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  form: one(customForms, {
    fields: [formResponses.formId],
    references: [customForms.id],
  }),
  survey: one(surveys, {
    fields: [formResponses.surveyId],
    references: [surveys.id],
  }),
  respondent: one(user, {
    fields: [formResponses.respondentId],
    references: [user.id],
  }),
}));
