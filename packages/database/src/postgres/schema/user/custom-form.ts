import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user, userToEntity } from "./member";
import { addedBy, logStatus } from "./enum";

export const customFormStatus = pgEnum("customFormStatus", [
  "APPROVED",
  "DISABLED",
]);

export const customFormResultVisibilityType = pgEnum(
  "customFormResultVisibilityType",
  ["ALWAYS", "AFTER_SUBMIT", "AFTER_END", "ADMIN"]
);

export const customFormPreviewTypeEnum = pgEnum("customFormPreviewTypes", [
  "MULTI_STEP",
  "SCROLL_LONG",
]);

export const customForms = pgTable("customForms", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  isApproved: boolean("isApproved").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  status: customFormStatus("status").notNull().default("APPROVED"),
  title: varchar("title", { length: 255 }).notNull(),
  endDate: timestamp("endDate"),
  description: varchar("description", { length: 255 }).notNull(),
  addedBy: addedBy("addedBy").default("USER"),
  userId: uuid("user_id"),
  previewType: customFormPreviewTypeEnum("previewType")
    .notNull()
    .default("MULTI_STEP"),
  appearance: jsonb("apperenace"), // JSON for custom styles, colors, etc.
  resultVisibility: customFormResultVisibilityType("resultVisibility")
    .notNull()
    .default("ADMIN"),
});

// New table for custom form fields

export const customFormsRelations = relations(customForms, ({ one, many }) => ({
  user: one(user, {
    fields: [customForms.userId],
    references: [user.id],
  }),
  fields: many(customFormFields),
}));

export const customFormFieldTypeEnum = pgEnum("customFormFieldType", [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "PHONE",
  "WEBSITE",
  "NUMBER",
  "OPINION_SCALE",
  "RATING",
  "MULTIPLE_CHOICE",
  "ISOPTION",
  "DROPDOWN",
  "DATE",
  "TIME",
  "YES-NO",
  "LEGAL",
]);

export const customFormFields = pgTable("customFormFields", {
  id: uuid("id").defaultRandom().primaryKey(),
  formId: uuid("form_id").notNull(),
  question: varchar("questions", { length: 255 }).notNull(),
  type: customFormFieldTypeEnum("type").notNull(), // enum type
  order: integer("order").notNull(),
  options: jsonb("options"), // For select/checkbox fields, etc.
  required: boolean("required").notNull().default(false),
  maxLength: integer("maxLength"),
  scale: integer("scale"),
  ratingType: varchar("ratingType", { length: 50 }),
  min: integer("min"),
  max: integer("max"),
  labels: jsonb("labels"), // { start: string; end: string }
  allowMultiple: boolean("allowMultiple").default(false),
  fieldName: varchar("fieldName", { length: 255 }),
  defaultValue: varchar("defaultValue", { length: 255 }),
  allowedTypes: jsonb("allowedTypes"), // string[]
  maxSize: integer("maxSize"),
});

export const customFormFieldsRelations = relations(
  customFormFields,
  ({ one }) => ({
    form: one(customForms, {
      fields: [customFormFields.formId],
      references: [customForms.id],
    }),
  })
);

export const customFormSubmissions = pgTable("customFormSubmissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  formId: uuid("form_id"),
  userId: uuid("user_id"),
  responses: jsonb("responses").notNull(), // Array/object of field responses
  createdAt: timestamp("created_at").defaultNow(),
});

export const customFormSubmissionsRelations = relations(
  customFormSubmissions,
  ({ many }) => ({
    answers: many(customFormAnswers),
  })
);

export const customFormAnswers = pgTable("customFormAnswers", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => customFormSubmissions.id, { onDelete: "cascade" }),
  fieldId: uuid("field_id")
    .notNull()
    .references(() => customFormFields.id, { onDelete: "cascade" }),
  answer: jsonb("answer"), // Stores the specific answer for this field
});

export const customFormAnswersRelations = relations(
  customFormAnswers,
  ({ one }) => ({
    submission: one(customFormSubmissions, {
      fields: [customFormAnswers.submissionId],
      references: [customFormSubmissions.id],
    }),
    field: one(customFormFields, {
      fields: [customFormAnswers.fieldId],
      references: [customFormFields.id],
    }),
  })
);

export const customFormsAuditLogs = pgTable("customFormsAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  formId: uuid("formId").notNull(),
  status: logStatus("logStatus"),
  performedBy: uuid("performedBy").notNull(),
  reason: text("reason"),
  previousState: jsonb("previousState"),
  newState: jsonb("newState"),
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const customFormsLogRelation = relations(
  customFormsAuditLogs,
  ({ one }) => ({
    userToEntity: one(userToEntity, {
      fields: [customFormsAuditLogs.entity],
      references: [userToEntity.id],
    }),
    form: one(customForms, {
      fields: [customFormsAuditLogs.formId],
      references: [customForms.id],
    }),
  })
);
