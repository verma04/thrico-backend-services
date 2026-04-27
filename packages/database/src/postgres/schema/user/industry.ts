import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";
import { userToEntity } from "./member/user";

export const industry = pgTable("industry", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  entityId: uuid("entity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const memberToIndustry = pgTable("memberToIndustry", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").notNull(), // points to userToEntity.id
  industryId: uuid("industry_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const industryRelations = relations(industry, ({ one, many }) => ({
  entity: one(entity, {
    fields: [industry.entityId],
    references: [entity.id],
  }),
  members: many(memberToIndustry),
}));

export const memberToIndustryRelations = relations(memberToIndustry, ({ one }) => ({
  member: one(userToEntity, {
    fields: [memberToIndustry.memberId],
    references: [userToEntity.id],
  }),
  industry: one(industry, {
    fields: [memberToIndustry.industryId],
    references: [industry.id],
  }),
}));
