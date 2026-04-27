import { AutomationService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { logger } from "@thrico/logging";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const automationResolvers = {
  Query: {
    async getAutomationCampaigns(_: any, { entityId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return await AutomationService.getCampaigns(db, entityId);
      } catch (error: any) {
        logger.error(`Error in getAutomationCampaigns: ${error.message}`, {
          error,
        });
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
        logger.error(`Error in getAutomationCampaign: ${error.message}`, {
          error,
        });
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
        logger.error(`Error in getAutomationExecutionLogs: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    async getAutomationMetadata(_: any, { entityId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return await AutomationService.getMetadata(db, entityId);
      } catch (error: any) {
        logger.error(`Error in getAutomationMetadata: ${error.message}`, {
          error,
        });
        throw error;
      }
    },
  },

  Mutation: {
    async createAutomationCampaign(_: any, input: any, context: any) {
      try {
        const { db, id: adminId, entity } = await checkAuth(context);
        const campaign = await AutomationService.createCampaign(db, input);

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "AUTOMATION",
          action: "CREATE_CAMPAIGN",
          resourceId: campaign.id,
          newState: campaign,
        });

        return campaign;
      } catch (error: any) {
        logger.error(`Error in createAutomationCampaign: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    async updateAutomationCampaign(
      _: any,
      { id, ...updates }: any,
      context: any,
    ) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);
        const updatedCampaign = await AutomationService.updateCampaign(
          db,
          id,
          entity,
          updates,
        );

        if (!updatedCampaign)
          throw new GraphQLError("Campaign not found or not owned by entity");

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "AUTOMATION",
          action: "UPDATE_CAMPAIGN",
          resourceId: id,
          newState: updatedCampaign,
        });

        return updatedCampaign;
      } catch (error: any) {
        logger.error(`Error in updateAutomationCampaign: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    async deleteAutomationCampaign(_: any, { id }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);
        const result = await AutomationService.deleteCampaign(db, id, entity);

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "AUTOMATION",
          action: "DELETE_CAMPAIGN",
          resourceId: id,
        });

        return result;
      } catch (error: any) {
        logger.error(`Error in deleteAutomationCampaign: ${error.message}`, {
          error,
        });
        throw error;
      }
    },
  },
};

