import { relations, sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { platform } from "os";
import { userToEntity } from "./member/user";

export const courseRequest = pgTable("courseRequest", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  fullName: text("fullName").notNull(),
  contactNumber: text("contactNumber").notNull(),
  describes: text("email").notNull(),
  youTubeChannel: text("youTubeChannel"),
  platformDoYouSellCourses: text(" platformDoYouSellCourses"),
  readyCourses: text("readyCourses"),
  averageStudent: text("readyCourses").notNull(),
  user: uuid("user_id").notNull(),
});

export const courseRequestRelations = relations(
  courseRequest,
  ({ one, many }) => ({
    user: one(userToEntity, {
      fields: [courseRequest.user],
      references: [userToEntity.userId],
    }),
  })
);
