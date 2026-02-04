import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, sql, or, desc } from "drizzle-orm";
import {
  listingContact,
  listingConversation,
  listingMessage,
  marketPlace,
  user,
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
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const offset = (page - 1) * limit;

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
          conversation: {
            id: listingConversation.id,
            lastMessageAt: listingConversation.lastMessageAt,
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
        .leftJoin(
          listingConversation,
          eq(listingContact.conversationId, listingConversation.id),
        )
        .where(eq(listingContact.sellerId, userId))
        .orderBy(desc(listingContact.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(listingContact)
        .where(eq(listingContact.sellerId, userId));

      return {
        enquiries: enquiries.map((e: any) => ({
          ...e,
          buyer: e.buyer,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
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
    page: number = 1,
    limit: number = 50,
  ) {
    try {
      const offset = (page - 1) * limit;

      // First verify participation
      const conversation = await db.query.listingConversation.findFirst({
        where: (conv: any, { eq, or, and }: any) =>
          and(
            eq(conv.id, conversationId),
            or(eq(conv.buyerId, userId), eq(conv.sellerId, userId)),
          ),
      });

      if (!conversation) {
        throw new GraphQLError("Conversation not found or access denied");
      }

      const messages = await db.query.listingMessage.findMany({
        where: (msg: any, { eq }: any) =>
          eq(msg.conversationId, conversationId),
        orderBy: (msg: any, { desc }: any) => [desc(msg.createdAt)],
        limit: limit,
        offset: offset,
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

      const totalMessages = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(listingMessage)
        .where(eq(listingMessage.conversationId, conversationId));

      return {
        messages: messages.map((m: any) => ({
          ...m,
          isMine: m.senderId === userId,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMessages[0].count / limit),
          totalCount: totalMessages[0].count,
          limit,
          hasNextPage: page < Math.ceil(totalMessages[0].count / limit),
          hasPreviousPage: page > 1,
        },
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
        let conversation = await tx.query.listingConversation.findFirst({
          where: (conv: any, { and, eq }: any) =>
            and(
              eq(conv.listingId, listingId),
              eq(conv.buyerId, buyerId),
              eq(conv.sellerId, listing.postedBy!),
            ),
        });

        if (!conversation) {
          const [newConversation] = await tx
            .insert(listingConversation)
            .values({
              listingId: listingId,
              buyerId: buyerId,
              sellerId: listing.postedBy!,
              lastMessageAt: new Date(),
            })
            .returning();

          conversation = newConversation;
        } else {
          await tx
            .update(listingConversation)
            .set({ lastMessageAt: new Date() })
            .where(eq(listingConversation.id, conversation.id));
        }

        conversationId = conversation.id;

        const [newMessage] = await tx
          .insert(listingMessage)
          .values({
            conversationId: conversationId,
            senderId: buyerId,
            content: message,
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
      });

      log.info("Seller contacted successfully", {
        listingId,
        contactId: contactId!,
      });

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
  }: {
    db: any;
    conversationId: string;
    senderId: string;
    content: string;
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

      const conv = await db.query.listingConversation.findFirst({
        where: (conversation: any, { eq, and, or }: any) =>
          and(
            eq(conversation.id, conversationId),
            or(
              eq(conversation.buyerId, senderId),
              eq(conversation.sellerId, senderId),
            ),
          ),
      });

      if (!conv) {
        throw new GraphQLError("Conversation not found or unauthorized.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const [newMessage] = await db
        .insert(listingMessage)
        .values({
          conversationId,
          senderId,
          content,
          isRead: false,
        })
        .returning();

      await db
        .update(listingConversation)
        .set({ lastMessageAt: new Date() })
        .where(eq(listingConversation.id, conversationId));

      log.info("Message sent successfully", {
        conversationId,
        senderId,
        messageId: newMessage.id,
      });

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

      const conv = await db.query.listingConversation.findFirst({
        where: (conversation: any, { eq, and, or }: any) =>
          and(
            eq(conversation.id, conversationId),
            or(
              eq(conversation.buyerId, userId),
              eq(conversation.sellerId, userId),
            ),
          ),
      });

      if (!conv) {
        throw new GraphQLError("Conversation not found or unauthorized.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      await db
        .update(listingMessage)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(listingMessage.conversationId, conversationId),
            eq(listingMessage.isRead, false),
            sql`${listingMessage.senderId} != ${userId}`,
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
    page = 1,
    limit = 10,
  }: {
    db: any;
    userId: string;
    page?: number;
    limit?: number;
  }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user listing enquiries", { userId, page, limit });

      const offset = (page - 1) * limit;

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
          conversation: {
            id: listingConversation.id,
            lastMessageAt: listingConversation.lastMessageAt,
          },
        })
        .from(listingContact)
        .leftJoin(marketPlace, eq(listingContact.listingId, marketPlace.id))
        .leftJoin(
          listingMessage,
          eq(listingContact.messageId, listingMessage.id),
        )
        .leftJoin(
          listingConversation,
          eq(listingContact.conversationId, listingConversation.id),
        )
        .where(eq(listingContact.contactedBy, userId))
        .orderBy(desc(listingContact.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(listingContact)
        .where(eq(listingContact.contactedBy, userId));

      log.info("User listing enquiries retrieved", {
        userId,
        count: enquiries.length,
        total,
      });

      return {
        enquiries,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      log.error("Error in getUserListingEnquiries", { error, userId });
      throw error;
    }
  }
}
