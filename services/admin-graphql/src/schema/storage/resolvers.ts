import { StorageService } from "@thrico/services";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const resolvers = {
  Query: {
    getStorageStats: async (_: any, __: any, context: any) => {
      try {
        const { db, entity } = await checkAuth(context);
        const stats = await StorageService.getStorageStatsByModule(db, entity);
        log.info("Storage stats fetched successfully", { entityId: entity });
        return stats.map((s: any) => ({
          ...s,
          totalBytes: s.totalBytes?.toString() || "0",
        }));
      } catch (error: any) {
        log.error("Error in getStorageStats resolver", {
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    },
    getStorageSummary: async (_: any, __: any, context: any) => {
      try {
        const { db, entity } = await checkAuth(context);
        const summary = await StorageService.getTotalStorageSummary(db, entity);
        log.info("Storage summary fetched successfully", {
          entityId: entity,
        });
        return {
          totalBytes: summary.totalBytes?.toString() || "0",
          totalFileCount: summary.totalFileCount,
        };
      } catch (error: any) {
        log.error("Error in getStorageSummary resolver", {
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    },
  },
};
