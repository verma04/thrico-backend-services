import { relations, sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { entity } from "./tenant/entity/details";
import { users } from "./tenant/admin/admin";

export const storageModuleEnum = pgEnum("storageModule", [
  "FEED",
  "MEMBER",
  "DISCUSSION_FORUM",
  "COMMUNITY",
  "JOB",
  "LISTING",
  "MOMENT",
  "OFFER",
  "EVENT",
  "USER",
  "SHOP",
  "SURVEY",
  "MESSAGING",
  "GENERAL",
  "OFFERS",
]);

export type StorageModule = (typeof storageModuleEnum.enumValues)[number];

export const storageFiles = pgTable("storage_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  module: storageModuleEnum("module").notNull(),
  fileKey: text("file_key").notNull(),
  fileUrl: text("file_url"),
  mimeType: text("mime_type"),
  sizeInBytes: integer("size_in_bytes").default(0),
  uploadedBy: uuid("uploaded_by"),
  referenceId: uuid("reference_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const storageFilesRelations = relations(storageFiles, ({ one }) => ({
  entity: one(entity, {
    fields: [storageFiles.entityId],
    references: [entity.id],
  }),
  user: one(users, {
    fields: [storageFiles.uploadedBy],
    references: [users.id],
  }),
}));
