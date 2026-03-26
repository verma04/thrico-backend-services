import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import {
  emailDomain,
  emailTemplate,
  emailUsage,
  emailSubscription,
  emailTopup,
  emailLog,
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
async function incrementUsage(db: any, usageId: string) {
  await db
    .update(emailUsage)
    .set({
      emailsSent: sql`${emailUsage.emailsSent} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(emailUsage.id, usageId));
}

/**
 * Get the sender address for an entity—custom domain or fallback.
 */
async function getSenderAddress(db: any, entityId: string): Promise<string | null> {
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
        const { entity: entityId, db } = auth;

        const domain = await db.query.emailDomain.findFirst({
          where: eq(emailDomain.entity, entityId),
        });

        if (!domain) return null;

        // Build DNS records from stored data
        let dnsRecords = null;
        if (domain.verificationToken) {
          const dkimTokens = domain.dkimTokens
            ? JSON.parse(domain.dkimTokens)
            : [];
          dnsRecords = {
            txtRecord: `_amazonses.${domain.domain}`,
            txtValue: domain.verificationToken,
            dkimRecords: dkimTokens.map((token: string) => ({
              name: `${token}._domainkey.${domain.domain}`,
              value: `${token}.dkim.amazonses.com`,
            })),
            spfRecord: domain.spfRecord || "v=spf1 include:amazonses.com ~all",
          };
        }

        return { ...domain, dnsRecords };
      } catch (error) {
        console.error("getEmailDomain error:", error);
        throw error;
      }
    },

    async verifyEmailDomain(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db } = auth;

        const domain = await db.query.emailDomain.findFirst({
          where: eq(emailDomain.entity, entityId),
        });

        if (!domain) {
          throw new GraphQLError("No email domain found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        return await checkDomainVerificationStatus(domain.domain);
      } catch (error) {
        console.error("verifyEmailDomain error:", error);
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
        console.error("getEmailTemplates error:", error);
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
        console.error("getEmailTemplate error:", error);
        throw error;
      }
    },

    // ── Usage ─────────────────────────────────
    async getEmailUsage(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db } = auth;

        const usage = await getOrCreateUsage(db, entityId);
        const remaining = Math.max(0, usage.numberOfEmailsPerMonth - usage.emailsSent);
        const usagePercent =
          usage.numberOfEmailsPerMonth > 0
            ? Math.round((usage.emailsSent / usage.numberOfEmailsPerMonth) * 100)
            : 0;

        return { ...usage, remaining, usagePercent };
      } catch (error) {
        console.error("getEmailUsage error:", error);
        throw error;
      }
    },

    // ── Subscription ──────────────────────────
    async getEmailSubscription(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(
          auth,
          AdminModule.SUBSCRIPTION,
          PermissionAction.READ,
        );
        const { entity: entityId, db } = auth;

        let sub = await db.query.emailSubscription.findFirst({
          where: eq(emailSubscription.entity, entityId),
        });

        // Auto-create free subscription if none exists
        if (!sub) {
          const [newSub] = await db
            .insert(emailSubscription)
            .values({
              entity: entityId,
              plan: "free",
              numberOfEmailsPerMonth: PLAN_LIMITS.free,
              status: "active",
            })
            .returning();
          sub = newSub;
        }

        return sub;
      } catch (error) {
        console.error("getEmailSubscription error:", error);
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
        console.error("getEmailLogs error:", error);
        throw error;
      }
    },

    // ── Overview ──────────────────────────────
    async getEmailOverview(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.READ);
        const { entity: entityId, db } = auth;

        const [domain, sub, usage, recentEmails] = await Promise.all([
          db.query.emailDomain.findFirst({
            where: eq(emailDomain.entity, entityId),
          }),
          db.query.emailSubscription.findFirst({
            where: eq(emailSubscription.entity, entityId),
          }),
          getOrCreateUsage(db, entityId),
          db.query.emailLog.findMany({
            where: eq(emailLog.entity, entityId),
            orderBy: desc(emailLog.sentAt),
            limit: 10,
          }),
        ]);

        const remaining = usage
          ? Math.max(0, usage.numberOfEmailsPerMonth - usage.emailsSent)
          : 0;
        const usagePercent =
          usage && usage.numberOfEmailsPerMonth > 0
            ? Math.round((usage.emailsSent / usage.numberOfEmailsPerMonth) * 100)
            : 0;

        return {
          domain,
          subscription: sub,
          usage: usage ? { ...usage, remaining, usagePercent } : null,
          recentEmails,
        };
      } catch (error) {
        console.error("getEmailOverview error:", error);
        throw error;
      }
    },
  },

  Mutation: {
    // ── Add Domain ────────────────────────────
    async addEmailDomain(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.CREATE);
        const { entity: entityId, db, id: adminId } = auth;

        // Check if entity already has an email domain
        const existing = await db.query.emailDomain.findFirst({
          where: eq(emailDomain.entity, entityId),
        });

        if (existing) {
          throw new GraphQLError(
            "You already have an email domain configured. Delete it first to add a new one.",
            { extensions: { code: "CONFLICT" } },
          );
        }

        // Register with SES
        const sesResult = await verifyDomainIdentity(input.domain);

        // Save to DB
        const [newDomain] = await db
          .insert(emailDomain)
          .values({
            entity: entityId,
            domain: input.domain,
            verificationToken: sesResult.verificationToken,
            dkimTokens: JSON.stringify(sesResult.dkimTokens),
            spfRecord: sesResult.spfRecord,
            status: "pending",
          })
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.DOMAIN,
          action: "ADD_EMAIL_DOMAIN",
          resourceId: newDomain.id,
          newState: newDomain,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        // Build DNS records for response
        const dnsRecords = {
          txtRecord: sesResult.txtRecord,
          txtValue: sesResult.txtValue,
          dkimRecords: sesResult.dkimRecords,
          spfRecord: sesResult.spfRecord,
        };

        return { ...newDomain, dnsRecords };
      } catch (error) {
        console.error("addEmailDomain error:", error);
        throw error;
      }
    },

    // ── Delete Domain ─────────────────────────
    async deleteEmailDomain(_: any, { id }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.DELETE);
        const { entity: entityId, db, id: adminId } = auth;

        const existing = await db.query.emailDomain.findFirst({
          where: and(
            eq(emailDomain.id, id),
            eq(emailDomain.entity, entityId),
          ),
        });

        if (!existing) {
          throw new GraphQLError("Email domain not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Remove from SES
        try {
          await deleteDomainIdentity(existing.domain);
        } catch (sesErr) {
          console.error("SES delete error (non-blocking):", sesErr);
        }

        // Remove from DB
        await db.delete(emailDomain).where(eq(emailDomain.id, id));

        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.DOMAIN,
          action: "DELETE_EMAIL_DOMAIN",
          resourceId: id,
          previousState: existing,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return { success: true };
      } catch (error) {
        console.error("deleteEmailDomain error:", error);
        throw error;
      }
    },

    // ── Check Verification ────────────────────
    async checkEmailDomainVerification(_: any, __: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.EDIT);
        const { entity: entityId, db, id: adminId } = auth;

        const domain = await db.query.emailDomain.findFirst({
          where: eq(emailDomain.entity, entityId),
        });

        if (!domain) {
          throw new GraphQLError("No email domain found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const verificationResult = await checkDomainVerificationStatus(
          domain.domain,
        );

        if (verificationResult.verified && domain.status !== "verified") {
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
            previousState: { status: domain.status },
            newState: { status: "verified" },
            ipAddress: context.ip,
            userAgent: context.userAgent,
          });
        } else if (
          !verificationResult.verified &&
          verificationResult.status === "Failed"
        ) {
          await db
            .update(emailDomain)
            .set({
              status: "failed",
              updatedAt: new Date(),
            })
            .where(eq(emailDomain.id, domain.id));
        }

        return verificationResult;
      } catch (error) {
        console.error("checkEmailDomainVerification error:", error);
        throw error;
      }
    },

    // ── Send Email ────────────────────────────
    async sendEmail(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.DOMAIN, PermissionAction.EDIT);
        const { entity: entityId, db, id: adminId } = auth;

        // 1. Check subscription is active
        const sub = await db.query.emailSubscription.findFirst({
          where: and(
            eq(emailSubscription.entity, entityId),
            eq(emailSubscription.status, "active"),
          ),
        });

        if (!sub) {
          throw new GraphQLError(
            "No active email subscription. Please subscribe to a plan first.",
            { extensions: { code: "FORBIDDEN" } },
          );
        }

        // 2. Check usage limit
        const usage = await getOrCreateUsage(db, entityId);
        if (usage.emailsSent >= usage.numberOfEmailsPerMonth) {
          throw new GraphQLError(
            "Email quota exceeded. Please upgrade your plan or purchase a top-up.",
            { extensions: { code: "QUOTA_EXCEEDED" } },
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
            html = template.html;
            subject = template.subject;
          }
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
          to: input.to,
          subject,
          html,
        });

        // 6. Log the email
        await db.insert(emailLog).values({
          entity: entityId,
          to: input.to,
          subject,
          senderAddress,
          sesMessageId: sesResult.messageId,
          status: "sent",
        });

        // 7. Increment usage
        await incrementUsage(db, usage.id);

        await createAuditLog(db, {
          adminId,
          entityId,
          module: AdminModule.DOMAIN,
          action: "SEND_EMAIL",
          resourceId: sesResult.messageId,
          newState: {
            to: input.to,
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
        console.error("sendEmail error:", error);
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
        console.error("createEmailTemplate error:", error);
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
        console.error("updateEmailTemplate error:", error);
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
        console.error("deleteEmailTemplate error:", error);
        throw error;
      }
    },

    // ── Subscription ──────────────────────────
    async setEmailSubscription(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(
          auth,
          AdminModule.SUBSCRIPTION,
          PermissionAction.EDIT,
        );
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
        console.error("setEmailSubscription error:", error);
        throw error;
      }
    },

    // ── Top-up ────────────────────────────────
    async addEmailTopup(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(
          auth,
          AdminModule.SUBSCRIPTION,
          PermissionAction.EDIT,
        );
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
        console.error("addEmailTopup error:", error);
        throw error;
      }
    },
  },
};
