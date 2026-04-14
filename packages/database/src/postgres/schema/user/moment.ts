import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
  integer,
  unique,
  varchar,
  boolean,
  index,
  customType,
  real,
} from "drizzle-orm/pg-core";
import { user } from "./member/user";
import { addedBy } from "./enum";
import { reactionsType } from "./feed";

export const momentStatusEnum = pgEnum("momentStatus", [
  "UPLOADING",
  "PROCESSING",
  "PUBLISHED",
  "FAILED",
]);

export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  fromDriver(value: string) {
    return value
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((v) => parseFloat(v));
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
});

export const moments = pgTable(
  "thrico_moments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    videoUrl: text("video_url").notNull(),
    optimizedVideoUrl: text("optimized_video_url"),
    hlsUrl: text("hls_url"),
    thumbnailUrl: text("thumbnail_url"),
    thumbnailOptions: text("thumbnail_options").array(),
    caption: text("caption").notNull(),
    status: momentStatusEnum("status").default("UPLOADING").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    totalReactions: integer("total_reactions").notNull().default(0),
    totalComments: integer("total_comments").notNull().default(0),
    totalReshares: integer("total_reshares").notNull().default(0),
    totalViews: integer("total_views").notNull().default(0),
    embedding: vector("embedding", { dimensions: 1536 }),
    detectedCategory: text("detected_category"),
    extractedKeywords: text("extracted_keywords").array(),
    sentimentScore: real("sentiment_score"),
    isAiContent: boolean("is_ai_content").default(false),
    addedBy: addedBy("added_by").default("USER"),
  },
  (table) => ({
    embeddingIdx: index("moments_embedding_idx")
      .on(table.embedding)
      .using(sql`ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`),
  }),
);

export const momentReactions = pgTable(
  "moment_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    reactionsType: reactionsType("reactions_type").notNull().default("like"),
    likedBy: addedBy("liked_by").default("USER"),
  },
  (table) => ({
    pk: unique().on(table.userId, table.momentId),
  }),
);

export const momentComments = pgTable("moment_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: varchar("content", { length: 1000 }).notNull(),
  userId: uuid("user_id").notNull(),
  momentId: uuid("moment_id")
    .notNull()
    .references(() => moments.id, { onDelete: "cascade" }),
  addedBy: addedBy("added_by").default("USER"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const momentWishlist = pgTable(
  "moment_wishlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: unique().on(table.userId, table.momentId),
  }),
);

export const momentViews = pgTable(
  "moment_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    totalDuration: integer("total_duration").notNull(),
    watchDurationSeconds: integer("watch_duration_seconds").notNull(),
    completionPercentage: integer("completion_percentage").notNull(),
    completed: boolean("completed").notNull().default(false),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("moment_views_user_id_idx").on(table.userId),
      momentIdIdx: index("moment_views_moment_id_idx").on(table.momentId),
    };
  },
);

export const momentRelations = relations(moments, ({ one, many }) => ({
  user: one(user, {
    fields: [moments.userId],
    references: [user.id],
  }),
  reactions: many(momentReactions),
  comments: many(momentComments),
  wishlist: many(momentWishlist),
  views: many(momentViews),
}));

export const momentWishlistRelations = relations(momentWishlist, ({ one }) => ({
  moment: one(moments, {
    fields: [momentWishlist.momentId],
    references: [moments.id],
  }),
  user: one(user, {
    fields: [momentWishlist.userId],
    references: [user.id],
  }),
}));

export const momentReactionRelations = relations(
  momentReactions,
  ({ one }) => ({
    moment: one(moments, {
      fields: [momentReactions.momentId],
      references: [moments.id],
    }),
    user: one(user, {
      fields: [momentReactions.userId],
      references: [user.id],
    }),
  }),
);

export const momentCommentRelations = relations(momentComments, ({ one }) => ({
  moment: one(moments, {
    fields: [momentComments.momentId],
    references: [moments.id],
  }),
  user: one(user, {
    fields: [momentComments.userId],
    references: [user.id],
  }),
}));

export const momentViewRelations = relations(momentViews, ({ one }) => ({
  moment: one(moments, {
    fields: [momentViews.momentId],
    references: [moments.id],
  }),
  user: one(user, {
    fields: [momentViews.userId],
    references: [user.id],
  }),
}));
