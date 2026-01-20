import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  uuid,
  pgEnum,
  timestamp,
  json,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { feedStatusEnum, groups } from "./communities";
import { user } from "./member/user";
import { entity } from "../tenant/entity/details";
import { jobs } from "./jobs";
import { marketPlace } from "./marketPlace";
import { userStory } from "./alumniStories";
import { check } from "drizzle-orm/mysql-core";
import { addedBy } from "./enum";
import { polls } from "./polls";
import { discussionForum } from "./discussion-forum";
import { offers } from "./offers";
import { celebration } from "./celebration";

// Define the feed priority enum if it doesn't exist in communities
export const userFeedPriorityEnum = pgEnum("userFeedPriority", [
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
]);

export const source = pgEnum("source", [
  "dashboard",
  "group",
  "event",
  "jobs",
  "marketPlace",
  "rePost",
  "story",
  "admin",
  "poll",
  "offer",
  "celebration",
  "forum",
]);

export const userFeedStatusEnum = pgEnum("userFeedStatusEnum", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REMOVED",
  "FLAGGED",
]);

export const posted = pgEnum("feedPostedOn", ["community"]);

export const privacyFeed = pgEnum("feedPrivacy", ["CONNECTIONS", "PUBLIC"]);

export const userFeed = pgTable(
  "userFeed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    priority: userFeedPriorityEnum("priority").notNull().default("NORMAL"),
    status: userFeedStatusEnum("status").notNull().default("PENDING"),
    groupId: uuid("group_id"),
    entity: uuid("org_id").notNull(),

    description: varchar("description", { length: 1000 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    source: source("source").notNull().default("dashboard"),
    eventId: uuid("event_id"),
    pollId: uuid("poll_id"),
    // status: feedStatusEnum("status").notNull().default("APPROVED"),
    offerId: uuid("offer_id"),
    jobId: uuid("jobs_id"),
    forumId: uuid("forum_id"),
    marketPlaceId: uuid("marketPlace_id"),
    celebrationId: uuid("celebration_id"),
    storyId: uuid("story_id"),
    videoUrl: text("video_url"), // Added video URL field
    thumbnailUrl: text("thumbnail_url"), // Added thumbnail URL field
    totalComment: integer("totalComment").notNull().default(0),
    totalReactions: integer("totalReactions").notNull().default(0),
    totalReShare: integer("totalReShare").notNull().default(0),
    privacy: privacyFeed("privacy").default("PUBLIC"),
    repostId: uuid("repost_id"),
    repostedBy: uuid("reposted_by"),
    addedBy: addedBy("addedBy").default("USER"),
    postedOn: posted("postedOn"),
  },
  (table) => ({
    addedByCheck: check(
      "user_id_required_if_added_by_user",
      sql`(${table.addedBy} != 'USER' OR ${table.userId} IS NOT NULL)`
    ),
  })
);

export const feedRelations = relations(userFeed, ({ one, many }) => ({
  reactions: many(feedReactions),
  comment: many(feedComment),
  media: many(media),
  group: one(groups, {
    fields: [userFeed.groupId],
    references: [groups.id],
  }),
  user: one(user, {
    fields: [userFeed.userId],
    references: [user.id],
  }),
  poll: one(polls, {
    fields: [userFeed.pollId],
    references: [polls.id],
  }),
  celebration: one(celebration, {
    fields: [userFeed.celebrationId],
    references: [celebration.id],
  }),
  offer: one(offers, {
    fields: [userFeed.offerId],
    references: [offers.id],
  }),

  entity: one(entity, {
    fields: [userFeed.entity],
    references: [entity.id],
  }),
  forum: one(discussionForum, {
    fields: [userFeed.forumId],
    references: [discussionForum.id],
  }),
  job: one(jobs, {
    fields: [userFeed.jobId],
    references: [jobs.id],
  }),
  marketPlace: one(marketPlace, {
    fields: [userFeed.marketPlaceId],
    references: [marketPlace.id],
  }),
  stories: one(userStory, {
    fields: [userFeed.storyId],
    references: [userStory.id],
  }),
}));

export const reactionsType = pgEnum("reactionsType", [
  "like",
  "celebrate",
  "support",
  "love",
  "insightful",
  "funny",
]);

export const feedReactions = pgTable(
  "reactionsFeed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => userFeed.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    reactionsType: reactionsType("reactionsType").notNull(),
    likedBy: addedBy("likedBy").default("USER"),
  },
  (table) => {
    return {
      pk: unique().on(table.userId, table.feedId),
      addedByCheck: check(
        "user_id_required_if_added_by_user",
        sql`(${table.likedBy} != 'USER' OR ${table.userId} IS NOT NULL)`
      ),
    };
  }
);

export const feedReactionsRelations = relations(
  feedReactions,
  ({ one, many }) => ({
    feed: one(userFeed, {
      fields: [feedReactions.feedId],
      references: [userFeed.id],
    }),
    user: one(user, {
      fields: [feedReactions.userId],
      references: [user.id],
    }),
  })
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    feedId: uuid("feed_id"),
    meta: json("meta"),
    url: text("url").notNull(),
    entity: uuid("org_id").notNull(),
    user: uuid("user_id"),
    groupId: uuid("group_Id"),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at").defaultNow(),
    addedBy: addedBy("addedBy").default("USER"),
  },
  (table) => ({
    addedByCheck: check(
      "user_id_required_if_added_by_user",
      sql`(${table.addedBy} != 'USER' OR ${table.user} IS NOT NULL)`
    ),
  })
);

export const mediaRelations = relations(media, ({ one, many }) => ({
  feed: one(userFeed, {
    fields: [media.feedId],
    references: [userFeed.id],
  }),
  group: one(groups, {
    fields: [media.groupId],
    references: [groups.id],
  }),
  entity: one(entity, {
    fields: [media.entity],
    references: [entity.id],
  }),
  user: one(user, {
    fields: [media.user],
    references: [user.id],
  }),
}));

export const feedComment = pgTable("commentFeed", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: varchar("content", { length: 1000 }).notNull(),
  user: uuid("user_id"),
  feedId: uuid("feed_id")
    .notNull()
    .references(() => userFeed.id, { onDelete: "cascade" }),
  addedBy: addedBy("addedBy").default("USER"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedCommentRelations = relations(feedComment, ({ one, many }) => ({
  user: one(user, {
    fields: [feedComment.user],
    references: [user.id],
  }),
  feed: one(userFeed, {
    fields: [feedComment.feedId],
    references: [userFeed.id],
  }),
}));

export const feedWishList = pgTable(
  "userWishListFeed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    entityId: uuid("entity_id").notNull(),

    feedId: uuid("feed_id")
      .notNull()
      .references(() => userFeed.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: unique().on(table.feedId, table.userId, table.entityId),
    };
  }
);

export const feedWishListRelations = relations(
  feedWishList,
  ({ one, many }) => ({
    feed: one(userFeed, {
      fields: [feedWishList.feedId],
      references: [userFeed.id],
    }),
    user: one(user, {
      fields: [feedWishList.userId],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [feedWishList.entityId],
      references: [entity.id],
    }),
  })
);
