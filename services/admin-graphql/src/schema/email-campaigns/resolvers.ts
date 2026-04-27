import { GraphQLError } from "graphql";
import { eq, desc, and } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { automationCampaign } from "@thrico/database";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const emailCampaignResolvers = {
  Query: {
    async getEmailCampaigns(_: any, __: any, context: any) {
      const { db, entityId } = await checkAuth(context);
      
      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: { code: "FORBIDDEN", http: { status: 403 } },
        });
      }

      const campaigns = await db.query.automationCampaign.findMany({
        where: eq(automationCampaign.entityId, entityId),
        orderBy: [desc(automationCampaign.createdAt)],
      });

      return campaigns.map((c: any) => ({
        ...c,
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
      }));
    },

    async getEmailCampaign(_: any, { id }: { id: string }, context: any) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: { code: "FORBIDDEN", http: { status: 403 } },
        });
      }

      const campaign = await db.query.automationCampaign.findFirst({
        where: and(
          eq(automationCampaign.id, id),
          eq(automationCampaign.entityId, entityId)
        ),
      });

      if (!campaign) {
        throw new GraphQLError("Campaign not found", {
          extensions: { code: "NOT_FOUND", http: { status: 404 } },
        });
      }

      return {
        ...campaign,
        createdAt: campaign.createdAt?.toISOString(),
        updatedAt: campaign.updatedAt?.toISOString(),
      };
    },
  },

  Mutation: {
    async createEmailCampaign(_: any, { input }: { input: any }, context: any) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: { code: "FORBIDDEN", http: { status: 403 } },
        });
      }

      const [newCampaign] = await db
        .insert(automationCampaign)
        .values({
          ...input,
          entityId,
          triggerType: "EVENT", // Default
          triggerConfig: {},   // Default
          actionConfig: [],    // Default
        })
        .returning();

      await createAuditLog(db, {
        adminId: (await checkAuth(context)).id,
        entityId,
        module: "EMAIL_CAMPAIGN",
        action: "CREATE_CAMPAIGN",
        resourceId: newCampaign.id,
        newState: newCampaign,
      });

      return {
        ...newCampaign,
        createdAt: newCampaign.createdAt?.toISOString(),
        updatedAt: newCampaign.updatedAt?.toISOString(),
      };
    },

    async updateEmailCampaign(_: any, { id, input }: { id: string; input: any }, context: any) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: { code: "FORBIDDEN", http: { status: 403 } },
        });
      }

      const [updatedCampaign] = await db
        .update(automationCampaign)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(automationCampaign.id, id),
            eq(automationCampaign.entityId, entityId)
          )
        )
        .returning();

      if (updatedCampaign) {
        await createAuditLog(db, {
          adminId: (await checkAuth(context)).id,
          entityId,
          module: "EMAIL_CAMPAIGN",
          action: "UPDATE_CAMPAIGN",
          resourceId: updatedCampaign.id,
          newState: updatedCampaign,
        });
      }

      if (!updatedCampaign) {
        throw new GraphQLError("Campaign not found or update failed", {
          extensions: { code: "NOT_FOUND", http: { status: 404 } },
        });
      }

      return {
        ...updatedCampaign,
        createdAt: updatedCampaign.createdAt?.toISOString(),
        updatedAt: updatedCampaign.updatedAt?.toISOString(),
      };
    },
  },
};
