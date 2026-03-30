import { relations, sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

import { userToEntity } from "./member/user";
import { entity } from "../tenant";

export const contact = pgTable("contact", {
  id: uuid("id").defaultRandom().primaryKey(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("PENDING"), // NEW: PENDING, RESOLVED, IN_PROGRESS
  entityId: uuid("entity_id").notNull(),
  userId: uuid("user_id").notNull(), // This is the userToEntity ID or Auth User ID?
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const contactRelations = relations(contact, ({ one }) => ({
  entity: one(entity, {
    fields: [contact.entityId],
    references: [entity.id],
  }),
  user: one(userToEntity, {
    fields: [contact.userId],
    references: [userToEntity.userId],
  }),
}));
