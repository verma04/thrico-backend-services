import {
  chat,
  connections,
  messages,
  conversation,
  marketPlace,
  marketPlaceMedia,
  userToEntity,
  user,
} from "@thrico/database";
import { and, asc, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";
import { ModerationPublisher } from "../utils/moderation-publisher";

// ─── Cursor helpers ────────────────────────────────────────────────────────────
// Cursor = base64(ISO-timestamp of createdAt). Stable and monotonic.
function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString("base64");
}
function decodeCursor(cursor: string): Date {
  return new Date(Buffer.from(cursor, "base64").toString("utf8"));
}

export class ChatService {
  constructor(private db: any) {}

  /**
   * Get profile details for a chat thread header.
   * Returns the other participant's name, avatar, online/lastActive status,
   * and listing info if this is a marketplace conversation.
   */
  async getChatProfile({
    chatId,
    currentUserId,
  }: {
    chatId: string;
    currentUserId: string;
  }) {
    try {
      // 1. Find the chat row with both participants + their user data
      const chatRow = await this.db.query.chat.findFirst({
        where: and(
          eq(chat.id, chatId),
          or(eq(chat.user1, currentUserId), eq(chat.user2, currentUserId)),
        ),
        with: {
          user1: {
            with: {
              user: {
                columns: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  email: true,
                },
                with: { about: true },
              },
            },
          },
          user2: {
            with: {
              user: {
                columns: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  email: true,
                },
                with: { about: true },
              },
            },
          },
        },
      });

      if (!chatRow) {
        throw new GraphQLError("Chat not found or access denied", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // 2. Determine the "other" participant
      const isUser1 = chatRow.user1?.id === currentUserId;
      const otherUserEntity = isUser1 ? chatRow.user2 : chatRow.user1;
      const otherUser = otherUserEntity?.user;

      if (!otherUser) {
        throw new GraphQLError("Other participant not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // 3. Get online / lastActive from userToEntity
      const otherEntityRow = await this.db.query.userToEntity.findFirst({
        where: eq(userToEntity.id, otherUserEntity.id),
        columns: {
          isOnline: true,
          lastActive: true,
        },
      });

      // 4. If this is a MARKETPLACE chat, find the linked listing
      let listing = null;
      if (chatRow.chatType === "MARKETPLACE") {
        // Try to find the conversation row that links the listing
        const convRow = await this.db.query.conversation.findFirst({
          where: and(
            or(
              and(
                eq(conversation.user1Id, chatRow.user1?.userId),
                eq(conversation.user2Id, chatRow.user2?.userId),
              ),
              and(
                eq(conversation.user1Id, chatRow.user2?.userId),
                eq(conversation.user2Id, chatRow.user1?.userId),
              ),
            ),
            // Only ones with a listing
          ),
          with: {
            listing: {
              columns: {
                id: true,
                title: true,
                price: true,
                currency: true,
                slug: true,
                isSold: true,
              },
              with: {
                media: {
                  columns: { url: true },
                  limit: 1,
                },
              },
            },
          },
        });

        if (convRow?.listing) {
          listing = {
            id: convRow.listing.id,
            title: convRow.listing.title,
            price: convRow.listing.price,
            currency: convRow.listing.currency,
            slug: convRow.listing.slug,
            isSold: convRow.listing.isSold,
            image: convRow.listing.media?.[0]?.url ?? null,
          };
        }
      }

      return {
        chatId: chatRow.id,
        chatType: chatRow.chatType,
        user: {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          avatar: otherUser.avatar,
          headline: otherUser.about?.headline ?? null,
        },
        isOnline: otherEntityRow?.isOnline ?? false,
        lastActive: otherEntityRow?.lastActive ?? null,
        listing,
      };
    } catch (error) {
      log.error("getChatProfile failed", { error, chatId, currentUserId });
      throw error;
    }
  }

  async getAllMessages({
    id,
    currentUserId,
    first = 20,
    after,
  }: {
    id: string;
    currentUserId: string;
    first?: number;
    after?: string | null;
  }) {
    const limit = Math.min(first, 100); // cap at 100 per page
    const afterDate = after ? decodeCursor(after) : null;

    // Fetch limit+1 rows so we can detect hasNextPage cheaply
    const rows = await this.db.query.messages.findMany({
      where: and(
        eq(messages.conversationId, id),
        afterDate ? gt(messages.createdAt, afterDate) : undefined,
      ),
      with: {
        sender: true,
      },
      orderBy: [desc(messages.createdAt)],
      limit: limit + 1,
    });

    const hasNextPage = rows.length > limit;
    const nodes = (hasNextPage ? rows.slice(0, limit) : rows).map(
      (msg: any) => ({
        ...msg,
        senderType: msg.senderId === currentUserId ? "ME" : "SENDER",
      }),
    );

    const edges = nodes.map((msg: any) => ({
      cursor: encodeCursor(new Date(msg.createdAt)),
      node: msg,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
    };
  }

  async getInbox({
    id,
    first = 20,
    after,
    category = "ALL",
  }: {
    id: string;
    first?: number;
    after?: string | null;
    category?: "CONNECTION" | "MARKETPLACE" | "MENTORSHIP" | "ALL";
  }) {
    const limit = Math.min(first, 100);
    const afterDate = after ? decodeCursor(after) : null;

    const categoryFilter =
      category !== "ALL" ? eq(chat.chatType, category as any) : undefined;

    // Inbox ordered newest-first (updatedAt DESC).
    // "after" cursor = items older than the cursor date.
    const rows = await this.db.query.chat.findMany({
      where: and(
        or(eq(chat.user1, id), eq(chat.user2, id)),
        afterDate ? lt(chat.updatedAt, afterDate) : undefined,
        categoryFilter,
      ),
      with: {
        user1: {
          with: {
            user: {
              with: { about: true },
            },
          },
        },
        user2: {
          with: {
            user: {
              with: { about: true },
            },
          },
        },
        messages: {
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
          orderBy: [desc(messages.createdAt)],
          limit: 1,
        },
      },
      orderBy: [desc(chat.updatedAt)],
      limit: limit + 1,
    });

    const hasNextPage = rows.length > limit;
    const chatRows = hasNextPage ? rows.slice(0, limit) : rows;

    const nodes = chatRows.map((set: any) => {
      const lastMessage = set.messages[0] ?? null;
      if (lastMessage) {
        lastMessage.senderType = lastMessage.senderId === id ? "ME" : "SENDER";
      }

      return {
        id: set.id,
        chatId: set.id,
        sender: set.user1?.id === id ? set.user2 : set.user1,
        message: lastMessage,
        updatedAt: set.updatedAt,
      };
    });

    const edges = nodes.map((node: any) => ({
      cursor: encodeCursor(new Date(node.updatedAt ?? new Date())),
      node,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
    };
  }

  async startChat({
    id,
    input,
    entityId,
  }: {
    id: string;
    input: {
      userID: string;
      chatType?: "CONNECTION" | "MARKETPLACE" | "MENTORSHIP";
    };
    entityId: string;
  }) {
    if (id === input.userID) {
      throw new GraphQLError("Action not Allowed", {
        extensions: {
          code: 400,
          http: { status: 400 },
        },
      });
    }

    const chatType = input.chatType ?? "CONNECTION";

    const checkConnectionExist = await this.db.query.connections.findFirst({
      where: or(
        and(
          eq(connections.user1, input.userID),
          eq(connections.user2, id),
          eq(connections.entity, entityId),
        ),
        and(
          eq(connections.user1, id),
          eq(connections.user2, input.userID),
          eq(connections.entity, entityId),
        ),
      ),
    });

    const checkChat = await this.db.query.chat.findFirst({
      where: or(
        and(
          eq(chat.user1, input.userID),
          eq(chat.user2, id),
          eq(chat.entity, entityId),
          eq(chat.chatType, chatType),
        ),
        and(
          eq(chat.user1, id),
          eq(chat.user2, input.userID),
          eq(chat.entity, entityId),
          eq(chat.chatType, chatType),
        ),
      ),
    });

    if (checkChat) {
      return checkChat;
    }

    const newChat = await this.db
      .insert(chat)
      .values({
        chatStatusEnum: checkConnectionExist ? "ACCEPTED" : "PENDING",
        chatType,
        user1: id,
        user2: input.userID,
        entity: entityId,
      })
      .returning();

    return newChat[0];
  }

  async sendMessageInChat({
    id,
    chatId,
    content,
    entityId,
  }: {
    id: string;
    chatId: string;
    content: string;
    entityId: string;
  }) {
    try {
      const newChat = await this.db
        .insert(messages)
        .values({
          conversationId: chatId,
          content: content,
          senderId: id,
          entityId: entityId,
        })
        .returning();

      const details = await this.db.query.messages.findFirst({
        where: and(eq(messages.id, newChat[0].id)),
        with: {
          sender: true,
        },
      });

      if (details) {
        // Update the chat's updatedAt field to reflect newest activity
        await this.db
          .update(chat)
          .set({ updatedAt: details.createdAt })
          .where(eq(chat.id, chatId));

        ModerationPublisher.publish({
          userId: id,
          entityId: entityId,
          contentId: details.id,
          contentType: "MESSAGE",
          text: content,
        });

        return {
          ...details,
          senderType: "ME",
        };
      }

      return details;
    } catch (error) {
      log.error("sendMessageInChat failed", { error });
      throw error;
    }
  }

  /**
   * Search connected users by name.
   * Only returns users who have an ACCEPTED connection with the current user
   * within the same entity.
   */
  async searchConnections({
    userId,
    entityId,
    search,
    first = 20,
  }: {
    userId: string;
    entityId: string;
    search: string;
    first?: number;
  }) {
    const limit = Math.min(first, 50);
    const searchPattern = `%${search}%`;

    // 1. Get all ACCEPTED connection rows where current user is either user1 or user2
    const connectionRows = await this.db.query.connections.findMany({
      where: and(
        or(eq(connections.user1, userId), eq(connections.user2, userId)),
        eq(connections.entity, entityId),
        eq(connections.connectionStatusEnum, "ACCEPTED"),
      ),
    });

    if (!connectionRows.length) {
      return [];
    }

    // 2. Extract the "other" user IDs
    const connectedUserIds: string[] = connectionRows.map((row: any) =>
      row.user1 === userId ? row.user2 : row.user1,
    );

    // 3. Get user details for all connected users, filtered by name
    const results = await this.db
      .select({
        id: user.id,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      })
      .from(userToEntity)
      .innerJoin(user, eq(userToEntity.userId, user.id))
      .where(
        and(
          eq(userToEntity.entityId, entityId),
          sql`${userToEntity.id} IN (${sql.join(
            connectedUserIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`,
          or(
            ilike(user.firstName, searchPattern),
            ilike(user.lastName, searchPattern),
            sql`(${user.firstName} || ' ' || ${user.lastName}) ILIKE ${searchPattern}`,
          ),
        ),
      )
      .limit(limit);

    return results.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      avatar: r.avatar,
    }));
  }
}
