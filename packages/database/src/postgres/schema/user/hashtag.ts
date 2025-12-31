import { relations, sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";
import { userToEntity } from "./member/user";
import { userFeed } from "./feed";

export const hashtag = pgTable(
  "hashtag",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    entity: uuid("entity_Id").notNull(),
  },
  (table) => {
    return {
      unq: unique().on(table.entity, table.title),
    };
  }
);
export const hashtagRelations = relations(hashtag, ({ one, many }) => ({
  entity: one(entity, {
    fields: [hashtag.entity],
    references: [entity.id],
  }),
}));

export const hashtagFollowers = pgTable(
  "hashtagFollowers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    hashtagId: uuid("hashtag_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.userId, table.hashtagId),
    };
  }
);

export const hashtagFollowersRelations = relations(
  hashtagFollowers,
  ({ one, many }) => ({
    user: one(userToEntity, {
      fields: [hashtagFollowers.userId],
      references: [userToEntity.id],
    }),
    hashtag: one(hashtag, {
      fields: [hashtagFollowers.hashtagId],
      references: [hashtag.id],
    }),
  })
);

export const hashtagFeed = pgTable(
  "hashtagFeed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    feedId: uuid("feed_id").notNull(),
    hashtagId: uuid("hashtag_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.feedId, table.hashtagId),
    };
  }
);

export const hashtagFeedRelations = relations(hashtagFeed, ({ one, many }) => ({
  feed: one(userFeed, {
    fields: [hashtagFeed.feedId],
    references: [userFeed.id],
  }),
  hashtag: one(hashtag, {
    fields: [hashtagFeed.hashtagId],
    references: [hashtag.id],
  }),
}));
