import { relations, sql } from "drizzle-orm";

import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user, userToEntity } from "./member/user";
import { entity } from "../tenant";
import { reportStatusEnum } from "./enum";

export const connectionStatusEnum = pgEnum("connectionStatusEnum", [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "BLOCKED",
]);

export const connections = pgTable(
  "userConnections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user1: uuid("user_id").notNull(),
    user2: uuid("user2_id").notNull(),
    entity: uuid("entity_id").notNull(),
    connectionStatusEnum: connectionStatusEnum(
      "connectionStatusEnum"
    ).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      unq: unique().on(table.user1, table.user2, table.entity),
    };
  }
);

export const connectionsRelations = relations(connections, ({ one, many }) => ({
  user1: one(user, {
    relationName: "user_id",
    fields: [connections.user1],
    references: [user.id],
  }),
  user2: one(user, {
    relationName: "user2_id",
    fields: [connections.user2],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [connections.entity],
    references: [entity.id],
  }),
}));

export const connectionsRequest = pgTable(
  "userConnectionsRequests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sender: uuid("sender_id").notNull(),
    receiver: uuid("receiver_id").notNull(),
    entity: uuid("entity_id").notNull(),
    connectionStatusEnum: connectionStatusEnum(
      "connectionStatusEnum"
    ).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      unq: unique().on(table.sender, table.receiver, table.entity),
    };
  }
);

export const connectionRequestRelations = relations(
  connectionsRequest,
  ({ one, many }) => ({
    sender: one(user, {
      fields: [connectionsRequest.sender],
      references: [user.id],
    }),
    receiver: one(user, {
      fields: [connectionsRequest.receiver],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [connectionsRequest.entity],
      references: [entity.id],
    }),
  })
);

export const userReports = pgTable(
  "userReports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id").notNull(),
    reportedUserId: uuid("reported_user_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    reason: text("reason").notNull(),
    description: text("description"),
    status: reportStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      unq: unique().on(table.reporterId, table.reportedUserId, table.entityId),
    };
  }
);

export const userReportsRelations = relations(userReports, ({ one }) => ({
  reporter: one(userToEntity, {
    relationName: "reporter",
    fields: [userReports.reporterId],
    references: [userToEntity.id],
  }),
  reportedUser: one(userToEntity, {
    relationName: "reportedUser",
    fields: [userReports.reportedUserId],
    references: [userToEntity.id],
  }),
  entity: one(entity, {
    fields: [userReports.entityId],
    references: [entity.id],
  }),
}));

export const blockedUsers = pgTable(
  "blockedUsers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerId: uuid("blocker_id").notNull(),
    blockedUserId: uuid("blocked_user_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.blockerId, table.blockedUserId, table.entityId),
    };
  }
);

export const blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  blocker: one(userToEntity, {
    relationName: "blocker",
    fields: [blockedUsers.blockerId],
    references: [userToEntity.id],
  }),
  blockedUser: one(userToEntity, {
    relationName: "blockedUser",
    fields: [blockedUsers.blockedUserId],
    references: [userToEntity.id],
  }),
  entity: one(entity, {
    fields: [blockedUsers.entityId],
    references: [entity.id],
  }),
}));

export const userFollows = pgTable(
  "userFollows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id").notNull(),
    followingId: uuid("following_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.followerId, table.followingId, table.entityId),
    };
  }
);

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(userToEntity, {
    relationName: "follower",
    fields: [userFollows.followerId],
    references: [userToEntity.id],
  }),
  following: one(userToEntity, {
    relationName: "following",
    fields: [userFollows.followingId],
    references: [userToEntity.id],
  }),
  entity: one(entity, {
    fields: [userFollows.entityId],
    references: [entity.id],
  }),
}));
