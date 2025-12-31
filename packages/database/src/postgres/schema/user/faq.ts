import { relations, sql } from 'drizzle-orm'
import {
    pgTable,
    text,
    uuid,
    timestamp,
    pgEnum,
    numeric,
    integer,
} from 'drizzle-orm/pg-core'
import { entity } from '../tenant/entity/details'

export const faqEnum = pgEnum('module', ['communities', 'events'])
export const moduleFaqs = pgTable('moduleFaqs', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    faqModule: faqEnum('faqModule').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    entity: uuid('entityId').notNull(),
    sort: integer('sort').notNull().default(0),
})
export const moduleFaqsRelations = relations(moduleFaqs, ({ one, many }) => ({
    entity: one(entity, {
        fields: [moduleFaqs.entity],
        references: [entity.id],
    }),
}))
