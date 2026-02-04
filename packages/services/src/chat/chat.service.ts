import { chat, connections, messages } from "@thrico/database";
import { and, eq, or } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";
import { ModerationPublisher } from "../utils/moderation-publisher";

export class ChatService {
  constructor(private db: any) {}

  async getAllMessages({ id }: { id: string }) {
    const checkChat = await this.db.query.chat.findFirst({
      where: and(eq(chat.id, id)),
      with: {
        messages: {
          with: {
            sender: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    return checkChat?.messages;
  }

  async getInbox({ id }: { id: string }) {
    const inbox = await this.db.query.chat.findMany({
      where: or(eq(chat.user1, id), eq(chat.user2, id)),
      with: {
        user1: {
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        },
        user2: {
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        },
        messages: true,
      },
    });

    console.log(inbox);

    const sender = inbox?.map((set: any) => {
      if (set?.user1?.id === id) {
        return {
          id: set?.id,
          sender: set?.user2,
          message: set?.messages[0],
        };
      } else {
        return {
          id: set?.id,
          sender: set?.user1,
          message: set?.messages[0],
        };
      }
    });

    return sender;
  }

  async startChat({
    id,
    input,
    entityId,
  }: {
    id: string;
    input: { userID: string };
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
        ),
        and(
          eq(chat.user1, id),
          eq(chat.user2, input.userID),
          eq(chat.entity, entityId),
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

      console.log(details);

      if (details) {
        ModerationPublisher.publish({
          userId: id,
          entityId: entityId,
          contentId: details.id,
          contentType: "MESSAGE",
          text: content,
        });
      }

      return details;
    } catch (error) {
      log.error("sendMessageInChat failed", { error });
      throw error;
    }
  }
}
