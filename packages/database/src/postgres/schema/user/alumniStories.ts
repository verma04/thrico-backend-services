import { relations, sql } from "drizzle-orm";
import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";
import { userToEntity } from "./member/user";

export const userStoryCategory = pgTable("userStoryCategory", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entity: uuid("org_id").notNull(),
});
export const userStoryCategoryRelations = relations(
  userStoryCategory,
  ({ one, many }) => ({
    userStory: many(userStory),
    entity: one(entity, {
      fields: [userStoryCategory.entity],
      references: [entity.id],
    }),
  })
);
export const userStory = pgTable("userStory", {
  id: uuid("id").defaultRandom().primaryKey(),
  user: uuid("user_id").notNull(),
  category: uuid("category"),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  cover: text("cover").notNull(),
  entity: uuid("org_id").notNull(),
  slug: text("slug"),
  isApproved: boolean("isApproved").notNull().default(false),
  subTitle: text("subTitle").notNull(),
  description: text("description").notNull(),
});

export const userStoryRelations = relations(userStory, ({ one, many }) => ({
  user: one(userToEntity, {
    fields: [userStory.user],
    references: [userToEntity.userId],
  }),
  category: one(userStoryCategory, {
    fields: [userStory.category],
    references: [userStoryCategory.id],
  }),
  entity: one(entity, {
    fields: [userStory.entity],
    references: [entity.id],
  }),
}));
