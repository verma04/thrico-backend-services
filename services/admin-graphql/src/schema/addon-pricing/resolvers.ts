import { addonClient } from "@thrico/grpc";
import { logger } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";

export const addonPricingResolvers = {
  Query: {
    async getAddonPricing(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);

        const { entity, country } = auth;

        const result = await addonClient.getAddonPricing(country);

        return {
          addons: result.addons || [],
          currency: result.currency || "",
        };
      } catch (error: any) {
        logger.error(`Error in getAddonPricing: ${error.message}`, {
          code: "INTERNAL_SERVER_ERROR",
          error,
        });

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError(
          `Failed to fetch addon pricing: ${error.message}`,
          {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        );
      }
    },
  },
  Mutation: {
    async addAddon(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        const { entityId, country } = auth;

        if (!entityId) {
          throw new GraphQLError("Entity ID not found in context");
        }

        const result = await addonClient.addAddon({
          entityId: entityId,
          addonPricingId: input.addonPricingId,
          countryCode: country,
          quantity: input.quantity,
        });

        return result;
      } catch (error: any) {
        logger.error(`Error in addAddon mutation: ${error.message}`, {
          error,
        });

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError(`Failed to add addon: ${error.message}`, {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    async removeAddon(_: any, { addonId }: { addonId: string }, context: any) {
      try {
        const auth = await checkAuth(context);
        const { entityId } = auth;

        if (!entityId) {
          throw new GraphQLError("Entity ID not found in context");
        }

        const result = await addonClient.removeAddon(entityId, addonId);

        return result;
      } catch (error: any) {
        logger.error(`Error in removeAddon mutation: ${error.message}`, {
          error,
        });

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError(`Failed to remove addon: ${error.message}`, {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
};
