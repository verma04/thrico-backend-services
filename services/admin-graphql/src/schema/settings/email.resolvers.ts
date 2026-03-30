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
 */
async function getOrCreateUsage(db: any, entityId: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Find existing usage for this period
  let usage = await db.query.emailUsage.findFirst({
    where: and(
      eq(emailUsage.entity, entityId),
      gte(emailUsage.periodStart, periodStart),
    ),
  });

  if (!usage) {
    // Get subscription limit
    const sub = await db.query.emailSubscription.findFirst({
      where: and(
        eq(emailSubscription.entity, entityId),
        eq(emailSubscription.status, "active"),
      ),
    });

    // Get top-ups for this entity
    const topups = await db
      .select({ total: sql`COALESCE(SUM(${emailTopup.extraEmails}), 0)` })
      .from(emailTopup)
      .where(eq(emailTopup.entity, entityId));

    const baseLimit = sub ? sub.numberOfEmailsPerMonth : PLAN_LIMITS.free;
    const topupTotal = Number(topups[0]?.total || 0);

    const [newUsage] = await db
      .insert(emailUsage)
      .values({
        entity: entityId,
        emailsSent: 0,
        numberOfEmailsPerMonth: baseLimit + topupTotal,
        periodStart,
        periodEnd,
      })
      .returning();

    usage = newUsage;
  }

  return usage;
}

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
// Resolvers
// ─────────────────────────────────────────────

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

        console.log(domain);

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
        const { entity: entityId, db } = auth;

        return await db.query.emailTopup.findMany({
          where: eq(emailTopup.entity, entityId),
          orderBy: desc(emailTopup.createdAt),
        });
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
  },

  Mutation: {
    // ── Add Domain ────────────────────────────

    // ── Send Email ────────────────────────────
    async sendEmail(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.EDIT);
        const { entity: entityId, db, id: adminId } = auth;

        // 1. Check subscription is active
        // const sub = await db.query.emailSubscription.findFirst({
        //   where: and(
        //     eq(emailSubscription.entity, entityId),
        //     eq(emailSubscription.status, "active"),
        //   ),
        // });

        // if (!sub) {
        //   throw new GraphQLError(
        //     "No active email subscription. Please subscribe to a plan first.",
        //     { extensions: { code: "FORBIDDEN" } },
        //   );
        // }

        const recipients = Array.isArray(input.to) ? input.to : [input.to];
        const recipientCount = recipients.length;

        // 2. Check and deduct quota via gRPC
        const quotaResult = await emailTopupClient.deductEmailQuota(
          entityId,
          recipientCount,
        );
        if (!quotaResult.success) {
          throw new GraphQLError(
            quotaResult.message || "Email quota exceeded.",
            {
              extensions: { code: "QUOTA_EXCEEDED" },
            },
          );
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
        // Log individual recipients
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
            bcc: input.bcc,
            subject,
            sender: senderAddress,
          },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return {
          success: true,
          messageId: sesResult.messageId,
          message: "Email sent successfully",
        };
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
            subject: input.subject,
            html: input.html,
            json: input.json ?? null,
          })
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
