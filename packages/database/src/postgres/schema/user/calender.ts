import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  uuid,
  timestamp,
  boolean,
  varchar,
  pgEnum,
  json,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

import { events, eventsAttendees } from "./events";
import {
  groupInvitation,
  groupRequest,
  groups,
  groupMember,
} from "./communities";
import { feedReactions } from "./feed";
import { marketPlace } from "./marketPlace";
import { entity } from "../tenant/entity/details";

export const loginTypeEnum = pgEnum("loginType", [
  "email",
  "google",
  "linkedin",
]);
export const alumni = pgTable("alumni", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("firstName").notNull(),
  avatar: text("avatar"),
  lastName: text("lastName").notNull(),
  email: text("email").notNull().unique(),
  loginType: loginTypeEnum("loginType").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  googleId: text("googleId"),
});
export const alumniRelations = relations(alumni, ({ one, many }) => ({
  profileInfo: one(alumniProfile),
  aboutUser: one(aboutUser),
  user: many(userToEntity),
  resume: many(userToEntity),
}));

export const alumniProfile = pgTable("alumniProfile", {
  id: uuid("id").defaultRandom().primaryKey(),
  country: text("country"),
  language: text("designation"),
  DOB: text("DOB"),
  userId: uuid("user_id").notNull(),
  experience: json("experience"),
  education: json("education"),
  phone: json("phone"),
});
export const aboutUser = pgTable("aboutUser", {
  about: text("about"),
  id: uuid("id").defaultRandom().primaryKey(),
  currentPosition: text("currentPosition"),
  linkedin: text("linkedin"),
  instagram: text("instagram"),
  portfolio: text("portfolio"),
  userId: uuid("user_id").notNull(),
});

export const alumniResume = pgTable("alumniResume", {
  currentPosition: text("currentPosition"),
  userId: uuid("user_id").notNull(),
});

export const alumniProfileRelations = relations(alumniProfile, ({ one }) => ({
  user: one(alumni, {
    fields: [alumniProfile.userId],
    references: [alumni.id],
  }),
}));
export const aboutUserRelations = relations(aboutUser, ({ one }) => ({
  user: one(alumni, {
    fields: [aboutUser.userId],
    references: [alumni.id],
  }),
}));
export const alumniResumeRelations = relations(alumniResume, ({ one }) => ({
  user: one(alumni, {
    fields: [alumniResume.userId],
    references: [alumni.id],
  }),
}));

export const userToEntity = pgTable(
  "alumniEntityProfile",
  {
    userId: uuid("user_id"),
    entityId: uuid("entity_id"),
    isApproved: boolean("isApproved").notNull().default(false),
    isRequested: boolean("isRequested").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  }
  // (table) => {
  //   return {
  //     pk: primaryKey({ columns: [table.entityId, table.userId] }),
  //     userToEntity: primaryKey({
  //       name: "userentity",
  //       columns: [table.entityId, table.userId],
  //     }),
  //   };
  // }
);

export const userToEntityRelations = relations(
  userToEntity,
  ({ one, many }) => ({
    relations: many(feedReactions),
    group: many(groups),
    alumniKyc: one(alumniKyc),
    events: many(events),
    groupMember: many(groupMember),
    groupInvitation: many(groupInvitation),
    groupRequest: many(groupRequest),
    eventsAttendees: many(eventsAttendees),
    marketPlaceListing: many(marketPlace),
    followers: many(alumniConnection, {
      relationName: "followers",
    }),
    following: many(alumniConnection, {
      relationName: "following",
    }),
    requestSent: many(alumniRequest, {
      relationName: "requestSent",
    }),
    requestReceive: many(alumniRequest, {
      relationName: "requestReceive",
    }),

    user: one(alumni, {
      fields: [userToEntity.userId],
      references: [alumni.id],
    }),
    entity: one(entity, {
      fields: [userToEntity.userId],
      references: [entity.id],
    }),
  })
);

export const alumniKyc = pgTable("alumniKyc", {
  id: uuid("id").defaultRandom().primaryKey(),
  affliction: json("affliction"),
  referralSource: json("referralSource"),
  comment: json("comment").notNull(),
  agreement: boolean("agreement").notNull(),
  orgId: uuid("orgId").notNull(),
});

export const alumniKycRelations = relations(alumniKyc, ({ one, many }) => ({
  user: one(userToEntity, {
    fields: [alumniKyc.orgId],
    references: [userToEntity.userId],
  }),
}));

export const alumniConnection = pgTable(
  "alumniConnection",
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
      unq2: unique("alumniConnection").on(table.followingId, table.followerId),
    };
  }
);

export const alumniConnectionRelations = relations(
  alumniConnection,
  ({ one, many }) => ({
    following: one(userToEntity, {
      fields: [alumniConnection.followingId],
      references: [userToEntity.userId],
      relationName: "following",
    }),
    followers: one(userToEntity, {
      fields: [alumniConnection.followerId],
      references: [userToEntity.userId],
      relationName: "followers",
    }),
  })
);

export const alumniRequest = pgTable(
  "alumniConnectionRequest",
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
      unq2: unique("alumniRequest").on(table.userId, table.senderId),
    };
  }
);

export const alumniRequestRelations = relations(
  alumniRequest,
  ({ one, many }) => ({
    user: one(userToEntity, {
      fields: [alumniRequest.userId],
      references: [userToEntity.userId],
      relationName: "requestSent",
    }),
    sender: one(userToEntity, {
      fields: [alumniRequest.senderId],
      references: [userToEntity.userId],
      relationName: "requestReceive",
    }),
  })
);
