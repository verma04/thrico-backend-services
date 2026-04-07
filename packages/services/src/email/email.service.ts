import AWS from "aws-sdk";
import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq } from "drizzle-orm";
import { emailDomain, emailTemplate, emailLog } from "@thrico/database";
import { emailTopupClient } from "@thrico/grpc";
export const BUILT_IN_TEMPLATES = [
  {
    name: "New Member Welcome",
    slug: "new-member-welcome",
    subject: "Welcome to {{entity_name}}!",
    json: JSON.stringify([
      {
        id: "h1",
        type: "header",
        content: "",
        align: "center",
        bold: false,
        italic: false,
        underline: false,
        fontSize: 14,
        color: "#1e293b",
        bgColor: "transparent",
        href: "",
        spacerSize: "md",
        imageAlt: "",
        logoUrl: "https://cdn.thrico.network/thrico.png",
        secondaryContent: "Community Hub",
      },
      {
        id: "he1",
        type: "heading",
        content: "Welcome to our Community! 🤝",
        align: "center",
        bold: true,
        italic: false,
        underline: false,
        fontSize: 32,
        color: "#1e293b",
        bgColor: "transparent",
        href: "",
        spacerSize: "md",
        imageAlt: "",
        logoUrl: "",
      },
      {
        id: "i1",
        type: "image",
        content:
          "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200",
        align: "center",
        bold: false,
        italic: false,
        underline: false,
        fontSize: 14,
        color: "#1e293b",
        bgColor: "transparent",
        href: "",
        spacerSize: "md",
        imageAlt: "Community Members",
        logoUrl: "",
      },
      {
        id: "t1",
        type: "text",
        content:
          "We're thrilled to have you here! Our community is a space for innovators, creators, and leaders to connect and grow together. You've just unlocked access to our exclusive forums, events, and resources.",
        align: "center",
        bold: false,
        italic: false,
        underline: false,
        fontSize: 15,
        color: "#475569",
        bgColor: "transparent",
        href: "",
        spacerSize: "md",
        imageAlt: "",
        logoUrl: "",
      },
      {
        id: "s1",
        type: "spacer",
        content: "",
        align: "left",
        bold: false,
        italic: false,
        underline: false,
        fontSize: 14,
        color: "#1e293b",
        bgColor: "transparent",
        href: "",
        spacerSize: "sm",
        imageAlt: "",
        logoUrl: "",
      },
      {
        id: "b1",
        type: "button",
        content: "Complete Your Profile",
        align: "center",
        bold: true,
        italic: false,
        underline: false,
        fontSize: 14,
        color: "#ffffff",
        bgColor: "#6366f1",
        href: "https://thrico.network/onboarding",
        spacerSize: "md",
        imageAlt: "",
        logoUrl: "",
      },
      {
        id: "divider1",
        type: "divider",
        content: "",
        align: "left",
        bold: false,
        italic: false,
        underline: false,
        fontSize: 14,
        color: "#1e293b",
        bgColor: "transparent",
        href: "",
        spacerSize: "md",
        imageAlt: "",
        logoUrl: "",
      },
      {
        id: "t2",
        type: "text",
        content:
          "Need help getting started? Check out our Getting Started guide or reply to this email to reach our support team.",
        align: "center",
        bold: false,
        italic: false,
        underline: false,
        fontSize: 12,
        color: "#94a3b8",
        bgColor: "transparent",
        href: "",
        spacerSize: "md",
        imageAlt: "",
        logoUrl: "",
      },
      {
        id: "f1",
        type: "footer",
        content:
          "You are receiving this because you joined the Thrico Network community ecosystem. To manage your notification settings, please visit your dashboard preferences.",
        align: "center",
        bold: false,
        italic: false,
        underline: false,
        fontSize: 14,
        color: "#1e293b",
        bgColor: "transparent",
        href: "",
        spacerSize: "md",
        imageAlt: "",
        logoUrl: "",
      },
    ]),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to the community!</h2>
        <p>Hi there,</p>
        <p>We are excited to have you as a new member of <strong>{{entity_name}}</strong>.</p>
        <p>You can now access all the features and connect with other members.</p>
        <div style="margin: 30px 0;">
          <a href="{{login_url}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to your account</a>
        </div>
        <p>If you have any questions, feel free to reply to this email.</p>
        <p>Best regards,<br/>The {{entity_name}} Team</p>
      </div>
    `,
    isActive: true,
    isDeletable: false,
  },
];

const ses = new AWS.SES({
  region: process.env.AWS_REGION || "ap-south-1",
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
});

export class EmailService {
  /**
   * Verify a custom domain identity with SES.
   */
  static async verifyDomainIdentity(domain: string) {
    try {
      const verifyResult = await ses
        .verifyDomainIdentity({ Domain: domain })
        .promise();
      const verificationToken = verifyResult.VerificationToken;

      const dkimResult = await ses
        .verifyDomainDkim({ Domain: domain })
        .promise();
      const dkimTokens = dkimResult.DkimTokens;

      return {
        verificationToken,
        dkimTokens,
        txtRecord: `_amazonses.${domain}`,
        txtValue: verificationToken,
        dkimRecords: dkimTokens.map((token) => ({
          name: `${token}._domainkey.${domain}`,
          value: `${token}.dkim.amazonses.com`,
        })),
        spfRecord: `v=spf1 include:amazonses.com ~all`,
      };
    } catch (error) {
      log.error(`SES verifyDomainIdentity error for domain ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Check domain verification status in SES.
   */
  static async checkDomainVerificationStatus(domain: string) {
    try {
      const result = await ses
        .getIdentityVerificationAttributes({ Identities: [domain] })
        .promise();
      const status =
        result.VerificationAttributes[domain]?.VerificationStatus ||
        "NotStarted";

      return {
        domain,
        status, // Pending | Success | Failed | TemporaryFailure | NotStarted
        verified: status === "Success",
      };
    } catch (error) {
      log.error(
        `SES checkDomainVerificationStatus error for ${domain}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete a domain identity from SES.
   */
  static async deleteDomainIdentity(domain: string) {
    try {
      await ses.deleteIdentity({ Identity: domain }).promise();
      return { success: true };
    } catch (error) {
      log.error(`SES deleteDomainIdentity error for ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Get sender address for an entity.
   */
  static async getSenderAddress(
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
    return null;
  }

  /**
   * Send an email using SES and handle quotas/templates.
   */
  static async sendEmail(params: { db: any; entityId: string; input: any }) {
    const { db, entityId, input } = params;
    const recipients = Array.isArray(input.to) ? input.to : [input.to];
    const recipientCount = recipients.length;

    // 1. Check and deduct quota via gRPC
    const quotaResult = await emailTopupClient.deductEmailQuota(
      entityId,
      recipientCount,
    );
    if (!quotaResult.success) {
      throw new GraphQLError(quotaResult.message || "Email quota exceeded.", {
        extensions: { code: "QUOTA_EXCEEDED" },
      });
    }

    // 2. Resolve HTML (from template or direct)
    let html = input.html;
    let subject = input.subject;
    if (input.templateId || input.templateSlug) {
      const condition = input.templateId
        ? eq(emailTemplate.id, input.templateId)
        : eq(emailTemplate.slug, input.templateSlug);

      const template = await db.query.emailTemplate.findFirst({
        where: and(condition, eq(emailTemplate.entity, entityId)),
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

    // Replace placeholders
    if (input.variables) {
      const vars = input.variables;
      for (const key in vars) {
        const regex = new RegExp(`{{${key}}}`, "g");
        html = html.replace(regex, vars[key]);
        subject = subject.replace(regex, vars[key]);
      }
    }

    // 3. Get sender address
    const senderAddress = await this.getSenderAddress(db, entityId);
    if (!senderAddress) {
      throw new GraphQLError(
        "No verified custom email domain found. Please verify your domain in Settings > Email first.",
        { extensions: { code: "DOMAIN_NOT_VERIFIED" } },
      );
    }

    // 4. Send via SES
    let messageId: string | undefined;
    try {
      const bccAddresses = recipients;
      const result = await ses
        .sendEmail({
          Source: senderAddress,
          Destination: {
            ToAddresses: [senderAddress],
            BccAddresses: bccAddresses,
          },
          Message: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: html, Charset: "UTF-8" } },
          },
        })
        .promise();
      messageId = result.MessageId;
    } catch (error) {
      log.error("SES sendEmail error:", error);
      throw error;
    }

    // 5. Log the email
    for (const recipient of recipients) {
      await db.insert(emailLog).values({
        entity: entityId,
        to: recipient,
        subject,
        senderAddress,
        sesMessageId: messageId,
        status: "sent",
      });
    }

    return {
      success: true,
      messageId,
      message: "Email sent successfully",
      senderAddress,
      subject,
      bcc: input.bcc || recipients,
    };
  }

  /**
   * Seed built-in templates for an entity.
   */
  static async seedBuiltInTemplates(db: any, entityId: string) {
    try {
      log.info(`Seeding built-in templates for entity: ${entityId}`);
      for (const template of BUILT_IN_TEMPLATES) {
        const existing = await db.query.emailTemplate.findFirst({
          where: and(
            eq(emailTemplate.entity, entityId),
            template.slug
              ? eq(emailTemplate.slug, template.slug)
              : eq(emailTemplate.name, template.name),
          ),
        });

        if (!existing) {
          await db.insert(emailTemplate).values({
            entity: entityId,
            name: template.name,
            slug: template.slug || null,
            subject: template.subject,
            html: template.html,
            json: (template as any).json || null,
            isDeletable: template.isDeletable,
            isActive: template.isActive,
          });
          log.info(
            `Created built-in template: ${template.name} (${template.slug})`,
          );
        }
      }
    } catch (error) {
      log.error(`Error seeding templates for entity ${entityId}:`, error);
    }
  }
}
