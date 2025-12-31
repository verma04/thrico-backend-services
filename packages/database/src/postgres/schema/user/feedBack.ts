import { relations, sql } from "drizzle-orm";

import {
  boolean,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";
import { user, userToEntity } from "./member/user";

export const feedBackType = pgEnum("feedBackType", ["event", "group", "jobs"]);
export const questionType = pgEnum("questionType", [
  "multipleChoice",
  "shortText",
  // "longText",
  // "yes/no",
  // "email",
  // "fileUpload",
  // "date",
  // "number",
  // "date",
  // "dropdown",
  // "fileUpload",
  // "website",
  // "legal",
  // "contact",
  // "address",
  // "phone",
  // "pictureChoice",
  // "opinionScale",
  // "rating",
]);
export const feedBack = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  feedBackType: feedBackType("feedBackType").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entity: uuid("entity_id").notNull(),
  user: uuid("user_id").notNull(),
});

export const feedBackRelations = relations(feedBack, ({ one, many }) => ({
  entity: one(entity, {
    fields: [feedBack.entity],
    references: [entity.id],
  }),
  user: one(userToEntity, {
    fields: [feedBack.user],
    references: [userToEntity.userId],
  }),
  feedBackQuestion: many(feedBackQuestion),
}));

export const feedBackQuestion = pgTable("feedBackQuestion", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  isRequired: boolean("isRequired").default(false).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  questionType: questionType("questionType").notNull(),
  feedBack: uuid("feedBack_id").notNull(),
});

export const feedBackQuestionRelations = relations(
  feedBackQuestion,
  ({ one, many }) => ({
    feedBack: one(feedBack, {
      fields: [feedBackQuestion.feedBack],
      references: [feedBack.id],
    }),
  })
);
