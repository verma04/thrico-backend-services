import { PubSub, withFilter } from "graphql-subscriptions";
import { ChatService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

const pubsub = new PubSub();
const CHAT_CHANNEL = "CHAT_CHANNEL";

export const chatResolvers = {
  Query: {
    async getAllMessages(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const chatService = new ChatService(db);
        return await chatService.getAllMessages({ id: input.id });
      } catch (error) {
        console.error("Error in getAllMessages:", error);
        throw error;
      }
    },

    async getInbox(_: any, __: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const chatService = new ChatService(db);
        return await chatService.getInbox({ id });
      } catch (error) {
        console.error("Error in getInbox:", error);
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
      subscribe: withFilter(
        //@ts-ignore
        () => pubsub?.asyncIterator(CHAT_CHANNEL),
        (payload, variables) => {
          return payload.message.chatId === variables.id;
        },
      ),
    },
  },
};
