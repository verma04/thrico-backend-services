import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { entity } from "../entity/details";

export const domain = pgTable("entityDomain", {
  id: uuid("id").defaultRandom().primaryKey(),
  domain: text("domain").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entity: uuid("entity"),
});

export const domainRelations = relations(domain, ({ one }) => ({
  entity: one(entity, {
    fields: [domain.entity],
    references: [entity.id],
  }),
}));
