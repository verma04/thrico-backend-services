import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  varchar,
  pgEnum,
  json,
  unique,
  integer,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";

import { events } from "../events";
import { groupRequest, groupMember, groupView } from "../communities";
import { feedComment, feedReactions, media, userFeed } from "../feed";
import { marketPlace } from "../marketPlace";
import { entity } from "../../tenant/entity/details";
import { gender, userEntityStatus, userPronounsStatus } from "../enum";
import { pollResults } from "../polls";
import { discussionForumComment } from "../discussion-forum";
import { gamificationUser } from "../gamification";

export const user = pgTable(
  "thricoUser",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    thricoId: uuid("thricoId").notNull(),
    firstName: text("firstName").notNull(),
    cover: text("cover").default("default_profile_cover.jpg"),
    avatar: text("avatar").default("defaultAvatar.png"),
    lastName: text("lastName").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    entityId: uuid("entity_id").notNull(),
    location: jsonb("payload"),
    isBlocked: boolean("isBlocked").default(false),
    isActive: boolean("isActive").default(true),
    loginType: text("loginType"),
  },
  (table) => {
    return {
      unq: unique().on(table.thricoId, table.entityId),
    };
  },
);

export const warnings = pgTable("warnings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull(),
  offensiveContent: text("offensive_content"),
  offensiveContentJson: json("offensiveContentJson"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const warningsRelations = relations(warnings, ({ one }) => ({
  user: one(user, {
    fields: [warnings.userId],
    references: [user.id],
  }),
}));

export const userProfile = pgTable("userProfiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  country: text("country"),
  language: text("designation"),
  DOB: text("DOB"),
  userId: uuid("user_ID").notNull(),
  experience: json("experience"),
  education: json("education"),
  phone: json("phone"),
  phoneCode: text("phoneCode"),
  gender: gender("gendeR"),
  pronouns: userPronounsStatus("pronouns"),
  categories: json("categories"),
  skills: json("skills"),
  interests: json("interests"),
  socialLinks: json("socialLinks"),
  interestsCategories: json("interestCategories"),
});
export const aboutUser = pgTable("aboutUser", {
  id: uuid("id").defaultRandom().primaryKey(),
  currentPosition: varchar("currentPosition", { length: 200 }),

  userId: uuid("user_ID").notNull(),
  pronouns: userPronounsStatus("userPronounsStatus"),
  social: json("social"),
  headline: varchar("headline"),
  about: varchar("about"),
  // Added gender field
});

export const userResume = pgTable("userResume", {
  currentPosition: text("currentPosition"),
  userId: uuid("user_ID").notNull(),
});

export const userLocation = pgTable("userLoction", {
  id: uuid("id").defaultRandom().primaryKey(),
  latitude: numeric("latitude", { precision: 10, scale: 8 }).notNull(), // 10 total digits, 8 after decimal
  longitude: numeric("longitude", { precision: 11, scale: 8 }).notNull(),
  userId: uuid("user_ID").notNull(),
});

export const userLocationRelations = relations(userLocation, ({ one }) => ({
  user: one(user, {
    fields: [userLocation.userId],
    references: [user.id],
  }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));
export const aboutUserRelations = relations(aboutUser, ({ one }) => ({
  user: one(user, {
    fields: [aboutUser.userId],
    references: [user.id],
  }),
}));
export const userResumeRelations = relations(userResume, ({ one }) => ({
  user: one(user, {
    fields: [userResume.userId],
    references: [user.id],
  }),
}));

export const userToEntity = pgTable(
  "userToEntity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    isApproved: boolean("isApproved").notNull().default(false),
    isRequested: boolean("isRequested").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    tag: text("tag").array(),
    status: userEntityStatus("status").notNull().default("PENDING"),
    interests: text("interests").array(),
    categories: text("categories").array(),
    lastActive: timestamp("last_active", {
      mode: "string",
      withTimezone: true,
    }),
    isOnline: boolean("isOnline").notNull().default(false),
    // isVerifiedAt: timestamp("isVerifiedAt"),
    // verifiedBy: uuid("verifiedBy"),
    // isVerified: boolean("isVerified").default(false),
    // verificationReason: text("verificationReason"),
  },
  (table) => {
    return {
      unq: unique().on(table.userId, table.entityId),
    };
  },
);

export const userToEntityRelations = relations(
  userToEntity,
  ({ one, many }) => ({
    userKyc: one(userKyc),
    verification: one(userVerification),

    // location: one(userLocation),
    followers: many(userConnection, {
      relationName: "followers",
    }),
    following: many(userConnection, {
      relationName: "following",
    }),
    requestSent: many(userRequest, {
      relationName: "requestSent",
    }),
    requestReceive: many(userRequest, {
      relationName: "requestReceive",
    }),

    user: one(user, {
      fields: [userToEntity.userId],
      references: [user.id],
    }),

    entity: one(entity, {
      fields: [userToEntity.entityId],
      references: [entity.id],
    }),
  }),
);

export const userKyc = pgTable("userKycs", {
  id: uuid("id").defaultRandom().primaryKey(),
  affliction: json("affliction"),
  referralSource: json("referralSource"),
  comment: json("comment").notNull(),
  agreement: boolean("agreement").notNull(),
  entityId: uuid("entityId"),
  userId: uuid("userId").notNull(),
});

export const userKycRelations = relations(userKyc, ({ one, many }) => ({
  user: one(userToEntity, {
    fields: [userKyc.userId],
    references: [userToEntity.id],
  }),
  entity: one(entity, {
    fields: [userKyc.id],
    references: [entity.id],
  }),
}));

export const userConnection = pgTable(
  "userConnection",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followingId: uuid("user_id").notNull(),
    followerId: uuid("followers_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    isAccepted: boolean("isAccepted").notNull(),
  },
  (table) => {
    return {
      unq: unique().on(table.followingId, table.followerId),
      unq2: unique("userConnection").on(table.followingId, table.followerId),
    };
  },
);

export const userConnectionRelations = relations(
  userConnection,
  ({ one, many }) => ({
    following: one(userToEntity, {
      fields: [userConnection.followingId],
      references: [userToEntity.userId],
      relationName: "following",
    }),
    followers: one(userToEntity, {
      fields: [userConnection.followerId],
      references: [userToEntity.userId],
      relationName: "followers",
    }),
  }),
);

export const userRequest = pgTable(
  "userConnectionRequest",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    senderId: uuid("sender_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    isAccepted: boolean("isAccepted").notNull(),
  },
  (table) => {
    return {
      unq: unique().on(table.userId, table.senderId),
      unq2: unique("userRequest").on(table.userId, table.senderId),
    };
  },
);

export const userRequestRelations = relations(userRequest, ({ one, many }) => ({
  user: one(userToEntity, {
    fields: [userRequest.userId],
    references: [userToEntity.userId],
    relationName: "requestSent",
  }),
  sender: one(userToEntity, {
    fields: [userRequest.senderId],
    references: [userToEntity.userId],
    relationName: "requestReceive",
  }),
}));

export const userOtp = pgTable("userOtp", {
  id: uuid("id").defaultRandom().primaryKey(),
  user: uuid("user_id").notNull(),
  otp: text("otp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  timeOfExpire: integer("timeOfExpire").default(10),
  isExpired: boolean("isExpired").default(false),
});

export const userOtpRelations = relations(userOtp, ({ one }) => ({
  user: one(user, {
    fields: [userOtp.user],
    references: [user.id],
  }),
}));

export const userSession = pgTable("userSession", {
  id: uuid("id").defaultRandom().primaryKey(),
  user: uuid("user_id").notNull(),
  device_id: text("device_id").notNull(),
  // device_type: device_OStype("device_OStype"),
  deviceName: varchar("device_name", { length: 255 }),
  deviceToken: varchar("device_token", { length: 255 }),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("isActive").default(true).notNull(),
});

export const userSessionRelations = relations(userSession, ({ one }) => ({
  user: one(userToEntity, {
    fields: [userSession.user],
    references: [userToEntity.id],
  }),
}));

export const userVerification = pgTable("userVerification", {
  id: uuid("id").defaultRandom().primaryKey(),
  isVerifiedAt: timestamp("isVerifiedAt"),
  verifiedBy: uuid("verifiedBy"),
  isVerified: boolean("isVerified").default(false),
  verificationReason: text("verificationReason"),
  userId: uuid("userId").notNull(),
});

export const userVerificationRelations = relations(
  userVerification,
  ({ one, many }) => ({
    user: one(userToEntity, {
      fields: [userVerification.userId],
      references: [userToEntity.id],
    }),
  }),
);

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile),
  about: one(aboutUser),
  gamification: one(gamificationUser),
  relations: many(feedReactions),
  userEntity: one(userToEntity),
  discussionForumComment: one(discussionForumComment),
  otp: one(userOtp),
  resume: many(userToEntity),
  marketPlaceListing: many(marketPlace),
  location: many(userLocation),
  feedComment: many(feedComment),
  entity: one(entity, {
    fields: [user.entityId],
    references: [entity.id],
  }),
  warnings: many(warnings),
  feed: many(userFeed),
  pollResult: many(pollResults),
  media: many(media),
  groupMember: many(groupMember),
  groupRequest: many(groupRequest),
  groupViews: many(groupView),
}));
