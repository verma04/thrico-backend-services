import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./admin";
import { entity } from "../entity/details";

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    entityId: uuid("entity_id").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    unq: unique().on(table.name, table.entityId),
  }),
);

export const modulePermissions = pgTable(
  "modulePermissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    module: text("module").notNull(),
    canRead: boolean("can_read").default(false).notNull(),
    canCreate: boolean("can_create").default(false).notNull(),
    canEdit: boolean("can_edit").default(false).notNull(),
    canDelete: boolean("can_delete").default(false).notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    unq: unique().on(table.roleId, table.module),
  }),
);

export const rolesRelations = relations(roles, ({ many, one }) => ({
  permissions: many(modulePermissions),
  users: many(users),
  entity: one(entity, {
    fields: [roles.entityId],
    references: [entity.id],
  }),
}));

export const modulePermissionsRelations = relations(
  modulePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [modulePermissions.roleId],
      references: [roles.id],
    }),
    entity: one(entity, {
      fields: [modulePermissions.entityId],
      references: [entity.id],
    }),
  }),
);
