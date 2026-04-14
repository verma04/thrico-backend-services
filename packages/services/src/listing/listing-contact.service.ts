import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, sql, or, desc } from "drizzle-orm";
import {
  listingContact,
  listingMessage,
  conversation,
  messages,
  marketPlace,
  user,
  chat,
} from "@thrico/database";
import { GamificationEventService } from "../gamification/gamification-event.service";

export class ListingContactService {
  static async hasContactedSeller(db: any, listingId: string, userId: string) {
    try {
      const existingContact = await db.query.listingContact.findFirst({
        where: (contact: any, { eq, and }: any) =>
          and(
            eq(contact.listingId, listingId),
            eq(contact.contactedBy, userId),
          ),
      });

      return !!existingContact;
    } catch (error) {
      log.error("Error in hasContactedSeller", { error, listingId, userId });
      throw error;
    }
  }

  static async getSellerReceivedEnquiries(
    db: any,
    userId: string,
    cursor?: string,
    limit: number = 10,
  ) {
    try {
      const conditions = [eq(listingContact.sellerId, userId)];
      if (cursor) {
        conditions.push(sql`${listingContact.createdAt} < ${new Date(cursor)}`);
      }

      const enquiries = await db
        .select({
          id: listingContact.id,
          createdAt: listingContact.createdAt,
          listing: {
            id: marketPlace.id,
            title: marketPlace.title,
            price: marketPlace.price,
            currency: marketPlace.currency,
          },
          message: {
            id: listingMessage.id,
            content: listingMessage.content,
            createdAt: listingMessage.createdAt,
            isRead: listingMessage.isRead,
          },
          // Unified conversation row (has listingId)
          conversation: {
            id: conversation.id,
            lastMessageAt: conversation.lastMessageAt,
            listingId: conversation.listingId,
          },
          buyer: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
        })
        .from(listingContact)
        .leftJoin(marketPlace, eq(listingContact.listingId, marketPlace.id))
        .leftJoin(user, eq(listingContact.contactedBy, user.id))
        .leftJoin(
          listingMessage,
          eq(listingContact.messageId, listingMessage.id),
        )
        // Join unified conversation via listingContact.conversationId -> conversation.id
        .leftJoin(
          conversation,
          eq(listingContact.conversationId, conversation.id),
        )
        .where(and(...conditions))
        .orderBy(desc(listingContact.createdAt))
        .limit(limit + 1);

      const hasNextPage = enquiries.length > limit;
      const nodes = hasNextPage ? enquiries.slice(0, limit) : enquiries;

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(listingContact)
        .where(eq(listingContact.sellerId, userId));

      const edges = nodes.map((e: any) => ({
        cursor: e.createdAt.toISOString(),
        node: e,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getSellerReceivedEnquiries", { error, userId });
      throw error;
    }
  }

  static async getListingConversationMessages(
    db: any,
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    try {
      // Verify participation via unified conversation table
      const conv = await db.query.conversation.findFirst({
        where: (c: any, { eq, or, and }: any) =>
          and(
            eq(c.id, conversationId),
            or(eq(c.user1Id, userId), eq(c.user2Id, userId)),
          ),
      });

      if (!conv) {
        throw new GraphQLError("Conversation not found or access denied");
      }

      const conditions = [eq(messages.conversationId, conversationId)];
      if (cursor) {
        conditions.push(sql`${messages.createdAt} < ${new Date(cursor)}`);
      }

      const msgs = await db.query.messages.findMany({
        where: (msg: any, { eq, and }: any) => and(...conditions),
        limit: limit + 1,
        with: {
          sender: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      const hasNextPage = msgs.length > limit;
      const nodes = hasNextPage ? msgs.slice(0, limit) : msgs;

      const totalMessages = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      const edges = nodes.map((m: any) => ({
        cursor: m.createdAt.toISOString(),
        node: {
          ...m,
          isMine: m.senderId === userId,
        },
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: totalMessages[0].count,
        // Surface listingId so the UI can show which listing this thread is about
        listingId: conv.listingId ?? null,
      };
    } catch (error) {
      log.error("Error in getListingConversationMessages", {
        error,
        conversationId,
      });
      throw error;
    }
  }

  static async canContactSeller({
    db,
    listingId,
    userId,
  }: {
    db: any;
    listingId: string;
    userId: string;
  }) {
    try {
      if (!listingId || !userId) {
        throw new GraphQLError("Listing ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Checking if user can contact seller", { listingId, userId });

      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace: any, { eq }: any) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          addedBy: true,
          postedBy: true,
          isSold: true,
          isExpired: true,
          isApproved: true,
        },
      });

      if (!listing) {
        return {
          canContact: false,
          reason: "Listing not found",
        };
      }

      if (listing.addedBy === "ENTITY") {
        return {
          canContact: false,
          reason: "Cannot contact seller for entity-added listings",
        };
      }

      if (listing.postedBy === userId) {
        return {
          canContact: false,
          reason: "Cannot contact yourself",
        };
      }

      if (listing.isSold) {
        return {
          canContact: false,
          reason: "This item has been sold",
        };
      }

      if (listing.isExpired) {
        return {
          canContact: false,
          reason: "This listing has expired",
        };
      }

      log.info("User can contact seller", { listingId, userId });
      return {
        canContact: true,
      };
    } catch (error) {
      log.error("Error in canContactSeller", { error, listingId, userId });
      throw error;
    }
  }

  static async contactSeller({
    db,
    entityId,
    input,
  }: {
    db: any;
    entityId: string;
    input: {
      listingId: string;
      message: string;
      buyerId: string;
    };
  }) {
    try {
      const { listingId, message, buyerId } = input;

      if (!entityId || !listingId || !message || !buyerId) {
        throw new GraphQLError(
          "Entity ID, Listing ID, Message, and Buyer ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Contacting seller", { entityId, listingId, buyerId });

      const canContactCheck = await this.canContactSeller({
        db,
        listingId,
        userId: buyerId,
      });

      if (!canContactCheck.canContact) {
        throw new GraphQLError(
          canContactCheck.reason || "Cannot contact seller.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace: any, { eq, and }: any) =>
          and(
            eq(marketPlace.id, listingId),
            eq(marketPlace.entityId, entityId),
          ),
        columns: {
          id: true,
          postedBy: true,
          title: true,
          addedBy: true,
        },
        with: {
          media: true,
        },
      });

      if (!listing || !listing.postedBy) {
        throw new GraphQLError("Listing not found or has no seller.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const existingContact = await db.query.listingContact.findFirst({
        where: (contact: any, { eq, and }: any) =>
          and(
            eq(contact.listingId, listingId),
            eq(contact.contactedBy, buyerId),
          ),
      });

      if (existingContact) {
        log.debug("User already contacted seller", {
          listingId,
          buyerId,
          contactId: existingContact.id,
        });
        return {
          success: true,
          contactId: existingContact.id,
          messageId: existingContact.messageId,
          conversationId: existingContact.conversationId,
          message: "You have already contacted this seller",
        };
      }

      let contactId: string;
      let messageId: string;
      let conversationId: string;

      await db.transaction(async (tx: any) => {
        // Look for an existing unified conversation for this buyer+seller+listing
        let conv = await tx.query.conversation.findFirst({
          where: (c: any, { and, eq }: any) =>
            and(
              eq(c.listingId, listingId),
              eq(c.user1Id, buyerId),
              eq(c.user2Id, listing.postedBy!),
            ),
        });

        if (!conv) {
          const [newConversation] = await tx
            .insert(conversation)
            .values({
              listingId: listingId,
              user1Id: buyerId,
              user2Id: listing.postedBy!,
              entityId: entityId,
              lastMessageAt: new Date(),
            })
            .returning();

          conv = newConversation;
        } else {
          await tx
            .update(conversation)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversation.id, conv.id));
        }

        conversationId = conv.id;

        const [newMessage] = await tx
          .insert(messages)
          .values({
            conversationId: conversationId,
            senderId: buyerId,
            content: message,
            entityId: entityId,
            isRead: false,
          })
          .returning();

        messageId = newMessage.id;

        const [newContact] = await tx
          .insert(listingContact)
          .values({
            listingId: listingId,
            contactedBy: buyerId,
            sellerId: listing.postedBy!,
            conversationId: conversationId,
            messageId: messageId,
          })
          .returning();

        contactId = newContact.id;

        await tx
          .update(marketPlace)
          .set({
            numberOfContactClick: sql`${marketPlace.numberOfContactClick} + 1`,
          })
          .where(eq(marketPlace.id, listingId));

        // Update main chat inbox entry so it floats to the top
        await tx
          .update(chat)
          .set({ updatedAt: new Date() })
          .where(
            and(
              or(
                and(eq(chat.user1, buyerId), eq(chat.user2, listing.postedBy!)),
                and(eq(chat.user1, listing.postedBy!), eq(chat.user2, buyerId)),
              ),
              eq(chat.entity, entityId),
            ),
          );
      });

      log.info("Seller contacted successfully", {
        listingId,
        contactId: contactId!,
      });

      // Trigger Notification
      try {
        const { ListingNotificationPublisher } =
          await import("./listing-notification-publisher");
        const buyer = await db.query.user.findFirst({
          where: (user: any, { eq }: any) => eq(user.id, buyerId),
        });

        await ListingNotificationPublisher.publishListingInquiry({
          db,
          sellerId: listing.postedBy!,
          buyerId,
          listingId,
          listing,
          buyer,
          entityId,
        });
      } catch (notifError) {
        log.error("Error triggering listing contact notification", {
          notifError,
          listingId,
          sellerId: listing.postedBy,
        });
      }

      // Gamification Trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-list-contact",
        moduleId: "listing",
        userId: buyerId,
        entityId,
      });

      return {
        success: true,
        contactId: contactId!,
        messageId: messageId!,
        conversationId: conversationId!,
        message: "Successfully contacted seller",
      };
    } catch (error) {
      log.error("Error in contactSeller", {
        error,
        entityId,
        listingId: input?.listingId,
      });
      throw error;
    }
  }

  static async sendMessage({
    db,
    conversationId,
    senderId,
    content,
    entityId,
  }: {
    db: any;
    conversationId: string;
    senderId: string;
    content: string;
    entityId: string;
  }) {
    try {
      if (!conversationId || !senderId || !content) {
        throw new GraphQLError(
          "Conversation ID, Sender ID, and Content are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Sending message", { conversationId, senderId });

      const conv = await db.query.conversation.findFirst({
        where: (c: any, { eq, and, or }: any) =>
          and(
            eq(c.id, conversationId),
            or(
              eq(c.user1Id, senderId),
              eq(c.user2Id, senderId),
            ),
          ),
      });

      if (!conv) {
        throw new GraphQLError("Conversation not found or unauthorized.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const [newMessage] = await db
        .insert(messages)
        .values({
          conversationId,
          senderId,
          content,
          entityId,
          isRead: false,
        })
        .returning();

      await db.transaction(async (tx: any) => {
        // Update unified conversation
        await tx
          .update(conversation)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversation.id, conversationId));

        // Update main chat inbox entry so it floats to the top
        await tx
          .update(chat)
          .set({ updatedAt: new Date() })
          .where(
            and(
              or(
                and(eq(chat.user1, conv.user1Id), eq(chat.user2, conv.user2Id)),
                and(eq(chat.user1, conv.user2Id), eq(chat.user2, conv.user1Id)),
              ),
              eq(chat.entity, conv.entityId),
            ),
          );
      });

      log.info("Message sent successfully", {
        conversationId,
        senderId,
        messageId: newMessage.id,
      });

      // Trigger notification if this is a listing-linked conversation
      if (conv.listingId) {
        try {
          const { ListingNotificationPublisher } =
            await import("./listing-notification-publisher");

          const recipientId =
            conv.user1Id === senderId ? conv.user2Id : conv.user1Id;

          const listing = await db.query.marketPlace.findFirst({
            where: (l: any, { eq }: any) => eq(l.id, conv.listingId),
            with: { media: true },
          });

          const sender = await db.query.user.findFirst({
            where: (u: any, { eq }: any) => eq(u.id, senderId),
          });

          if (listing) {
            await ListingNotificationPublisher.publishListingMessage({
              recipientId,
              senderId,
              listingId: conv.listingId,
              listing,
              sender,
              message: content,
              db,
              entityId: listing.entityId,
            });
          }
        } catch (notifError) {
          log.error("Error triggering listing message notification", {
            notifError,
            conversationId,
            senderId,
          });
        }
      }

      return newMessage;
    } catch (error) {
      log.error("Error in sendMessage", { error, conversationId, senderId });
      throw error;
    }
  }

  static async markMessagesAsRead({
    db,
    conversationId,
    userId,
  }: {
    db: any;
    conversationId: string;
    userId: string;
  }) {
    try {
      if (!conversationId || !userId) {
        throw new GraphQLError("Conversation ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Marking messages as read", { conversationId, userId });

      const conv = await db.query.conversation.findFirst({
        where: (c: any, { eq, and, or }: any) =>
          and(
            eq(c.id, conversationId),
            or(
              eq(c.user1Id, userId),
              eq(c.user2Id, userId),
            ),
          ),
      });

      if (!conv) {
        throw new GraphQLError("Conversation not found or unauthorized.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      await db
        .update(messages)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.isRead, false),
            sql`${messages.senderId} != ${userId}`,
          ),
        );

      log.info("Messages marked as read", { conversationId, userId });
    } catch (error) {
      log.error("Error in markMessagesAsRead", {
        error,
        conversationId,
        userId,
      });
      throw error;
    }
  }

  static async getUserListingEnquiries({
    db,
    userId,
    cursor,
    limit = 10,
  }: {
    db: any;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user listing enquiries", { userId, cursor, limit });

      const conditions = [eq(listingContact.contactedBy, userId)];
      if (cursor) {
        conditions.push(sql`${listingContact.createdAt} < ${new Date(cursor)}`);
      }

      const enquiries = await db
        .select({
          id: listingContact.id,
          createdAt: listingContact.createdAt,
          listing: {
            id: marketPlace.id,
            title: marketPlace.title,
            price: marketPlace.price,
            currency: marketPlace.currency,
          },
          message: {
            id: listingMessage.id,
            content: listingMessage.content,
            createdAt: listingMessage.createdAt,
            isRead: listingMessage.isRead,
          },
          // Unified conversation row (has listingId)
          conversation: {
            id: conversation.id,
            lastMessageAt: conversation.lastMessageAt,
            listingId: conversation.listingId,
          },
        })
        .from(listingContact)
        .leftJoin(marketPlace, eq(listingContact.listingId, marketPlace.id))
        .leftJoin(
          listingMessage,
          eq(listingContact.messageId, listingMessage.id),
        )
        // Join unified conversation via listingContact.conversationId -> conversation.id
        .leftJoin(
          conversation,
          eq(listingContact.conversationId, conversation.id),
        )
        .where(and(...conditions))
        .orderBy(desc(listingContact.createdAt))
        .limit(limit + 1);

      const hasNextPage = enquiries.length > limit;
      const nodes = hasNextPage ? enquiries.slice(0, limit) : enquiries;

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(listingContact)
        .where(eq(listingContact.contactedBy, userId));

      const edges = nodes.map((e: any) => ({
        cursor: e.createdAt.toISOString(),
        node: e,
      }));

      log.info("User listing enquiries retrieved", {
        userId,
        count: nodes.length,
        total,
      });

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getUserListingEnquiries", { error, userId });
      throw error;
    }
  }
}
