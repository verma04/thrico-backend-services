import { relations, sql } from "drizzle-orm";
import { pgTable, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { userToEntity } from "./member/user";
import { entity } from "../tenant/entity/details";

export const profileViews = pgTable("profileViews", {
  id: uuid("id").defaultRandom().primaryKey(),
  viewerId: uuid("viewer_id").notNull(),
  viewedId: uuid("viewed_id").notNull(),
  entityId: uuid("entity_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});

export const profileViewsRelations = relations(profileViews, ({ one }) => ({
  viewer: one(userToEntity, {
    fields: [profileViews.viewerId],
    references: [userToEntity.id],
    relationName: "viewer",
  }),
  viewed: one(userToEntity, {
    fields: [profileViews.viewedId],
    references: [userToEntity.id],
    relationName: "viewed",
  }),
  entity: one(entity, {
    fields: [profileViews.entityId],
    references: [entity.id],
  }),
}));
