"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTopupService = void 0;
const logging_1 = require("@thrico/logging");
const database_1 = require("@thrico/database");
const drizzle_orm_1 = require("drizzle-orm");
// Mock email topup data
const EMAIL_TOPUPS = [
    {
        topupId: "topup_1000",
        countryCode: "IN",
        name: "1,000 Emails Pack",
        numberOfEmails: 1000,
        price: 499.0,
        status: true,
        order: 1,
    },
    {
        topupId: "topup_5000",
        countryCode: "IN",
        name: "5,000 Emails Pack",
        numberOfEmails: 5000,
        price: 1999.0,
        status: true,
        order: 2,
    },
    {
        topupId: "topup_10000",
        countryCode: "IN",
        name: "10,000 Emails Pack",
        numberOfEmails: 10000,
        price: 3499.0,
        status: true,
        order: 3,
    },
    // Default for other countries
    {
        topupId: "topup_global_1000",
        countryCode: "US",
        name: "1,000 Emails Pack",
        numberOfEmails: 1000,
        price: 10.0,
        status: true,
        order: 1,
    },
];
/**
 * Email Topup Service Implementation
 */
exports.emailTopupService = {
    /**
     * Get available email topups for a country
     */
    GetEmailTopups: (call, callback) => {
        try {
            const { countryCode } = call.request;
            logging_1.log.info("GetEmailTopups called", { countryCode });
            const topups = EMAIL_TOPUPS.filter((t) => t.countryCode === countryCode || t.countryCode === "US");
            // Deduplicate by numberOfEmails if needed, or just return all
            callback(null, { topups });
        }
        catch (error) {
            logging_1.log.error("Error in GetEmailTopups", { error: error.message });
            callback(error);
        }
    },
    /**
     * Buy an email topup
     */
    BuyEmailTopup: (call, callback) => {
        try {
            const { entityId, topupId, countryCode } = call.request;
            logging_1.log.info("BuyEmailTopup called", { entityId, topupId, countryCode });
            const topup = EMAIL_TOPUPS.find((t) => t.topupId === topupId);
            if (!topup) {
                callback({
                    code: 5, // NOT_FOUND
                    message: `Topup with ID ${topupId} not found`,
                });
                return;
            }
            // Mock response
            const taxPercentage = countryCode === "IN" ? 18 : 0;
            const taxAmount = (topup.price * taxPercentage) / 100;
            const response = {
                success: true,
                message: "Payment order created",
                billingId: `bill_${Math.random().toString(36).substr(2, 9)}`,
                razorpayOrderId: `order_${Math.random().toString(36).substr(2, 9)}`,
                amount: topup.price,
                taxAmount,
                totalAmount: topup.price + taxAmount,
                currency: countryCode === "IN" ? "INR" : "USD",
                taxName: countryCode === "IN" ? "GST" : "Tax",
                taxPercentage,
            };
            callback(null, response);
        }
        catch (error) {
            logging_1.log.error("Error in BuyEmailTopup", { error: error.message });
            callback(error);
        }
    },
    /**
     * Get current email quota for an entity
     */
    GetEmailQuota: async (call, callback) => {
        try {
            const { entityId } = call.request;
            const db = (0, database_1.getDb)();
            // Get current period usage
            const usage = await db.query.emailUsage.findFirst({
                where: (0, drizzle_orm_1.eq)(database_1.schema.emailUsage.entity, entityId),
                orderBy: (0, drizzle_orm_1.desc)(database_1.schema.emailUsage.periodStart),
            });
            // Get lifetime total used
            const totalResult = await db
                .select({ total: (0, drizzle_orm_1.sql) `COALESCE(SUM(${database_1.schema.emailLog.id}), 0)` })
                .from(database_1.schema.emailLog)
                .where((0, drizzle_orm_1.eq)(database_1.schema.emailLog.entity, entityId));
            const response = {
                entityId,
                balance: usage
                    ? Math.max(0, usage.numberOfEmailsPerMonth - usage.emailsSent)
                    : 1000, // Default free balance if no usage record
                usedThisMonth: usage ? usage.emailsSent : 0,
                totalUsed: Number(totalResult[0]?.total || 0),
            };
            callback(null, response);
        }
        catch (error) {
            logging_1.log.error("Error in GetEmailQuota", { error: error.message });
            callback(error);
        }
    },
    /**
     * Deduct email quota after sending
     */
    DeductEmailQuota: async (call, callback) => {
        try {
            const { entityId, count } = call.request;
            const db = (0, database_1.getDb)();
            const result = await db.transaction(async (tx) => {
                // [A] Get current usage record
                let usage = await tx.query.emailUsage.findFirst({
                    where: (0, drizzle_orm_1.eq)(database_1.schema.emailUsage.entity, entityId),
                    orderBy: (0, drizzle_orm_1.desc)(database_1.schema.emailUsage.periodStart),
                });
                // Auto-create usage if none exists
                if (!usage) {
                    const now = new Date();
                    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    [usage] = await tx
                        .insert(database_1.schema.emailUsage)
                        .values({
                        entity: entityId,
                        emailsSent: 0,
                        numberOfEmailsPerMonth: 1000,
                        periodStart,
                        periodEnd,
                    })
                        .returning();
                }
                const remaining = usage.numberOfEmailsPerMonth - usage.emailsSent;
                if (remaining < count) {
                    return {
                        success: false,
                        message: `Insufficient quota. Remaining: ${remaining}, Requested: ${count}`,
                        remainingQuota: remaining,
                    };
                }
                // [B] Increment used count
                await tx
                    .update(database_1.schema.emailUsage)
                    .set({
                    emailsSent: usage.emailsSent + count,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(database_1.schema.emailUsage.id, usage.id));
                return {
                    success: true,
                    message: "Quota deducted successfully",
                    remainingQuota: remaining - count,
                };
            });
            callback(null, result);
        }
        catch (error) {
            logging_1.log.error("Error in DeductEmailQuota", { error: error.message });
            callback(error);
        }
    },
    /**
     * Get email overview for dashboard
     */
    GetEmailOverview: async (call, callback) => {
        try {
            const { entityId } = call.request;
            const db = (0, database_1.getDb)();
            const [domain, sub, usage, recentLogs] = await Promise.all([
                db.query.emailDomain.findFirst({
                    where: (0, drizzle_orm_1.eq)(database_1.schema.emailDomain.entity, entityId),
                }),
                db.query.emailSubscription.findFirst({
                    where: (0, drizzle_orm_1.eq)(database_1.schema.emailSubscription.entity, entityId),
                }),
                db.query.emailUsage.findFirst({
                    where: (0, drizzle_orm_1.eq)(database_1.schema.emailUsage.entity, entityId),
                    orderBy: (0, drizzle_orm_1.desc)(database_1.schema.emailUsage.periodStart),
                }),
                db.query.emailLog.findMany({
                    where: (0, drizzle_orm_1.eq)(database_1.schema.emailLog.entity, entityId),
                    orderBy: (0, drizzle_orm_1.desc)(database_1.schema.emailLog.sentAt),
                    limit: 10,
                }),
            ]);
            const response = {
                domain: domain?.domain || "",
                subscription: sub
                    ? {
                        subscriptionId: sub.id,
                        planName: sub.plan,
                        planType: sub.plan, // Adjust if you have a separate type
                        billingCycle: "monthly",
                        price: 0, // Should come from plan config
                        startDate: sub.startDate?.toISOString() || "",
                        endDate: sub.endDate?.toISOString() || "",
                        status: sub.status,
                        subscriptionType: "email",
                    }
                    : null,
                usage: {
                    numberOfEmailsPerMonth: usage ? usage.numberOfEmailsPerMonth : 1000,
                    emailsSent: usage ? usage.emailsSent : 0,
                    remaining: usage
                        ? Math.max(0, usage.numberOfEmailsPerMonth - usage.emailsSent)
                        : 1000,
                    usagePercent: usage
                        ? Math.round((usage.emailsSent / usage.numberOfEmailsPerMonth) * 100)
                        : 0,
                },
                recentEmails: recentLogs.map((log) => ({
                    logId: log.id,
                    count: 1, // individual email
                    action: "sent",
                    description: `To: ${log.to} - ${log.subject}`,
                    timestamp: log.sentAt?.toISOString() || "",
                })),
            };
            callback(null, response);
        }
        catch (error) {
            logging_1.log.error("Error in GetEmailOverview", { error: error.message });
            callback(error);
        }
    },
    /**
     * Get billing history for top-ups and subscriptions
     */
    GetBillingHistory: async (call, callback) => {
        try {
            const { entityId } = call.request;
            // Mock history for now
            const history = [
                {
                    billingId: "bill_mock_1",
                    planName: "5,000 Emails Pack",
                    amount: 1999.0,
                    taxAmount: 359.82,
                    totalAmount: 2358.82,
                    currency: "INR",
                    status: "captured",
                    createdAt: new Date().toISOString(),
                    type: "topup",
                },
            ];
            callback(null, { history });
        }
        catch (error) {
            logging_1.log.error("Error in GetBillingHistory", { error: error.message });
            callback(error);
        }
    },
};
//# sourceMappingURL=emailTopupService.js.map