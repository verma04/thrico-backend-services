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
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'


export const paymentsTypeEnum = pgEnum('paymentsType', ['events', 'mentorship'])

export const paymentMerchant = pgEnum('paymentMerchant', ['razorpay', 'stripe'])

export const paymentStatus = pgEnum('paymentStatus ', [
    'refunded',
    'captured',
    'Failed',
])
export const payments = pgTable('payments', {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentStatus: paymentStatus('paymentStatus').notNull(),
    paymentsType: paymentsTypeEnum('paymentsType').notNull(),
    user: uuid('user_id').notNull(),
    entity: uuid('entity_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    razorpay_order_id: text('razorpay_order_id'),
    razorpay_payment_id: text('razorpay_payment_id'),
    razorpay_signature: text('razorpay_signature'),
    razorpay_refund_id: text('razorpay_refund_id'),
    isRefund: boolean('isRefund').notNull().default(false),
    refundGeneratedAt: timestamp('refundGeneratedAt'),
    amount: text('amount').notNull(),
    currency: text('currency').notNull(),
    currencySymbol: text('currencySymbol').notNull(),
})
