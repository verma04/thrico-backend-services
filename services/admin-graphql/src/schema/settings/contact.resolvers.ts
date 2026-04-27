import { ContactService } from "@thrico/services";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const contactResolvers = {
  Query: {
    getAllContacts: async (_: any, { limit, cursor }: any, context: any) => {
      try {
        const { db, entityId } = context.user || (await checkAuth(context));

        return await ContactService.getAllContacts(db, {
          entityId,
          limit,
          cursor,
        });
      } catch (error) {
        log.error("Error in getAllContacts resolver", { error });
        throw error;
      }
    },
    getContactStats: async (_: any, __: any, context: any) => {
      try {
        const { db, entityId } = context.user || (await checkAuth(context));
        return await ContactService.getContactStats(db, entityId);
      } catch (error) {
        log.error("Error in getContactStats resolver", { error });
        throw error;
      }
    },
  },
  Mutation: {
    updateContactStatus: async (_: any, { id, status }: any, context: any) => {
      try {
        const { db, entityId, id: adminId } = context.user || (await checkAuth(context));
        const result = await ContactService.updateContactStatus(db, {
          id,
          status,
          entityId,
        });

        await createAuditLog(db, {
          adminId: adminId,
          entityId: entityId,
          module: "SETTINGS",
          action: "UPDATE_CONTACT_STATUS",
          resourceId: id,
          newState: { status },
        });

        return result;
      } catch (error) {
        log.error("Error in updateContactStatus resolver", { error });
        throw error;
      }
    },
  },
};
