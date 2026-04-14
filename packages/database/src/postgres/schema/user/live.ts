import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./member";
import { entity } from "../tenant";

export const liveSessions = pgTable("live_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  hostId: uuid("host_id").notNull(),
  title: varchar("title", { length: 255 }),
  coverImage: varchar("cover_image", { length: 512 }),
  viewerCount: integer("viewer_count").default(0),
  isActive: boolean("is_active").default(true),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  serverUrl: varchar("server_url", { length: 512 }),
});

export const liveSessionsRelations = relations(liveSessions, ({ one }) => ({
  host: one(user, {
    fields: [liveSessions.hostId],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [liveSessions.entityId],
    references: [entity.id],
  }),
}));
