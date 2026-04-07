import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import {
  emailDomain,
  emailTemplate,
  emailUsage,
  emailSubscription,
  emailTopup,
  emailLog,
  user,
  userToEntity,
  userVerification,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";
import {
  verifyDomainIdentity,
  checkDomainVerificationStatus,
  sendEmailViaSES,
  deleteDomainIdentity,
} from "../../utils/ses/ses.service";
import {
  verifyDomainDNS,
  DNSVerificationReport,
} from "../../utils/dns/dns.service";
import { log } from "@thrico/logging";
import { emailTopupClient, subscriptionClient } from "@thrico/grpc";
import { EmailService } from "@thrico/services";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const PLAN_LIMITS: Record<string, number> = {
  free: 1000,
  pro: 10000,
  enterprise: 100000, // or custom
};

/**
 * Get or create usage record for the current billing period.
/** */

/**
 * Increment usage count.
 */

/**
 * Get the sender address for an entity—custom domain or fallback.
 */
async function getSenderAddress(
  db: any,
  entityId: string,
): Promise<string | null> {
  const domain = await db.query.emailDomain.findFirst({
    where: and(
      eq(emailDomain.entity, entityId),
      eq(emailDomain.status, "verified"),
    ),
  });

  if (domain) {
    return `noreply@${domain.domain}`;
  }

  return null; // No verified custom domain
}

// ─────────────────────────────────────────────
// Resolvers & Helpers
// ─────────────────────────────────────────────

export async function sendEmailHelper({
  db,
  entityId,
  adminId,
  input,
  ip,
  userAgent,
}: {
  db: any;
  entityId: string;
  adminId: string;
  input: any;
  ip: string;
  userAgent: string;
}) {
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const recipientCount = recipients.length;

  // 2. Check and deduct quota via gRPC
  const quotaResult = await emailTopupClient.deductEmailQuota(
    entityId,
    recipientCount,
  );
  if (!quotaResult.success) {
    throw new GraphQLError(quotaResult.message || "Email quota exceeded.", {
      extensions: { code: "QUOTA_EXCEEDED" },
    });
  }

  // 3. Resolve HTML (from template or direct)
  let html = input.html;
  let subject = input.subject;
  if (input.templateId) {
    const template = await db.query.emailTemplate.findFirst({
      where: and(
        eq(emailTemplate.id, input.templateId),
        eq(emailTemplate.entity, entityId),
      ),
    });
    if (template) {
      html = html || template.html;
      subject = subject || template.subject;
    }
  }

  if (!html || !subject) {
    throw new GraphQLError(
      "Email content is missing. Provide 'html/subject' or a valid 'templateId'.",
      { extensions: { code: "BAD_USER_INPUT" } },
    );
  }

  // 4. Get sender address (verified custom domain required)
  const senderAddress = await getSenderAddress(db, entityId);

  if (!senderAddress) {
    throw new GraphQLError(
      "No verified custom email domain found. Please verify your domain in Settings > Email first.",
      { extensions: { code: "DOMAIN_NOT_VERIFIED" } },
    );
  }

  // 5. Send via SES
  const sesResult = await sendEmailViaSES({
    from: senderAddress,
    bcc: recipients,
    subject,
    html,
  });

  // 6. Log the email
  for (const recipient of recipients) {
    await db.insert(emailLog).values({
      entity: entityId,
      to: recipient,
      subject,
      senderAddress,
      sesMessageId: sesResult.messageId,
      status: "sent",
    });
  }

  await createAuditLog(db, {
    adminId,
    entityId,
    module: AdminModule.DOMAIN,
    action: "SEND_EMAIL",
    resourceId: sesResult.messageId,
    newState: {
      bcc: input.bcc || recipients,
      subject,
      sender: senderAddress,
    },
    ipAddress: ip,
    userAgent: userAgent,
  });

  return {
    success: true,
    messageId: sesResult.messageId,
    message: "Email sent successfully",
  };
}

export const emailResolvers: any = {
  Query: {
    // ── Domain ────────────────────────────────
    async getEmailDomain(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db, id: adminId } = auth;

        const domain = await db.query.emailDomain.findFirst({
          where: eq(emailDomain.entity, entityId),
        });

        // await db.delete(emailTemplate);

        if (!domain) return null;

        // Build DNS records from stored data
        let dnsRecords = null;
        if (domain.verificationToken) {
          const dkimTokens = domain.dkimTokens
            ? JSON.parse(domain.dkimTokens)
            : [];

          // Perform real-time DNS check
          const dnsStatus = await verifyDomainDNS(
            domain.domain,
            domain.verificationToken,
            dkimTokens,
          );

          dnsRecords = {
            txtRecord: `_amazonses.${domain.domain}`,
            txtValue: domain.verificationToken,
            txtVerified: dnsStatus.txtVerified,
            dkimRecords: dnsStatus.dkimRecords,
            spfRecord: domain.spfRecord || "v=spf1 include:amazonses.com ~all",
            spfVerified: dnsStatus.spfVerified,
          };

          // If all verified, update DB status
          if (dnsStatus.allVerified && domain.status !== "verified") {
            await db
              .update(emailDomain)
              .set({
                status: "verified",
                verifiedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(emailDomain.id, domain.id));

            await createAuditLog(db, {
              adminId,
              entityId,
              module: AdminModule.DOMAIN,
              action: "EMAIL_DOMAIN_VERIFIED",
              resourceId: domain.id,
              newState: { status: "verified" },
              ipAddress: context.ip,
              userAgent: context.userAgent,
            });

            // Seed built-in templates
            await EmailService.seedBuiltInTemplates(db, entityId);

            domain.status = "verified";
          }
        }

        log.info("Email domain details", { domain, dnsRecords });

        return { ...domain, dnsRecords };
      } catch (error) {
        log.error("getEmailDomain error:", error);
        throw error;
      }
    },

    // ── Templates ─────────────────────────────
    async getEmailTemplates(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db } = auth;
        // await EmailService.seedBuiltInTemplates(db, entityId);
        return await db.query.emailTemplate.findMany({
          where: eq(emailTemplate.entity, entityId),
          orderBy: desc(emailTemplate.createdAt),
        });
      } catch (error) {
        log.error("getEmailTemplates error:", error);
        throw error;
      }
    },

    async getEmailTemplate(_: any, { id }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db } = auth;

        const template = await db.query.emailTemplate.findFirst({
          where: and(
            eq(emailTemplate.id, id),
            eq(emailTemplate.entity, entityId),
          ),
        });

        if (!template) {
          throw new GraphQLError("Template not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        return template;
      } catch (error) {
        log.error("getEmailTemplate error:", error);
        throw error;
      }
    },

    // ── Usage ─────────────────────────────────
    async getEmailUsage(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId } = auth;

        const result = await emailTopupClient.getEmailQuota(entityId);

        return {
          entity: entityId,
          numberOfEmailsPerMonth: result.balance + result.usedThisMonth,
          emailsSent: result.usedThisMonth,
          remaining: result.balance,
          usagePercent:
            result.balance + result.usedThisMonth > 0
              ? Math.round(
                  (result.usedThisMonth /
                    (result.balance + result.usedThisMonth)) *
                    100,
                )
              : 0,
        };
      } catch (error) {
        log.error("getEmailUsage error:", error);
        throw error;
      }
    },

    // ── Logs ──────────────────────────────────
    async getEmailLogs(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db } = auth;

        const limit = input?.limit || 50;
        const offset = input?.offset || 0;

        return await db.query.emailLog.findMany({
          where: eq(emailLog.entity, entityId),
          orderBy: desc(emailLog.sentAt),
          limit,
          offset,
        });
      } catch (error) {
        log.error("getEmailLogs error:", error);
        throw error;
      }
    },

    // ── Overview ──────────────────────────────
    async getEmailOverview(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db } = auth;

        const response = await emailTopupClient.getEmailOverview(entityId);

        // Map the gRPC response fields (mapped to proto) to the GraphQL schema fields
        return {
          domain: response.domain ? { domain: response.domain } : null,
          subscription: response.subscription
            ? {
                id: response.subscription.subscriptionId,
                entity: entityId,
                plan: response.subscription.planName?.toLowerCase(), // Map gRPC 'planName' to lowercase GraphQL enum
                status: response.subscription.status?.toLowerCase(), // Map status to lowercase if needed
                numberOfEmailsPerMonth: response.usage.numberOfEmailsPerMonth,
                startDate: response.subscription.startDate,
                endDate: response.subscription.endDate,
              }
            : null,
          usage: {
            id: `usage-${entityId}`,
            entity: entityId,
            emailsSent: response.usage.emailsSent,
            numberOfEmailsPerMonth: response.usage.numberOfEmailsPerMonth,
            remaining: response.usage.remaining,
            usagePercent: response.usage.usagePercent,
          },
          recentEmails: (response.recentEmails || []).map((log: any) => ({
            id: log.logId,
            entity: entityId,
            status: log.action,
            subject: log.description,
            sentAt: log.timestamp,
            // These fields are required by EmailLogEntry but limited in proto
            senderAddress: "",
            to: "",
          })),
          billingHistory: response.billingHistory || [],
        };
      } catch (error) {
        log.error("getEmailOverview error:", error);
        throw error;
      }
    },

    async getEmailTopups(_: any, { countryCode }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.READ);

        const response = await emailTopupClient.getEmailTopups(auth?.country);
        return response.topups || [];
      } catch (error) {
        log.error("getEmailTopups error:", error);
        throw error;
      }
    },

    async getEmailTopupHistory(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.READ);
        const { entity: entityId } = auth;

        const response = await emailTopupClient.getBillingHistory(entityId);
        // Map BillingHistoryItem to EmailTopup (legacy) if needed, or just return history
        return (response.history || []).map((h: any) => ({
          id: h.billingId,
          entity: entityId,
          extraEmails: 0, // Should be part of planName or amount
          purchasedAt: h.createdAt,
        }));
      } catch (error) {
        log.error("getEmailTopupHistory error:", error);
        throw error;
      }
    },

    async getEmailUserGroups(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.USERS, PermissionAction.READ);
        const { entity: entityId, db } = auth;

        // 1. All Users
        const allUsersResult = await db
          .select({ email: user.email })
          .from(userToEntity)
          .innerJoin(user, eq(userToEntity.userId, user.id))
          .where(eq(userToEntity.entityId, entityId));

        const allEmails = [
          ...new Set(allUsersResult.map((u: any) => u.email).filter(Boolean)),
        ] as string[];

        // 2. Verified Users (those in userVerification table with isVerified: true)
        const verifiedUsersResult = await db
          .select({ email: user.email })
          .from(userToEntity)
          .innerJoin(user, eq(userToEntity.userId, user.id))
          .innerJoin(
            userVerification,
            eq(userVerification.userId, userToEntity.id),
          )
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              eq(userVerification.isVerified, true),
            ),
          );

        const verifiedEmails = [
          ...new Set(
            verifiedUsersResult.map((u: any) => u.email).filter(Boolean),
          ),
        ] as string[];

        // 3. Pending Users (status: PENDING)
        const pendingUsersResult = await db
          .select({ email: user.email })
          .from(userToEntity)
          .innerJoin(user, eq(userToEntity.userId, user.id))
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              eq(userToEntity.status, "PENDING"),
            ),
          );

        const pendingEmails = [
          ...new Set(
            pendingUsersResult.map((u: any) => u.email).filter(Boolean),
          ),
        ] as string[];

        // 4. Rejected Users (status: REJECTED)
        const rejectedUsersResult = await db
          .select({ email: user.email })
          .from(userToEntity)
          .innerJoin(user, eq(userToEntity.userId, user.id))
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              eq(userToEntity.status, "REJECTED"),
            ),
          );

        const rejectedEmails = [
          ...new Set(
            rejectedUsersResult.map((u: any) => u.email).filter(Boolean),
          ),
        ] as string[];

        return [
          {
            name: "Verified Users",
            emails: verifiedEmails,
            count: verifiedEmails.length,
          },
          { name: "All Users", emails: allEmails, count: allEmails.length },
          {
            name: "Pending Users",
            emails: pendingEmails,
            count: pendingEmails.length,
          },
          {
            name: "Rejected Users",
            emails: rejectedEmails,
            count: rejectedEmails.length,
          },
        ];
      } catch (error) {
        log.error("getEmailUserGroups error:", error);
        throw error;
      }
    },

    // ── Delivery Performance ───────────────────
    async getEmailDeliveryPerformance(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db } = auth;

        // Query the last 7 days of email logs grouped by day-of-week + status
        const since = new Date();
        since.setDate(since.getDate() - 6);
        since.setHours(0, 0, 0, 0);

        const rows = await db
          .select({
            dow: sql<number>`EXTRACT(DOW FROM ${emailLog.sentAt})::int`,
            date: sql<string>`TO_CHAR(${emailLog.sentAt}, 'YYYY-MM-DD')`,
            status: emailLog.status,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(emailLog)
          .where(
            and(eq(emailLog.entity, entityId), gte(emailLog.sentAt, since)),
          )
          .groupBy(
            sql`EXTRACT(DOW FROM ${emailLog.sentAt})`,
            sql`TO_CHAR(${emailLog.sentAt}, 'YYYY-MM-DD')`,
            emailLog.status,
          )
          .orderBy(sql`TO_CHAR(${emailLog.sentAt}, 'YYYY-MM-DD')`);

        // Build a map keyed by date → { sent, delivered }
        const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        // Collect the 7 days (today - 6 days → today) in order
        const days: { label: string; date: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          days.push({
            label: DAY_LABELS[d.getDay()],
            date: d.toISOString().slice(0, 10),
          });
        }

        const dataMap: Record<string, { sent: number; delivered: number }> = {};
        for (const { date } of days) {
          dataMap[date] = { sent: 0, delivered: 0 };
        }

        for (const row of rows) {
          if (!dataMap[row.date]) continue;
          const count = Number(row.count);
          // Any row = sent; rows with status "delivered" = delivered
          dataMap[row.date].sent += count;
          if (row.status === "delivered") {
            dataMap[row.date].delivered += count;
          }
        }

        return days.map(({ label, date }) => ({
          day: label,
          sent: dataMap[date]?.sent ?? 0,
          delivered: dataMap[date]?.delivered ?? 0,
        }));
      } catch (error) {
        log.error("getEmailDeliveryPerformance error:", error);
        throw error;
      }
    },
  },

  Mutation: {
    // ── Add Domain ────────────────────────────

    // ── Send Email ────────────────────────────
    async sendEmail(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.EDIT);
        const { entity: entityId, db, id: adminId } = auth;

        return await sendEmailHelper({
          db,
          entityId,
          adminId,
          input,
          ip: context.ip,
          userAgent: context.userAgent,
        });
      } catch (error) {
        log.error("sendEmail error:", error);
        throw error;
      }
    },

    // ── Templates ─────────────────────────────
    async createEmailTemplate(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.CREATE);
        const { entity: entityId, db, id: adminId } = auth;

        const [template] = await db
          .insert(emailTemplate)
          .values({
            entity: entityId,
            name: input.name,
            slug: input.slug ?? null,
            subject: input.subject,
            html: input.html,
            json: input.json ?? null,
            isDeletable: input.isDeletable ?? true,
          } as any)
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.DOMAIN,
          action: "CREATE_EMAIL_TEMPLATE",
          resourceId: template.id,
          newState: template,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return template;
      } catch (error) {
        log.error("createEmailTemplate error:", error);
        throw error;
      }
    },

    async updateEmailTemplate(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.EDIT);
        const { entity: entityId, db, id: adminId } = auth;

        const existing = await db.query.emailTemplate.findFirst({
          where: and(
            eq(emailTemplate.id, input.id),
            eq(emailTemplate.entity, entityId),
          ),
        });

        if (!existing) {
          throw new GraphQLError("Template not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const updateData: any = { updatedAt: new Date() };
        if (input.name !== undefined) updateData.name = input.name;
        if (input.subject !== undefined) updateData.subject = input.subject;
        if (input.html !== undefined) updateData.html = input.html;
        if (input.json !== undefined) updateData.json = input.json;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.isDeletable !== undefined)
          updateData.isDeletable = input.isDeletable;

        const [updated] = await db
          .update(emailTemplate)
          .set(updateData)
          .where(eq(emailTemplate.id, input.id))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.DOMAIN,
          action: "UPDATE_EMAIL_TEMPLATE",
          resourceId: input.id,
          previousState: existing,
          newState: updated,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return updated;
      } catch (error) {
        log.error("updateEmailTemplate error:", error);
        throw error;
      }
    },

    async deleteEmailTemplate(_: any, { id }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.DELETE);
        const { entity: entityId, db, id: adminId } = auth;

        const existing = await db.query.emailTemplate.findFirst({
          where: and(
            eq(emailTemplate.id, id),
            eq(emailTemplate.entity, entityId),
          ),
        });

        if (!existing) {
          throw new GraphQLError("Template not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if ((existing as any).isDeletable === false) {
          throw new GraphQLError(
            "This template is protected and cannot be deleted.",
            {
              extensions: { code: "FORBIDDEN" },
            },
          );
        }

        await db.delete(emailTemplate).where(eq(emailTemplate.id, id));

        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.DOMAIN,
          action: "DELETE_EMAIL_TEMPLATE",
          resourceId: id,
          previousState: existing,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return { success: true };
      } catch (error) {
        log.error("deleteEmailTemplate error:", error);
        throw error;
      }
    },

    // ── Subscription ──────────────────────────
    async setEmailSubscription(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);
        const { entity: entityId, db, id: adminId } = auth;

        const limit = PLAN_LIMITS[input.plan] || PLAN_LIMITS.free;

        // Upsert subscription
        const existing = await db.query.emailSubscription.findFirst({
          where: eq(emailSubscription.entity, entityId),
        });

        let sub;
        if (existing) {
          [sub] = await db
            .update(emailSubscription)
            .set({
              plan: input.plan,
              numberOfEmailsPerMonth: limit,
              status: "active",
              updatedAt: new Date(),
            })
            .where(eq(emailSubscription.id, existing.id))
            .returning();
        } else {
          [sub] = await db
            .insert(emailSubscription)
            .values({
              entity: entityId,
              plan: input.plan,
              numberOfEmailsPerMonth: limit,
              status: "active",
            })
            .returning();
        }

        // Also update the current usage record limit if one exists
        const currentUsage = await db.query.emailUsage.findFirst({
          where: eq(emailUsage.entity, entityId),
          orderBy: desc(emailUsage.periodStart),
        });
        if (currentUsage) {
          await db
            .update(emailUsage)
            .set({ numberOfEmailsPerMonth: limit, updatedAt: new Date() })
            .where(eq(emailUsage.id, currentUsage.id));
        }

        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.SUBSCRIPTION,
          action: "SET_EMAIL_SUBSCRIPTION",
          resourceId: sub.id,
          previousState: existing || null,
          newState: sub,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return sub;
      } catch (error) {
        log.error("setEmailSubscription error:", error);
        throw error;
      }
    },

    // ── Top-up ────────────────────────────────
    async addEmailTopup(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);
        const { entity: entityId, db, id: adminId } = auth;

        // Create topup record
        const [topup] = await db
          .insert(emailTopup)
          .values({
            entity: entityId,
            extraEmails: input.extraEmails,
          })
          .returning();

        // Update current usage limit
        const currentUsage = await db.query.emailUsage.findFirst({
          where: eq(emailUsage.entity, entityId),
          orderBy: desc(emailUsage.periodStart),
        });
        if (currentUsage) {
          await db
            .update(emailUsage)
            .set({
              numberOfEmailsPerMonth: sql`${emailUsage.numberOfEmailsPerMonth} + ${input.extraEmails}`,
              updatedAt: new Date(),
            })
            .where(eq(emailUsage.id, currentUsage.id));
        }

        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.SUBSCRIPTION,
          action: "ADD_EMAIL_TOPUP",
          resourceId: topup.id,
          newState: topup,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return topup;
      } catch (error) {
        log.error("addEmailTopup error:", error);
        throw error;
      }
    },

    async buyEmailTopup(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);
        const { entity: entityId } = auth;

        const response = await emailTopupClient.buyEmailTopup({
          entityId,
          topupId: input.topupId,
          countryCode: auth?.country,
        });

        return response;
      } catch (error) {
        log.error("buyEmailTopup error:", error);
        throw error;
      }
    },
    async verifyEmailTopupPayment(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);

        const result = await subscriptionClient.verifyRazorpayPayment(
          input.razorpayOrderId,
          input.razorpayPaymentId,
          input.razorpaySignature,
        );

        return result;
      } catch (error) {
        log.error("verifyEmailTopupPayment error:", error);
        throw error;
      }
    },
  },
};
