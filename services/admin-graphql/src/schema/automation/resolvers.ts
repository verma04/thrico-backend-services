import { AutomationService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { logger } from "@thrico/logging";

export const automationResolvers = {
  Query: {
    async getAutomationCampaigns(_: any, { entityId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return await AutomationService.getCampaigns(db, entityId);
      } catch (error: any) {
        logger.error(`Error in getAutomationCampaigns: ${error.message}`, { error });
        throw error;
      }
    },

    async getAutomationCampaign(_: any, { id }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const result = await AutomationService.getCampaign(db, id);
        if (!result) throw new GraphQLError("Campaign not found");
        return result;
      } catch (error: any) {
        logger.error(`Error in getAutomationCampaign: ${error.message}`, { error });
        throw error;
      }
    },

    async getAutomationJobs(_: any, { campaignId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return await AutomationService.getJobs(db, campaignId);
      } catch (error: any) {
        logger.error(`Error in getAutomationJobs: ${error.message}`, { error });
        throw error;
      }
    },

    async getAutomationExecutionLogs(_: any, { jobId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return await AutomationService.getLogs(db, jobId);
      } catch (error: any) {
        logger.error(`Error in getAutomationExecutionLogs: ${error.message}`, { error });
        throw error;
      }
    },

    async getAutomationMetadata(_: any, { entityId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return await AutomationService.getMetadata(db, entityId);
      } catch (error: any) {
        logger.error(`Error in getAutomationMetadata: ${error.message}`, { error });
        throw error;
      }
    },
  },

  Mutation: {
    async createAutomationCampaign(_: any, input: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const payload = { ...input };
        
        // Drizzle/Postgres handles object-to-json automatically if input is object
        return await AutomationService.createCampaign(db, payload);
      } catch (error: any) {
        logger.error(`Error in createAutomationCampaign: ${error.message}`, { error });
        throw error;
      }
    },

    async updateAutomationCampaign(_: any, { id, ...updates }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const updatedCampaign = await AutomationService.updateCampaign(db, id, entity, updates);

        if (!updatedCampaign) throw new GraphQLError("Campaign not found or not owned by entity");
        return updatedCampaign;
      } catch (error: any) {
        logger.error(`Error in updateAutomationCampaign: ${error.message}`, { error });
        throw error;
      }
    },

    async deleteAutomationCampaign(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        return await AutomationService.deleteCampaign(db, id, entity);
      } catch (error: any) {
        logger.error(`Error in deleteAutomationCampaign: ${error.message}`, { error });
        throw error;
      }
    },
  },
};
