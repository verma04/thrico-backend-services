import { relations, sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  note: text("note").notNull(),
  image: text("image"),
  description: text("description").notNull(),
  entity: uuid("entity_Id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
export const announcementsRelations = relations(
  announcements,
  ({ one, many }) => ({
    entity: one(entity, {
      fields: [announcements.entity],
      references: [entity.id],
    }),
  })
);
