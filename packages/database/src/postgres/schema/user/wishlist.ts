import { relations } from "drizzle-orm";
import { pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { groups } from "./communities";
import { user, userToEntity } from "./member/user";
import { entity } from "../tenant";
import { jobs } from "./jobs";
import { events } from "./events";

export const groupWishList = pgTable(
  "userWishListGroup",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    groupId: uuid("group_id").notNull(),
  },
  (table) => {
    return {
      pk: unique().on(table.groupId, table.userId, table.entityId),
    };
  }
);

export const groupWishListRelations = relations(
  groupWishList,
  ({ one, many }) => ({
    feed: one(groups, {
      fields: [groupWishList.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [groupWishList.userId],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [groupWishList.entityId],
      references: [entity.id],
    }),
  })
);

export const jobWishList = pgTable(
  "userWishListGroup",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    jobId: uuid("job_id").notNull(),
  },
  (table) => {
    return {
      pk: unique().on(table.jobId, table.userId, table.entityId),
    };
  }
);

export const jobListRelations = relations(jobWishList, ({ one, many }) => ({
  job: one(jobs, {
    fields: [jobWishList.jobId],
    references: [jobs.id],
  }),
  user: one(userToEntity, {
    fields: [jobWishList.userId],
    references: [userToEntity.id],
  }),
  entity: one(entity, {
    fields: [jobWishList.entityId],
    references: [entity.id],
  }),
}));

export const eventsWishList = pgTable(
  "userWishListEvents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    eventId: uuid("event_id").notNull(),
  },
  (table) => {
    return {
      pk: unique().on(table.eventId, table.userId, table.entityId),
    };
  }
);

export const eventsWishListRelations = relations(
  eventsWishList,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventsWishList.eventId],
      references: [events.id],
    }),
    user: one(user, {
      fields: [eventsWishList.userId],
      references: [user.id],
    }),
    entity: one(entity, {
      fields: [eventsWishList.entityId],
      references: [entity.id],
    }),
  })
);
