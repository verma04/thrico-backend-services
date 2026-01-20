import { GraphQLError } from "graphql";
import { GraphQLUpload } from "graphql-upload-minimal";
import { ErrorCode } from "@thrico/shared";
import { deleteSession as coreDeleteSession } from "@thrico/database";
import { log } from "@thrico/logging";
import {
  countryClient,
  pageClient,
  packageClient,
  subscriptionClient,
} from "@thrico/grpc";

// Admin Resolvers
import { adminResolvers } from "./admin/resolvers";
import { faqResolvers } from "./faq/resolvers";
import { feedResolvers } from "./feed/resolvers";
import { pollsResolvers } from "./polls/resolvers";
import { userResolvers } from "./user/resolvers";
import { listingResolvers } from "./listing/resolvers";
import { discussionResolvers } from "./discussion/resolvers";
import { websiteResolvers } from "./website/resolvers";
import { customFormsResolvers } from "./custom-form/resolvers";
import { announcementsResolvers } from "./announcements/resolvers";
import { alumniStoriesResolvers } from "./alumni-stories/resolvers";
import { gamificationResolvers } from "./gamification/resolvers";
import { jobsResolvers } from "./jobs/resolvers";
import { settingsResolvers } from "./settings/resolvers";
import { mentorShipResolvers } from "./mentorship/resolvers";
import { paymentResolvers } from "./payment/resolvers";
import { eventsResolvers } from "./events/resolvers";
import { givingResolvers } from "./giving/resolvers";
import { pageResolvers } from "./page/resolvers";
import { dashboardResolvers } from "./dashboard/resolvers";
import groupsResolvers from "./groups/resolvers";
import { offersResolvers } from "./offers/resolvers";

const mainResolvers = {
  Query: {
    // Original gRPC-based queries
    countries: async (_: any, __: any, context: any) => {
      try {
        const countries = await countryClient.getAllCountries();
        log.info("Countries fetched successfully", { count: countries.length });
        return countries;
      } catch (error: any) {
        log.error("Error fetching countries via gRPC", {
          error: error.message,
        });
        throw new GraphQLError("Failed to fetch countries", {
          extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
    },

    health: async () => {
      try {
        return { status: "ok", database: "connected", redis: "connected" };
      } catch (error: any) {
        log.error("Health check failed", { error: error.message });
        return {
          status: "error",
          database: "disconnected",
          redis: "disconnected",
        };
      }
    },

    pages: async (_: any, { value, limit }: any) => {
      try {
        const response = await pageClient.getAllPages({ value, limit });
        return response.pages || [];
      } catch (error) {
        log.error("Error fetching pages via gRPC", error);
        throw new GraphQLError("Failed to fetch pages", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    packages: async (_: any, { country, entityId }: any) => {
      try {
        const packages = await packageClient.getCountryPackages(
          country,
          entityId
        );
        return packages || [];
      } catch (error: any) {
        log.error("Error fetching packages via gRPC", { error: error.message });
        throw new GraphQLError("Failed to fetch packages", {
          extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
    },

    entitySubscription: async (_: any, { entityId }: any) => {
      try {
        const subscription = await subscriptionClient.checkEntitySubscription(
          entityId
        );
        return subscription;
      } catch (error: any) {
        log.error("Error fetching entity subscription via gRPC", {
          error: error.message,
          entityId,
        });
        throw new GraphQLError("Failed to fetch entity subscription", {
          extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
        });
      }
    },
  },

  Mutation: {
    // Original logout
    logout: async (_: any, __: any, context: any) => {
      if (!context.user) return true;

      try {
        await coreDeleteSession(context.user.userId);
        log.info("Admin logged out successfully", {
          userId: context.user.userId,
        });
        return true;
      } catch (error) {
        log.error("Error during admin logout", {
          userId: context.user.userId,
          error,
        });
        return false;
      }
    },
  },
};

// Entity Resolvers
import GraphQLJSON from "graphql-type-json";
import { entityResolvers } from "./entity/resolvers";

export const resolvers: any = {
  Upload: GraphQLUpload,
  JSON: GraphQLJSON,
  Query: {
    ...mainResolvers.Query,
    ...adminResolvers.Query,
    ...entityResolvers.Query,
    ...faqResolvers.Query,
    ...feedResolvers.Query,
    ...pollsResolvers.Query,
    ...userResolvers.Query,
    ...listingResolvers.Query,
    ...discussionResolvers.Query,
    ...websiteResolvers.Query,
    ...customFormsResolvers.Query,
    ...announcementsResolvers.Query,
    ...alumniStoriesResolvers.Query,
    ...gamificationResolvers.Query,
    ...jobsResolvers.Query,
    ...settingsResolvers.Query,
    ...mentorShipResolvers.Query,
    ...paymentResolvers.Query,
    ...eventsResolvers.Query,
    ...givingResolvers.Query,
    ...pageResolvers.Query,
    ...dashboardResolvers.Query,
    ...groupsResolvers.Query,
    ...offersResolvers.Query,
  },
  Mutation: {
    ...mainResolvers.Mutation,
    ...adminResolvers.Mutation,
    ...entityResolvers.Mutation,
    ...faqResolvers.Mutation,
    ...feedResolvers.Mutation,
    ...pollsResolvers.Mutation,
    ...userResolvers.Mutation,
    ...listingResolvers.Mutation,
    ...discussionResolvers.Mutation,
    ...websiteResolvers.Mutation,
    ...customFormsResolvers.Mutation,
    ...announcementsResolvers.Mutation,
    ...alumniStoriesResolvers.Mutation,
    ...gamificationResolvers.Mutation,
    ...jobsResolvers.Mutation,
    ...settingsResolvers.Mutation,
    ...mentorShipResolvers.Mutation,
    ...paymentResolvers.Mutation,
    ...eventsResolvers.Mutation,
    ...givingResolvers.Mutation,
    ...pageResolvers.Mutation,
    ...dashboardResolvers.Mutation,
    ...groupsResolvers.Mutation,
    ...offersResolvers.Mutation,
  },
};
