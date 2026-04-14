import { PubSub, withFilter } from "graphql-subscriptions";
import { ChatService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

const pubsub = new PubSub();
(pubsub as any).ee.setMaxListeners(50); // Increase limit for listeners
const CHAT_CHANNEL = "CHAT_CHANNEL";

function chatIterator() {
  return pubsub.asyncIterableIterator(CHAT_CHANNEL);
}

export const chatResolvers = {
  Query: {
    async getAllMessages(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const chatService = new ChatService(db);
        return await chatService.getAllMessages({
          id: input.id,
          currentUserId: id,
          first: input.first,
          after: input.after,
        });
      } catch (error) {
        console.error("Error in getAllMessages:", error);
        throw error;
      }
    },

    async getInbox(_: any, { first, after, category }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const chatService = new ChatService(db);
        return await chatService.getInbox({ id, first, after, category });
      } catch (error) {
        console.error("Error in getInbox:", error);
        throw error;
      }
    },

    async getChatProfile(_: any, { chatId }: { chatId: string }, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const chatService = new ChatService(db);
        return await chatService.getChatProfile({ chatId, currentUserId: id });
      } catch (error) {
        console.error("Error in getChatProfile:", error);
        throw error;
      }
    },

    async searchConnections(
      _: any,
      { search, first }: { search: string; first?: number },
      context: any,
    ) {
      try {
        const { id, entityId, db } = await checkAuth(context);
        const chatService = new ChatService(db);
        return await chatService.searchConnections({
          userId: id,
          entityId,
          search,
          first,
        });
      } catch (error) {
        console.error("Error in searchConnections:", error);
        throw error;
      }
    },
  },

  Mutation: {
    async startChat(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);
        const chatService = new ChatService(db);
        return await chatService.startChat({ id, input, entityId });
      } catch (error) {
        console.error("Error in startChat:", error);
        throw error;
      }
    },

    async sendMessageInChat(_: any, { input }: any, context: any) {
      try {
        const { id, db, entityId } = await checkAuth(context);
        const chatService = new ChatService(db);

        const details = await chatService.sendMessageInChat({
          id,
          chatId: input.chatId,
          content: input.content,
          entityId,
        });

        pubsub.publish(CHAT_CHANNEL, {
          message: details,
        });

        return details;
      } catch (error) {
        console.error("Error in sendMessageInChat:", error);
        throw error;
      }
    },
  },

  Subscription: {
    message: {
      subscribe: async (parent: any, variables: any, context: any, info: any) => {
        try {
          return withFilter(
            () => chatIterator(),
            (
              payload: { message: { conversationId: string } } | undefined,
              vars: { id: string } | undefined,
            ) => {
              if (!payload || !vars) return false;
              return payload.message.conversationId === vars.id;
            },
          )(parent, variables, context, info);
        } catch (error) {
          console.error("Subscription subscribe error:", error);
          throw error;
        }
      },
      // Unwrap the pubsub envelope so the resolver returns just the `messages` object.
      resolve: async (payload: { message: any }, _: any, context: any) => {
        try {
          const { id } = await checkAuth(context);
          return {
            ...payload.message,
            senderType: payload.message.senderId === id ? "ME" : "SENDER",
          };
        } catch (error) {
          console.error("Subscription resolve error:", error);
          // If auth fails in resolve, we might still want to return the message but without senderType
          // or just fallback to payload.message.
          return payload.message;
        }
      },
    },
  },
};
