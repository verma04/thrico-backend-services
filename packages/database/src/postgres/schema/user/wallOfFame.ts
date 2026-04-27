import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";
import { userToEntity } from "./member/user";

export const wallOfFameCategory = pgTable("wall_of_fame_category", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  entityId: uuid("entity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const wallOfFame = pgTable("wall_of_fame", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  entityId: uuid("entity_id").notNull(),
  categoryId: uuid("category_id"),
  title: text("title"), // e.g. "Community Hero"
  achievement: text("achievement"), // Detailed reason/achievement
  year: text("year"), // e.g. "2024"
  order: integer("order").default(0),
  recognitionDate: timestamp("recognition_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const wallOfFameCategoryRelations = relations(
  wallOfFameCategory,
  ({ one, many }) => ({
    entity: one(entity, {
      fields: [wallOfFameCategory.entityId],
      references: [entity.id],
    }),
    entries: many(wallOfFame),
  }),
);

export const wallOfFameRelations = relations(wallOfFame, ({ one }) => ({
  entity: one(entity, {
    fields: [wallOfFame.entityId],
    references: [entity.id],
  }),
  user: one(userToEntity, {
    fields: [wallOfFame.userId],
    references: [userToEntity.id],
  }),
  category: one(wallOfFameCategory, {
    fields: [wallOfFame.categoryId],
    references: [wallOfFameCategory.id],
  }),
}));
