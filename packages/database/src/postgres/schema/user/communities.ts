import {
  pgTable,
  text,
  integer,
  boolean,
  primaryKey,
  uuid,
  pgEnum,
  timestamp,
  json,
  unique,
  numeric,
  bigint,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { entity } from "../tenant/entity/details";

import { events } from "./events";
import {
  addedBy,
  communityEntityStatus,
  communityEnum,
  joiningConditionEnum,
  logAction,
  logStatus,
  privacyEnum,
  reportStatusEnum,
} from "./enum";
import { user } from "./member";
import { userFeed } from "./feed";

export const memberStatusEnum = pgEnum("memberStatusEnum", [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "BLOCKED",
]);

export const managerRole = pgEnum("managerRole", [
  "ADMIN",
  "MANAGER",
  "USER",
  "NOT_MEMBER",
]);
export const userAddedForm = pgEnum("userAddedForm", ["invite", "direct"]);

export const groupTheme = pgTable("communityTheme", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entity: uuid("org_id").notNull(),
});

export const groupThemeRelations = relations(groupTheme, ({ one, many }) => ({
  groups: many(groups),
  entity: one(entity, {
    fields: [groupTheme.entity],
    references: [entity.id],
  }),
}));
export const groupInterests = pgTable("communityInterests", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entity: uuid("org_id").notNull(),
});

export const groupInterestsRelations = relations(
  groupInterests,
  ({ one, many }) => ({
    entity: one(entity, {
      fields: [groupInterests.entity],
      references: [entity.id],
    }),
  })
);

export const groups = pgTable("-community", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").unique().notNull(),
  title: varchar("title", { length: 61 }),
  tagline: varchar("tagline", { length: 100 }),
  creator: uuid("creator_id"),
  addedBy: addedBy("addedBy"),
  entity: uuid("org_id").notNull(),
  cover: text("cover").default("/groups-default-cover-photo.jpg"),
  status: communityEntityStatus("status").notNull(),
  isApproved: boolean("isApproved").notNull().default(false),
  description: varchar("description", { length: 300 }).default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  isFeatured: boolean("isFeatured").notNull().default(false),
  theme: uuid("theme"),
  interests: text("interests").array(),
  categories: text("categories").array(),
  numberOfUser: integer("numberOfUser").default(0),
  numberOfLikes: integer("numberOfLikes").default(0),
  numberOfPost: integer("numberOfPost").default(0),
  numberOfViews: integer("numberOfViews").default(0),
  tag: text("tag").array(),
  communityType: communityEnum("communityType").notNull().default("VIRTUAL"),
  joiningTerms: joiningConditionEnum("joiningTerms").default("ANYONE_CAN_JOIN"),
  privacy: privacyEnum("privacy").default("PUBLIC"),
  location: jsonb("location"),
  requireAdminApprovalForPosts: boolean("requireAdminApprovalForPosts")
    .notNull()
    .default(false),
  allowMemberInvites: boolean("allowMemberInvites").notNull().default(true),
  allowMemberPosts: boolean("allowMemberPosts").notNull().default(true),
  enableEvents: boolean("enableEvents").notNull().default(true),
  enableRatingsAndReviews: boolean("enableRatingsAndReviews")
    .notNull()
    .default(false),
  // Add the 'rules' field to store group rules if defined
  rules: jsonb("rules"),
  // Rating fields
  overallRating: numeric("overallRating", { precision: 3, scale: 2 }).default(
    "0.00"
  ),
  totalRatings: integer("totalRatings").default(0),
  verifiedRating: numeric("verifiedRating", { precision: 3, scale: 2 }).default(
    "0.00"
  ),
  totalVerifiedRatings: integer("totalVerifiedRatings").default(0),
  // Flagged fields
  isFlagged: boolean("isFlagged").notNull().default(false),
  flaggedAt: timestamp("flaggedAt"),
  flaggedBy: uuid("flaggedBy"),
  flagReason: text("flagReason"),
  // Suspension fields
  isSuspended: boolean("isSuspended").notNull().default(false),
  suspendedAt: timestamp("suspendedAt"),
  suspendedBy: uuid("suspendedBy"),
  suspensionReason: text("suspensionReason"),
  // Archived fields
  isArchived: boolean("isArchived").notNull().default(false),
  archivedAt: timestamp("archivedAt"),
  archivedBy: uuid("archivedBy"),
  archivedReason: text("archivedReason"),
});

export const groupRelations = relations(groups, ({ one, many }) => ({
  member: many(groupMember),
  events: many(events),
  invitation: many(groupInvitation),
  request: many(groupRequest),
  creator: one(user, {
    fields: [groups.creator],
    references: [user.id],
  }),

  theme: one(groupTheme, {
    fields: [groups.theme],
    references: [groupTheme.id],
  }),

  views: many(groupView),
  verification: one(communityVerification),
  ratings: many(groupRating),
  ratingSummary: one(groupRatingSummary),
  media: many(groupMedia),
  wishlistedBy: many(communityWishlist),
  feeds: many(communityFeed),
  reports: many(communityReport),
}));

export const communityVerification = pgTable("communityVerification", {
  id: uuid("id").defaultRandom().primaryKey(),
  isVerifiedAt: timestamp("isVerifiedAt"),
  verifiedBy: uuid("verifiedBy"),
  isVerified: boolean("isVerified").default(false),
  verificationReason: text("verificationReason"),
  community: uuid("communityIdd").notNull(),
});

export const communityVerificationRelations = relations(
  communityVerification,
  ({ one, many }) => ({
    community: one(groups, {
      fields: [communityVerification.community],
      references: [groups.id],
    }),
  })
);

export const groupView = pgTable("communityViews", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  group: uuid("community_id").notNull(),
});

export const groupViewRelations = relations(groupView, ({ one, many }) => ({
  group: one(groups, {
    fields: [groupView.group],
    references: [groups.id],
  }),
}));

export const communitySettings = pgTable("communitySettings", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("community_id").notNull(),
});

export const communitySettingsRelations = relations(
  communitySettings,
  ({ one }) => ({
    user: one(groups, {
      fields: [communitySettings.groupId],
      references: [groups.id],
    }),
  })
);

export const groupInvitation = pgTable(
  "communityInvitation",
  {
    userId: uuid("user_id").notNull(),
    groupId: uuid("community_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    isAccepted: boolean("isAccepted").default(false),
    actionTime: timestamp("actionTime"),
  }
  // (table) => {
  //   return {
  //     pk: primaryKey({ columns: [table.userId, table.groupId] }),
  //     userToEntity: primaryKey({
  //       name: "userentity",
  //       columns: [table.userId, table.groupId],
  //     }),
  //   };
  // }
);

export const invitationRelations = relations(
  groupInvitation,
  ({ one, many }) => ({
    groupId: one(groups, {
      fields: [groupInvitation.groupId],
      references: [groups.id],
    }),
    userId: one(user, {
      fields: [groupInvitation.userId],
      references: [user.id],
    }),
  })
);

export const groupMember = pgTable(
  "communityMember",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    groupId: uuid("community_id").notNull(),
    role: managerRole("managerRole").default("USER"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    userAddedForm: userAddedForm("userAddedForm"),
    memberStatusEnum: memberStatusEnum("memberStatusEnum")
      .notNull()
      .default("PENDING"),
    notes: text("notes"),
  },
  (table) => {
    return {
      pk: unique().on(table.userId, table.groupId),
    };
  }
);

export const groupMemberRelations = relations(groupMember, ({ one, many }) => ({
  groupId: one(groups, {
    fields: [groupMember.groupId],
    references: [groups.id],
  }),
  feed: many(communityFeed),

  user: one(user, {
    fields: [groupMember.userId],
    references: [user.id],
  }),
}));

export const groupToUserRelations = relations(groupMember, ({ one, many }) => ({
  groupId: one(groups, {
    fields: [groupMember.groupId],
    references: [groups.id],
  }),
  user: one(user, {
    fields: [groupMember.userId],
    references: [user.id],
  }),
}));
export const groupRequest = pgTable(
  "communityMemberRequest",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    groupId: uuid("community_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    isAccepted: boolean("isAccepted").default(false),
    memberStatusEnum: memberStatusEnum("memberStatusEnum")
      .notNull()
      .default("PENDING"),
    notes: text("notes"),
  },
  (table) => {
    return {
      pk: unique().on(table.userId, table.groupId),
    };
  }
);

export const groupRequestRelations = relations(
  groupRequest,
  ({ one, many }) => ({
    groupId: one(groups, {
      fields: [groupRequest.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [groupRequest.userId],
      references: [user.id],
    }),
  })
);

export const groupViews = pgTable("communityViews", {
  id: uuid("id").defaultRandom().primaryKey(),
  group: uuid("community_id").notNull(),
  user: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupViewsRelations = relations(groupViews, ({ one }) => ({
  group: one(groups, {
    fields: [groupViews.group],
    references: [groups.id],
  }),
  user: one(user, {
    fields: [groupViews.user],
    references: [user.id],
  }),
}));

export const communityLogs = pgTable("communityAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("communityId").notNull(),
  status: communityEntityStatus("logStatus"), // e.g., "APPROVED", "REQUESTED", "REJECTED"
  performedBy: uuid("performedBy").notNull(), // The admin/moderator or user who triggered the action
  reason: text("reason"), // Optional reason for the change
  previousState: jsonb("previousState"), // Optionally store the previous record state
  newState: jsonb("newState"), // Optionally store the new record state
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  action: logAction("action"),
});

export const communityLogsRelations = relations(communityLogs, ({ one }) => ({
  community: one(groups, {
    fields: [communityLogs.communityId],
    references: [groups.id],
  }),
  performedBy: one(user, {
    fields: [communityLogs.performedBy],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [communityLogs.entity],
    references: [entity.id],
  }),
}));

// Community Rating System
export const ratingEnum = pgEnum("ratingEnum", ["1", "2", "3", "4", "5"]);

export const groupRating = pgTable(
  "communityRating",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    groupId: uuid("community_id").notNull(),
    rating: ratingEnum("rating").notNull(),
    review: text("review"),
    isVerified: boolean("isVerified").notNull().default(false),
    verifiedBy: uuid("verifiedBy"),
    verifiedAt: timestamp("verifiedAt"),
    verificationReason: text("verificationReason"),
    isHelpful: boolean("isHelpful").notNull().default(false),
    helpfulCount: integer("helpfulCount").default(0),
    unhelpfulCount: integer("unhelpfulCount").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    entityId: uuid("entity_id").notNull(),
  },
  (table) => {
    return {
      pk: unique().on(table.userId, table.groupId, table.entityId),
    };
  }
);

export const groupRatingRelations = relations(groupRating, ({ one, many }) => ({
  group: one(groups, {
    fields: [groupRating.groupId],
    references: [groups.id],
  }),
  user: one(user, {
    fields: [groupRating.userId],
    references: [user.id],
  }),
  verifier: one(user, {
    fields: [groupRating.verifiedBy],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [groupRating.entityId],
    references: [entity.id],
  }),
  helpfulVotes: many(ratingHelpfulness),
}));

// Rating Helpfulness Voting System
export const ratingHelpfulness = pgTable(
  "ratingHelpfulness",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ratingId: uuid("rating_id").notNull(),
    userId: uuid("user_id").notNull(),
    isHelpful: boolean("isHelpful").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      pk: unique().on(table.ratingId, table.userId),
    };
  }
);

export const ratingHelpfulnessRelations = relations(
  ratingHelpfulness,
  ({ one }) => ({
    rating: one(groupRating, {
      fields: [ratingHelpfulness.ratingId],
      references: [groupRating.id],
    }),
    user: one(user, {
      fields: [ratingHelpfulness.userId],
      references: [user.id],
    }),
  })
);

// Community Rating Summary/Aggregate Table
export const groupRatingSummary = pgTable("communityRatingSummary", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("community_id").notNull().unique(),
  totalRatings: integer("totalRatings").default(0),
  averageRating: numeric("averageRating", { precision: 3, scale: 2 }).default(
    "0.00"
  ),
  totalVerifiedRatings: integer("totalVerifiedRatings").default(0),
  averageVerifiedRating: numeric("averageVerifiedRating", {
    precision: 3,
    scale: 2,
  }).default("0.00"),

  // Rating distribution
  oneStar: integer("oneStar").default(0),
  twoStar: integer("twoStar").default(0),
  threeStar: integer("threeStar").default(0),
  fourStar: integer("fourStar").default(0),
  fiveStar: integer("fiveStar").default(0),

  // Verified rating distribution
  verifiedOneStar: integer("verifiedOneStar").default(0),
  verifiedTwoStar: integer("verifiedTwoStar").default(0),
  verifiedThreeStar: integer("verifiedThreeStar").default(0),
  verifiedFourStar: integer("verifiedFourStar").default(0),
  verifiedFiveStar: integer("verifiedFiveStar").default(0),

  lastUpdated: timestamp("lastUpdated").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupRatingSummaryRelations = relations(
  groupRatingSummary,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupRatingSummary.groupId],
      references: [groups.id],
    }),
  })
);

// Rating Moderation/Reports
export const ratingReport = pgTable(
  "ratingReport",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ratingId: uuid("rating_id").notNull(),
    reporterId: uuid("reporter_id").notNull(),
    reason: text("reason").notNull(),
    description: text("description"),
    status: text("status").notNull().default("PENDING"), // PENDING, APPROVED, REJECTED
    reviewedBy: uuid("reviewedBy"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      pk: unique().on(table.ratingId, table.reporterId),
    };
  }
);

export const ratingReportRelations = relations(ratingReport, ({ one }) => ({
  rating: one(groupRating, {
    fields: [ratingReport.ratingId],
    references: [groupRating.id],
  }),
  reporter: one(user, {
    fields: [ratingReport.reporterId],
    references: [user.id],
  }),
  reviewer: one(user, {
    fields: [ratingReport.reviewedBy],
    references: [user.id],
  }),
}));

// Community Media System (Images only, Admin only)
export const groupMedia = pgTable("communityMedia", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("community_id").notNull(),
  imageUrl: text("imageUrl").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  uploadedBy: uuid("uploadedBy").notNull(), // Must be admin/manager
  isActive: boolean("isActive").notNull().default(true),
  displayOrder: integer("displayOrder").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entityId: uuid("entity_id").notNull(),
});

export const groupMediaRelations = relations(groupMedia, ({ one }) => ({
  group: one(groups, {
    fields: [groupMedia.groupId],
    references: [groups.id],
  }),
  uploader: one(user, {
    fields: [groupMedia.uploadedBy],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [groupMedia.entityId],
    references: [entity.id],
  }),
}));

// Community Wishlist System
export const communityWishlist = pgTable(
  "communityWishlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    groupId: uuid("community_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    entityId: uuid("entity_id").notNull(),
    notes: text("notes"), // Optional personal notes about why they wishlisted
    priority: integer("priority").default(1), // 1-5 priority level for user organization
    notificationEnabled: boolean("notificationEnabled").notNull().default(true), // Whether to notify about community updates
  },
  (table) => {
    return {
      pk: unique().on(table.userId, table.groupId, table.entityId),
    };
  }
);

export const communityWishlistRelations = relations(
  communityWishlist,
  ({ one }) => ({
    group: one(groups, {
      fields: [communityWishlist.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [communityWishlist.userId],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [communityWishlist.entityId],
      references: [entity.id],
    }),
  })
);

// Community/User Notification System
export const notificationTypeEnum = pgEnum("notificationTypeEnum", [
  "COMMUNITY_EVENT",
  "MEMBER_EVENT",
  "ADMIN_EVENT",
  "SYSTEM_EVENT",
  "RATING_EVENT",
]);

export const notificationStatusEnum = pgEnum("notificationStatusEnum", [
  "UNREAD",
  "READ",
  "ARCHIVED",
]);

export const communityNotification = pgTable("communityNotification", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(), // recipient user
  groupId: uuid("community_id"), // optional: related community
  type: notificationTypeEnum("type").notNull(),
  title: text("title"),
  message: text("message").notNull(),
  status: notificationStatusEnum("status").notNull().default("UNREAD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  entityId: uuid("entity_id"),
  actionUrl: text("actionUrl"), // optional: link to action
});

export const communityNotificationRelations = relations(
  communityNotification,
  ({ one }) => ({
    group: one(groups, {
      fields: [communityNotification.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [communityNotification.userId],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [communityNotification.entityId],
      references: [entity.id],
    }),
  })
);

// Community Activity Log Enums
export const communityActivityTypeEnum = pgEnum("communityActivityTypeEnum", [
  "RATING",
  "EVENT",
  "MEMBER",
  "MEDIA",
  "WISHLIST",
  "GENERAL",
  "MEMBER_EVENT",
  "RATING_EVENT",
]);

export const communityActivityStatusEnum = pgEnum(
  "communityActivityStatusEnum",
  [
    "NEW",
    "APPROVED",
    "REJECTED",
    "UPDATED",
    "DELETED",
    "LEFT",
    "REMOVED",
    "CREATED",
  ]
);

// Community Activity/Audit Log Table
export const communityActivityLog = pgTable("communityActivityLog", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("community_id").notNull(),
  userId: uuid("user_id").notNull(), // who performed the action
  type: communityActivityTypeEnum("type").notNull(),
  status: communityActivityStatusEnum("status").notNull().default("NEW"),
  details: jsonb("details"), // optional: extra info (e.g., rating value, event id, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const communityActivityLogRelations = relations(
  communityActivityLog,
  ({ one }) => ({
    group: one(groups, {
      fields: [communityActivityLog.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [communityActivityLog.userId],
      references: [user.id],
    }),
  })
);

// Community Feed Status Enum
export const feedStatusEnum = pgEnum("feedStatusEnum", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REMOVED",
  "FLAGGED",
]);

// Community Feed Priority Enum
export const feedPriorityEnum = pgEnum("feedPriorityEnum", [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);

export const communityFeed = pgTable(
  "communityFeed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userFeedId: uuid("user_feed_id").notNull(),
    member: uuid("user_member").notNull(),
    communityId: uuid("community_id").notNull(),

    // Approval workflow
    status: feedStatusEnum("status").notNull().default("PENDING"),
    isApproved: boolean("isApproved").notNull().default(false),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),

    // Content management
    priority: feedPriorityEnum("priority").notNull().default("NORMAL"),
    isPinned: boolean("isPinned").notNull().default(false),
    pinnedBy: uuid("pinned_by"),
    pinnedAt: timestamp("pinned_at"),

    // Moderation
    isFlagged: boolean("isFlagged").notNull().default(false),
    flaggedBy: uuid("flagged_by"),
    flaggedAt: timestamp("flagged_at"),
    flagReason: text("flag_reason"),
    moderatedBy: uuid("moderated_by"),
    moderatedAt: timestamp("moderated_at"),

    // Scheduling
    scheduledFor: timestamp("scheduled_for"),
    publishedAt: timestamp("published_at"),
    expiresAt: timestamp("expires_at"),

    // Metadata
    tags: text("tags").array(),
    metadata: jsonb("metadata"),
    entityId: uuid("entity_id").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    archivedAt: timestamp("archivedAt"),
    archivedBy: uuid("archivedBy"),
    archivedReason: text("archivedReason"),
  },
  (table) => {
    return {
      uniqueFeedCommunity: unique().on(table.userFeedId, table.communityId),
    };
  }
);

export const communityFeedRelations = relations(
  communityFeed,
  ({ one, many }) => ({
    community: one(groups, {
      fields: [communityFeed.communityId],
      references: [groups.id],
    }),
    approver: one(user, {
      fields: [communityFeed.approvedBy],
      references: [user.id],
    }),
    member: one(groupMember, {
      fields: [communityFeed.member],
      references: [groupMember.id],
    }),
    feed: one(userFeed, {
      fields: [communityFeed.userFeedId],
      references: [userFeed.id],
    }),
    entity: one(entity, {
      fields: [communityFeed.entityId],
      references: [entity.id],
    }),

    // Moderation relations
    flagger: one(user, {
      fields: [communityFeed.flaggedBy],
      references: [user.id],
    }),
    moderator: one(user, {
      fields: [communityFeed.moderatedBy],
      references: [user.id],
    }),
    pinner: one(user, {
      fields: [communityFeed.pinnedBy],
      references: [user.id],
    }),

    // Future extensibility
    interactions: many(communityFeedInteraction),
    reports: many(communityFeedReport),
  })
);

// Community Feed Interactions
export const interactionTypeEnum = pgEnum("interactionTypeEnum", [
  "LIKE",
  "SHARE",
  "BOOKMARK",
  "REACTION",
  "COMMENT",
]);

export const communityFeedInteraction = pgTable(
  "communityFeedInteraction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    feedId: uuid("feed_id").notNull(),
    userId: uuid("user_id").notNull(),
    type: interactionTypeEnum("type").notNull(),
    reactionType: text("reaction_type"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      uniqueUserFeedInteraction: unique().on(
        table.feedId,
        table.userId,
        table.type
      ),
    };
  }
);

export const communityFeedInteractionRelations = relations(
  communityFeedInteraction,
  ({ one }) => ({
    feed: one(communityFeed, {
      fields: [communityFeedInteraction.feedId],
      references: [communityFeed.id],
    }),
    user: one(user, {
      fields: [communityFeedInteraction.userId],
      references: [user.id],
    }),
  })
);

// Community Feed Reports
export const communityFeedReport = pgTable(
  "communityFeedReport",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    feedId: uuid("feed_id").notNull(),
    reporterId: uuid("reporter_id").notNull(),
    reason: text("reason").notNull(),
    description: text("description"),
    status: text("status").notNull().default("PENDING"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      uniqueUserFeedReport: unique().on(table.feedId, table.reporterId),
    };
  }
);

export const communityFeedReportRelations = relations(
  communityFeedReport,
  ({ one }) => ({
    feed: one(communityFeed, {
      fields: [communityFeedReport.feedId],
      references: [communityFeed.id],
    }),
    reporter: one(user, {
      fields: [communityFeedReport.reporterId],
      references: [user.id],
    }),
    reviewer: one(user, {
      fields: [communityFeedReport.reviewedBy],
      references: [user.id],
    }),
  })
);

// Add these enums near your other enums
export const communityReportReasonEnum = pgEnum("communityReportReasonEnum", [
  "INAPPROPRIATE_CONTENT",
  "SPAM",
  "HARASSMENT",
  "FAKE_COMMUNITY",
  "VIOLENCE",
  "HATE_SPEECH",
  "SCAM_FRAUD",
  "COPYRIGHT_VIOLATION",
  "MISINFORMATION",
  "OTHER",
]);

export const moderationActionEnum = pgEnum("moderationActionEnum", [
  "NO_ACTION",
  "WARNING_ISSUED",
  "CONTENT_REMOVED",
  "COMMUNITY_SUSPENDED",
  "COMMUNITY_BANNED",
  "OWNER_CHANGED",
  "RESTRICTIONS_APPLIED",
]);

// Add the communityReport table
export const communityReport = pgTable(
  "communityReport",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    communityId: uuid("community_id").notNull(),
    reporterId: uuid("reporter_id").notNull(),
    entityId: uuid("entity_id").notNull(),

    // Report details
    reason: communityReportReasonEnum("reason").notNull(),
    description: text("description"),
    evidenceUrls: text("evidence_urls").array(), // Screenshots, links, etc.

    // Status and workflow
    status: reportStatusEnum("status").notNull().default("PENDING"),
    priority: feedPriorityEnum("priority").notNull().default("NORMAL"),

    // Moderation
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    moderatorNotes: text("moderator_notes"),
    moderationAction:
      moderationActionEnum("moderation_action").default("NO_ACTION"),
    actionTakenAt: timestamp("action_taken_at"),

    // Resolution
    isResolved: boolean("is_resolved").notNull().default(false),
    resolutionNotes: text("resolution_notes"),
    resolvedBy: uuid("resolved_by"),
    resolvedAt: timestamp("resolved_at"),

    // Appeal process
    canAppeal: boolean("can_appeal").notNull().default(true),
    appealDeadline: timestamp("appeal_deadline"),
    isAppealed: boolean("is_appealed").notNull().default(false),
    appealedAt: timestamp("appealed_at"),

    // Metadata
    reportSource: text("report_source").default("USER"), // USER, SYSTEM, AUTOMATED
    metadata: jsonb("metadata"), // Additional context, automated detection scores, etc.

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      // Prevent duplicate reports from same user for same community
      uniqueUserCommunityReport: unique().on(
        table.reporterId,
        table.communityId,
        table.entityId
      ),
    };
  }
);

export const communityReportRelations = relations(
  communityReport,
  ({ one, many }) => ({
    community: one(groups, {
      fields: [communityReport.communityId],
      references: [groups.id],
    }),
    reporter: one(user, {
      fields: [communityReport.reporterId],
      references: [user.id],
    }),
    reviewer: one(user, {
      fields: [communityReport.reviewedBy],
      references: [user.id],
    }),
    resolver: one(user, {
      fields: [communityReport.resolvedBy],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [communityReport.entityId],
      references: [entity.id],
    }),

    // Related records
    appeals: many(communityReportAppeal),
    auditLogs: many(communityReportAuditLog),
  })
);

// Community Report Appeal System
export const communityReportAppeal = pgTable(
  "communityReportAppeal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id").notNull(),
    appealedBy: uuid("appealed_by").notNull(), // Usually community owner/admin

    // Appeal details
    reason: text("reason").notNull(),
    description: text("description").notNull(),
    evidenceUrls: text("evidence_urls").array(),

    // Status
    status: reportStatusEnum("status").notNull().default("PENDING"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    reviewerNotes: text("reviewer_notes"),

    // Resolution
    isApproved: boolean("is_approved").notNull().default(false),
    finalDecision: text("final_decision"),
    decidedBy: uuid("decided_by"),
    decidedAt: timestamp("decided_at"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      // One appeal per report
      uniqueReportAppeal: unique().on(table.reportId),
    };
  }
);

export const communityReportAppealRelations = relations(
  communityReportAppeal,
  ({ one }) => ({
    report: one(communityReport, {
      fields: [communityReportAppeal.reportId],
      references: [communityReport.id],
    }),
    appealer: one(user, {
      fields: [communityReportAppeal.appealedBy],
      references: [user.id],
    }),
    reviewer: one(user, {
      fields: [communityReportAppeal.reviewedBy],
      references: [user.id],
    }),
    decider: one(user, {
      fields: [communityReportAppeal.decidedBy],
      references: [user.id],
    }),
  })
);

// Community Report Audit Log
export const reportAuditActionEnum = pgEnum("reportAuditActionEnum", [
  "CREATED",
  "STATUS_CHANGED",
  "ASSIGNED",
  "REVIEWED",
  "ACTION_TAKEN",
  "RESOLVED",
  "APPEALED",
  "APPEAL_REVIEWED",
  "ESCALATED",
  "NOTES_ADDED",
]);

export const communityReportAuditLog = pgTable("communityReportAuditLog", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").notNull(),
  performedBy: uuid("performed_by").notNull(),

  // Action details
  action: reportAuditActionEnum("action").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  notes: text("notes"),

  // Context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityReportAuditLogRelations = relations(
  communityReportAuditLog,
  ({ one }) => ({
    report: one(communityReport, {
      fields: [communityReportAuditLog.reportId],
      references: [communityReport.id],
    }),
    performer: one(user, {
      fields: [communityReportAuditLog.performedBy],
      references: [user.id],
    }),
  })
);

// Community Report Statistics (for admin dashboard)
export const communityReportStats = pgTable("communityReportStats", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull().unique(),

  // Counts by status
  totalReports: integer("total_reports").default(0),
  pendingReports: integer("pending_reports").default(0),
  underReviewReports: integer("under_review_reports").default(0),
  approvedReports: integer("approved_reports").default(0),
  rejectedReports: integer("rejected_reports").default(0),
  dismissedReports: integer("dismissed_reports").default(0),

  // Counts by reason
  inappropriateContentReports: integer("inappropriate_content_reports").default(
    0
  ),
  spamReports: integer("spam_reports").default(0),
  harassmentReports: integer("harassment_reports").default(0),
  fakeCommunityReports: integer("fake_community_reports").default(0),
  violenceReports: integer("violence_reports").default(0),
  hateSpeechReports: integer("hate_speech_reports").default(0),
  otherReports: integer("other_reports").default(0),

  // Metrics
  averageResolutionTimeHours: integer("avg_resolution_time_hours").default(0),
  totalAppeals: integer("total_appeals").default(0),
  successfulAppeals: integer("successful_appeals").default(0),

  // Timestamps
  lastUpdated: timestamp("last_updated").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityReportStatsRelations = relations(
  communityReportStats,
  ({ one }) => ({
    entity: one(entity, {
      fields: [communityReportStats.entityId],
      references: [entity.id],
    }),
  })
);
