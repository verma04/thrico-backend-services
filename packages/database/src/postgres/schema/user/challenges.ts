import { relations, sql } from 'drizzle-orm'
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
    date,
} from 'drizzle-orm/pg-core'

export const challengesVisibility = pgEnum('challengesVisibility', [
    'public',
    'private',
])
export const challengeMode = pgEnum('challengesMode', ['online', 'offline'])
export const challengesParticipationType = pgEnum(
    'challengesParticipationType',
    ['individual', 'team']
)
export const challenges = pgTable('challenges', {
    id: uuid('id').defaultRandom().primaryKey(),
    challengesVisibility: challengesVisibility(
        'challengesVisibility'
    ).notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    association: uuid('association_id').notNull(),
    website_url: text('website_url').notNull(),
    challengeMode: challengeMode('challengesMode').notNull(),
    about: text('about').notNull(),
    registrationEndTime: date('registrationEndTime').notNull(),
    registrationStartTime: date('registrationStartTime').notNull(),
    challengesParticipationType: challengesParticipationType(
        'challengesParticipationType'
    ).notNull(),
    mimMember: varchar('mimMember'),
    maxMember: varchar('maxMember'),
    numberOfRegistrations: varchar('maxMember'),
})

export const challengesAddress = pgTable('challengesAddress', {
    id: uuid('id').defaultRandom().primaryKey(),
    location: text('location').notNull(),
    state: text('state').notNull(),
    city: text('city').notNull(),
    country: text('country').notNull(),
    challenge: uuid('challenges_id').notNull(),
})
