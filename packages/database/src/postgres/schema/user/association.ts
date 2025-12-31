import { relations, sql } from 'drizzle-orm'
import {
    pgTable,

    text,

    uuid,

    pgEnum,

} from 'drizzle-orm/pg-core'

export const associationType = pgEnum('associationType', [
    'Business School',
    'College',
    'University',
    'School',
    'Other',
    'Others',
])

export const association = pgTable('association', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    associationType: associationType('associationType').notNull(),
    logo: text('logo').notNull(),
    about: text('about').notNull(),
})
