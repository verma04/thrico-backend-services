import { ContactService } from "@thrico/services";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const contactResolvers = {
  Mutation: {
    sendContactMessage: async (_: any, { input }: any, context: any) => {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));

        return await ContactService.sendContactMessage(db, {
          subject: input.subject,
          message: input.message,
          userId,
          entityId,
        });
      } catch (error) {
        log.error("Error in sendContactMessage resolver", {
          error,
          subject: input?.subject,
        });
        throw error;
      }
    },
  },
};
