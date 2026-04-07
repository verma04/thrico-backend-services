import { log } from "@thrico/logging";
import { getDb, schema } from "@thrico/database";
import { eq, sql, desc } from "drizzle-orm";

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
export const emailTopupService = {
  /**
   * Get available email topups for a country
   */
  GetEmailTopups: (call: any, callback: any) => {
    try {
      const { countryCode } = call.request;
      log.info("GetEmailTopups called", { countryCode });

      const topups = EMAIL_TOPUPS.filter(
        (t) => t.countryCode === countryCode || t.countryCode === "US"
      );

      // Deduplicate by numberOfEmails if needed, or just return all
      callback(null, { topups });
    } catch (error: any) {
      log.error("Error in GetEmailTopups", { error: error.message });
      callback(error);
    }
  },

  /**
   * Buy an email topup
   */
  BuyEmailTopup: (call: any, callback: any) => {
    try {
      const { entityId, topupId, countryCode } = call.request;
      log.info("BuyEmailTopup called", { entityId, topupId, countryCode });

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
    } catch (error: any) {
      log.error("Error in BuyEmailTopup", { error: error.message });
      callback(error);
    }
  },

  /**
   * Get current email quota for an entity
   */
  GetEmailQuota: async (call: any, callback: any) => {
    try {
      const { entityId } = call.request;
      const db = getDb();

      // Get current period usage
      const usage = await db.query.emailUsage.findFirst({
        where: eq(schema.emailUsage.entity, entityId),
        orderBy: desc(schema.emailUsage.periodStart),
      });

      // Get lifetime total used
      const totalResult = await db
        .select({ total: sql`COALESCE(SUM(${schema.emailLog.id}), 0)` })
        .from(schema.emailLog)
        .where(eq(schema.emailLog.entity, entityId));

      const response = {
        entityId,
        balance: usage
          ? Math.max(0, usage.numberOfEmailsPerMonth - usage.emailsSent)
          : 1000, // Default free balance if no usage record
        usedThisMonth: usage ? usage.emailsSent : 0,
        totalUsed: Number(totalResult[0]?.total || 0),
      };

      callback(null, response);
    } catch (error: any) {
      log.error("Error in GetEmailQuota", { error: error.message });
      callback(error);
    }
  },

  /**
   * Deduct email quota after sending
   */
  DeductEmailQuota: async (call: any, callback: any) => {
    try {
      const { entityId, count } = call.request;
      const db = getDb();

      const result = await db.transaction(async (tx) => {
        // [A] Get current usage record
        let usage = await tx.query.emailUsage.findFirst({
          where: eq(schema.emailUsage.entity, entityId),
          orderBy: desc(schema.emailUsage.periodStart),
        });

        // Auto-create usage if none exists
        if (!usage) {
          const now = new Date();
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          [usage] = await tx
            .insert(schema.emailUsage)
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
          .update(schema.emailUsage)
          .set({
            emailsSent: usage.emailsSent + count,
            updatedAt: new Date(),
          })
          .where(eq(schema.emailUsage.id, usage.id));

        return {
          success: true,
          message: "Quota deducted successfully",
          remainingQuota: remaining - count,
        };
      });

      callback(null, result);
    } catch (error: any) {
      log.error("Error in DeductEmailQuota", { error: error.message });
      callback(error);
    }
  },

  /**
   * Get email overview for dashboard
   */
  GetEmailOverview: async (call: any, callback: any) => {
    try {
      const { entityId } = call.request;
      const db = getDb();

      const [domain, sub, usage, recentLogs] = await Promise.all([
        db.query.emailDomain.findFirst({
          where: eq(schema.emailDomain.entity, entityId),
        }),
        db.query.emailSubscription.findFirst({
          where: eq(schema.emailSubscription.entity, entityId),
        }),
        db.query.emailUsage.findFirst({
          where: eq(schema.emailUsage.entity, entityId),
          orderBy: desc(schema.emailUsage.periodStart),
        }),
        db.query.emailLog.findMany({
          where: eq(schema.emailLog.entity, entityId),
          orderBy: desc(schema.emailLog.sentAt),
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
            ? Math.round(
                (usage.emailsSent / usage.numberOfEmailsPerMonth) * 100
              )
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
    } catch (error: any) {
      log.error("Error in GetEmailOverview", { error: error.message });
      callback(error);
    }
  },
  /**
   * Get billing history for top-ups and subscriptions
   */
  GetBillingHistory: async (call: any, callback: any) => {
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
    } catch (error: any) {
      log.error("Error in GetBillingHistory", { error: error.message });
      callback(error);
    }
  },
};
