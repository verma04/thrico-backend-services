import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { contact } from "@thrico/database";
import { and, eq, gte, sql, desc, count } from "drizzle-orm";

export class ContactService {
  static async getContactStats(db: any, entityId: string) {
    try {
      // Total Inquiries
      const [totalCount] = await db
        .select({ value: count() })
        .from(contact)
        .where(eq(contact.entityId, entityId));

      // Resolved Inquiries
      const [resolvedCount] = await db
        .select({ value: count() })
        .from(contact)
        .where(and(eq(contact.entityId, entityId), eq(contact.status, "RESOLVED")));

      // Last 24 hours peak frequency (simplified: messages in last 24h)
      const last24h = new Date();
      last24h.setDate(last24h.getDate() - 1);
      const [peakFreq] = await db
        .select({ value: count() })
        .from(contact)
        .where(and(eq(contact.entityId, entityId), gte(contact.createdAt, last24h)));

      const responseRate = totalCount.value > 0 ? (resolvedCount.value / totalCount.value) * 100 : 100;

      return {
        totalInquiries: totalCount.value,
        resolvedInquiries: resolvedCount.value,
        responseRate: Math.round(responseRate * 10) / 10,
        peakFrequency: Math.ceil(peakFreq.value / 24), // hourly average for peak day
      };
    } catch (error) {
      log.error("Error in getContactStats", { error, entityId });
      throw error;
    }
  }

  static async updateContactStatus(
    db: any,
    {
      id,
      entityId,
      status,
    }: {
      id: string;
      entityId: string;
      status: string;
    },
  ) {
    try {
      const [updated] = await db
        .update(contact)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(contact.id, id), eq(contact.entityId, entityId)))
        .returning();

      if (!updated) {
        throw new GraphQLError("Contact message not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return updated;
    } catch (error) {
      log.error("Error in updateContactStatus", { error, id, status });
      throw error;
    }
  }

  static async getAllContacts(
    db: any,
    {
      entityId,
      limit = 10,
      cursor,
    }: {
      entityId: string;
      limit?: number;
      cursor?: string;
    },
  ) {
    try {
      const conditions = [eq(contact.entityId, entityId)];
      if (cursor) {
        conditions.push(sql`${contact.createdAt} < ${new Date(cursor)}`);
      }

      const contacts = await db.query.contact.findMany({
        where: and(...conditions),
        orderBy: [desc(contact.createdAt)],
        limit: limit + 1,
        with: {
          user: {
            with: {
              user: true,
            },
          },
        },
      });

      const hasNextPage = contacts.length > limit;
      const nodes = hasNextPage ? contacts.slice(0, limit) : contacts;

      return {
        nodes,
        pageInfo: {
          hasNextPage,
          endCursor: nodes.length > 0 ? nodes[nodes.length - 1].createdAt : null,
        },
      };
    } catch (error) {
      log.error("Error in getAllContacts", { error, entityId });
      throw error;
    }
  }

  static async sendContactMessage(
    db: any,
    {
      subject,
      message,
      userId,
      entityId,
    }: {
      subject: string;
      message: string;
      userId: string;
      entityId: string;
    },
  ) {
    try {
      if (!subject || !message) {
        throw new GraphQLError("Subject and message are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Check for 3-day limit
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const lastContact = await db.query.contact.findFirst({
        where: (c: any, { and, eq, gte }: any) =>
          and(
            eq(c.userId, userId),
            eq(c.entityId, entityId),
            gte(c.createdAt, threeDaysAgo),
          ),
      });

      if (lastContact) {
        throw new GraphQLError(
          "You can only send a contact message once every 3 days.",
          {
            extensions: { code: "RATE_LIMITED" },
          },
        );
      }

      log.debug("Sending contact message", { subject, userId, entityId });

      const [newContact] = await db
        .insert(contact)
        .values({
          subject,
          message,
          userId,
          entityId,
        })
        .returning();

      log.info("Contact message sent successfully", {
        contactId: newContact.id,
      });

      return {
        success: true,
        message: "Your message has been sent successfully.",
      };
    } catch (error) {
      log.error("Error in sendContactMessage", { error, subject, userId });
      throw error;
    }
  }
}
