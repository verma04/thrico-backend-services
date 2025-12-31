import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  uuid,
  timestamp,
  boolean,
  pgEnum,
  json,
  primaryKey,
  numeric,
  date,
  time,
  unique,
  jsonb,
  varchar,
  decimal,
  customType,
} from "drizzle-orm/pg-core";
import { entity } from "../tenant/entity/details";

import { groups } from "./communities";
import { addedBy, communityEntityStatus } from "./enum";

import { user } from "./member";

export const eventTypesEnum = pgEnum("eventTypes", [
  "VIRTUAL",
  "IN_PERSON",
  "HYBRID",
]);
export const visibilityEnum = pgEnum("eventVisibility", ["PRIVATE", "PUBLIC"]);
export const eventCostTypeEnum = pgEnum("eventCostTypeEnum", ["FREE", "PAID"]);

export const mediaType = pgEnum("mediaType", ["VIDEO", "IMAGE"]);
export const hostType = pgEnum("hostType", ["HOST", "CO_HOST"]);

export const layout = pgEnum("layout", ["layout-1", "layout-2", "layout-3"]);
export const vector = customType<{
  data: number[];
  driverData: string;
}>({
  dataType() {
    return "vector(1536)";
  },
});
export const events = pgTable("eventsss", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventCreator: uuid("eventCreator_id"),
  eventCreatedBy: addedBy("addedBy").default("USER"),
  entityId: uuid("entityId").notNull(),
  cover: text("cover").notNull().default("defaultEventCover.png"),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  type: eventTypesEnum("type").notNull(),
  status: communityEntityStatus("status").notNull(),
  venue: text("venue"),
  location: jsonb("location"),
  lastDateOfRegistration: date("lastDateOfRegistration").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  startTime: text("startTime").notNull(),
  visibility: visibilityEnum("visibility").notNull().default("PUBLIC"),
  description: text("description"),
  isAcceptingSponsorShip: boolean("isAcceptingSponsorShip")
    .notNull()
    .default(false),
  isApproved: boolean("isApproved").notNull().default(false),
  isActive: boolean("isActive").notNull().default(false),
  group: uuid("groupId"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  tag: text("tag").array(),
  isFeatured: boolean("isFeatured").notNull().default(false),
  numberOfAttendees: integer("numberOfLikes").default(0),
  numberOfPost: integer("numberOfPost").default(0),
  numberOfViews: integer("numberOfViews").default(0),
  isRegistrationOpen: boolean("isRegistrationOpen").notNull().default(true),
  embedding: vector("embedding"), // This will create a vector column
});

export const eventsPayments = pgTable("eventsPayments", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_Id").notNull(),
  eventCost: eventCostTypeEnum("eventCostTypeEnum").notNull(),
  costPerAdults: numeric("forAdults"),
  costPerChildren: numeric("forChildren"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const eventsPaymentsRelations = relations(
  eventsPayments,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventsPayments.eventId],
      references: [events.id],
    }),
  })
);

export const eventsVenue = pgTable("eventsVenue", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  capacity: integer("capacity"),
  description: text("description"),
  amenities: jsonb("amenities").$type<string[]>(),
  contactInfo: jsonb("contact_info"),
  images: jsonb("images").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  status: boolean("status").default(true).notNull(),
});
export const eventsVenueRelations = relations(eventsVenue, ({ one, many }) => ({
  event: one(events, {
    fields: [eventsVenue.eventId],
    references: [events.id],
  }),
}));

export const eventSpeakers = pgTable("eventSpeakers", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  bio: text("bio"),
  title: varchar("title", { length: 255 }),
  company: varchar("company", { length: 255 }),
  avatar: text("avatar"),
  socialLinks: jsonb("social_links"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  status: boolean("status").default(true).notNull(),
});
export const eventSpeakersRelations = relations(
  eventSpeakers,
  ({ one, many }) => ({
    // eventsSpeakerToAgenda: many(eventsSpeakerToAgenda),
    event: one(events, {
      fields: [eventSpeakers.eventId],
      references: [events.id],
    }),
  })
);

export const eventsMedia = pgTable("eventsMedia", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url"),
  mediaType: mediaType("mediaType"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  eventId: uuid("eventId"),
});
export const eventsMediaRelations = relations(eventsMedia, ({ one, many }) => ({
  event: one(events, {
    fields: [eventsMedia.eventId],
    references: [events.id],
  }),
}));

export const eventsSpeakerToAgenda = pgTable(
  "speakers_to_agenda",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // speaker: integer("speaker_id"),
    // agenda: integer("agenda_id"),
  }
  // (table) => {
  //   return {
  //     pk: primaryKey({ columns: [table.agenda, table.speaker] }),
  //     user: primaryKey({
  //       name: "userEntity",
  //       columns: [table.agenda, table.speaker],
  //     }),
  //   };
  // }
);

export const eventsAgenda = pgTable("eventsAgenda", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  videoSteam: text("videoSteam"),
  venue: text("venue_id"),
  date: date("date").notNull(),
  startTime: time("startTime").notNull(),
  endTime: time("endTime").notNull(),
  isPublished: boolean("isPublished").notNull(),
  isPinned: boolean("isPinned").notNull(),
  isDraft: boolean("isDraft").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  eventId: uuid("eventId")
    .references(() => events.id)
    .notNull(),
});
export const eventsAgendaRelations = relations(
  eventsAgenda,
  ({ one, many }) => ({
    // eventsSpeakerToAgenda: many(eventsSpeakerToAgenda),
    event: one(events, {
      fields: [eventsAgenda.eventId],
      references: [events.id],
    }),
    venue: one(eventsVenue, {
      fields: [eventsAgenda.venue],
      references: [eventsVenue.id],
    }),
  })
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  eventsPayments: one(eventsPayments),
  hosts: many(eventHost),
  verification: one(eventVerification),
  eventsAttendees: many(eventsAttendees),
  eventsSettings: one(eventsSettings),
  eventsOrganizer: one(eventsOrganizer),
  eventsSponsorShip: many(eventsSponsorShip),
  eventsVenue: many(eventsVenue),
  postedBy: one(user, {
    fields: [events.eventCreator],
    references: [user.id],
  }),

  eventSponsors: many(eventSponsors),
  eventsMedia: many(eventsMedia),
  eventsAgenda: many(eventsAgenda),
  speakers: many(eventSpeakers),
  entity: one(entity, {
    fields: [events.entityId],
    references: [entity.id],
  }),
  group: one(groups, {
    fields: [events.id],
    references: [groups.id],
  }),
}));

export const eventsSponsorShip = pgTable("eventsSponsorShip", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("eventId").references(() => events.id),
  sponsorType: text("sponsorType").notNull(),
  price: numeric("price").notNull(),
  currency: text("currency").notNull(),
  showPrice: boolean("showPrice").notNull().default(false),
  content: json("content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const eventsSponsorShipRelations = relations(
  eventsSponsorShip,
  ({ one, many }) => ({
    eventSponsors: many(eventSponsors),
    event: one(events, {
      fields: [eventsSponsorShip.eventId],
      references: [events.id],
    }),
  })
);

export const eventsOrganizer = pgTable("eventsOrganizer", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_Id").notNull(),
  eventOrganizerName: text("eventsOrganizerName"),
  contactEmail: text("contactEmail").notNull(),
  contactNumber: text("contactNumber").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const eventsOrganizerRelations = relations(
  eventsOrganizer,
  ({ one, many }) => ({
    eventsOrganizer: one(events, {
      fields: [eventsOrganizer.eventId],
      references: [events.id],
    }),
  })
);

export const eventHost = pgTable(
  "eventHosts",
  {
    userId: uuid("user_id").notNull(),
    eventId: uuid("event_Id").notNull(),
    hostType: hostType("hostType").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    entity: uuid("entity_id").notNull(),
  }
  // (table) => {
  //   return {
  //     pk: primaryKey({ columns: [table.userId, table.eventId] }),
  //     user: primaryKey({
  //       name: "userentity",
  //       columns: [table.userId, table.eventId],
  //     }),
  //   };
  // }
);

export const eventHostRelations = relations(eventHost, ({ one, many }) => ({
  event: one(events, {
    fields: [eventHost.eventId],
    references: [events.id],
  }),
  user: one(user, {
    fields: [eventHost.userId],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [eventHost.entity],
    references: [entity.id],
  }),
}));

export const eventSponsors = pgTable("eventSponsors", {
  id: uuid("id").defaultRandom().primaryKey(),
  sponsorName: text("sponsorName").notNull(),
  sponsorLogo: text("sponsorLogo").notNull(),
  sponsorUserName: text("sponsorUserName").notNull(),
  isApproved: boolean("isApproved").notNull(),
  sponsorUserDesignation: text("sponsorUserDesignation").notNull(),
  eventId: uuid("event_Id").notNull(),
  sponsorShipId: uuid("sponsorship_Id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const eventSponsorsRelations = relations(
  eventSponsors,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventSponsors.eventId],
      references: [events.id],
    }),
    sponsorShip: one(eventsSponsorShip, {
      fields: [eventSponsors.sponsorShipId],
      references: [eventsSponsorShip.id],
    }),
  })
);

export const eventsSettings = pgTable("eventsSettings", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_Id").notNull(),
  layout: layout("layout").notNull().default("layout-1"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const eventsSettingsRelations = relations(
  eventsSettings,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventsSettings.eventId],
      references: [events.id],
    }),
  })
);

export const eventsAttendees = pgTable(
  "eventsAttendees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user: uuid("user_id").notNull(),
    eventId: uuid("eventId_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    unq: unique().on(t.user, t.eventId),
    unq2: unique("uniqueEventsAttendees").on(t.user, t.eventId),
  })
);

export const eventsAttendeesRelations = relations(
  eventsAttendees,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventsAttendees.eventId],
      references: [events.id],
    }),
    user: one(user, {
      fields: [eventsAttendees.eventId],
      references: [user.id],
    }),
  })
);

export const eventVerification = pgTable("eventsVerification", {
  id: uuid("id").defaultRandom().primaryKey(),
  isVerifiedAt: timestamp("isVerifiedAt"),
  verifiedBy: uuid("verifiedBy"),
  isVerified: boolean("isVerified").default(false),
  verificationReason: text("verificationReason"),
  eventId: uuid("eventId").notNull(),
});

export const eventVerificationRelations = relations(
  eventVerification,
  ({ one }) => ({
    event: one(events, {
      fields: [eventVerification.eventId],
      references: [events.id],
    }),
  })
);

export const eventLogs = pgTable("eventAuditLogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("eventId").notNull(),
  status: communityEntityStatus("logStatus"), // e.g., "APPROVED", "REQUESTED", "REJECTED"
  performedBy: uuid("performedBy").notNull(), // The admin/moderator or user who triggered the action
  reason: text("reason"), // Optional reason for the change
  previousState: jsonb("previousState"), // Optionally store the previous record state
  newState: jsonb("newState"), // Optionally store the new record state
  createdAt: timestamp("created_at").defaultNow(),
  entity: uuid("entity").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const eventLogsRelations = relations(eventLogs, ({ one }) => ({
  event: one(events, {
    fields: [eventLogs.eventId],
    references: [events.id],
  }),
  performedBy: one(user, {
    fields: [eventLogs.performedBy],
    references: [user.id],
  }),
  entity: one(entity, {
    fields: [eventLogs.entity],
    references: [entity.id],
  }),
}));

export const eventTeamRoleEnum = pgEnum("eventTeamRole", [
  "ORGANIZER",
  "CO_ORGANIZER",
  "VOLUNTEER",
  "SPEAKER_MANAGER",
  "LOGISTICS",
  "MARKETING",
  "TECH_SUPPORT",
  "OTHER",
]);

export const eventTeams = pgTable("eventTeams", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  role: eventTeamRoleEnum("role").notNull(), // <-- use the enum here
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  status: boolean("status").default(true).notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const eventTeamsRelations = relations(eventTeams, ({ one, many }) => ({
  event: one(events, {
    fields: [eventTeams.eventId],
    references: [events.id],
  }),
  user: one(user, {
    fields: [eventTeams.userId],
    references: [user.id],
  }),
}));
