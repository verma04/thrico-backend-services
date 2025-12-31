"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payments = exports.paymentStatus = exports.paymentMerchant = exports.paymentsTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.paymentsTypeEnum = (0, pg_core_1.pgEnum)('paymentsType', ['events', 'mentorship']);
exports.paymentMerchant = (0, pg_core_1.pgEnum)('paymentMerchant', ['razorpay', 'stripe']);
exports.paymentStatus = (0, pg_core_1.pgEnum)('paymentStatus ', [
    'refunded',
    'captured',
    'Failed',
]);
exports.payments = (0, pg_core_1.pgTable)('payments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    paymentStatus: (0, exports.paymentStatus)('paymentStatus').notNull(),
    paymentsType: (0, exports.paymentsTypeEnum)('paymentsType').notNull(),
    user: (0, pg_core_1.uuid)('user_id').notNull(),
    entity: (0, pg_core_1.uuid)('entity_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    razorpay_order_id: (0, pg_core_1.text)('razorpay_order_id'),
    razorpay_payment_id: (0, pg_core_1.text)('razorpay_payment_id'),
    razorpay_signature: (0, pg_core_1.text)('razorpay_signature'),
    razorpay_refund_id: (0, pg_core_1.text)('razorpay_refund_id'),
    isRefund: (0, pg_core_1.boolean)('isRefund').notNull().default(false),
    refundGeneratedAt: (0, pg_core_1.timestamp)('refundGeneratedAt'),
    amount: (0, pg_core_1.text)('amount').notNull(),
    currency: (0, pg_core_1.text)('currency').notNull(),
    currencySymbol: (0, pg_core_1.text)('currencySymbol').notNull(),
});
//# sourceMappingURL=index.js.map