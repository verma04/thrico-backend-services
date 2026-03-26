import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql/error";

export const faqResolvers = {
  Query: {
    async getFaqByModule(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = context.user || (await checkAuth(context));

        const module = input.module;
        // Map module name to terms field
        const termsFieldMap: Record<string, string> = {
          members: "termAndConditionsMembers",
          communities: "termAndConditionsCommunities",
          forums: "termAndConditionsForums",
          events: "termAndConditionsEvents",
          jobs: "termAndConditionsJobs",
          mentorship: "termAndConditionsMentorship",
          listing: "termAndConditionsListing",
          shop: "termAndConditionsShop",
          offers: "termAndConditionsOffers",
          surveys: "termAndConditionsSurveys",
          polls: "termAndConditionsPolls",
          stories: "termAndConditionsStories",
          wallOfFame: "termAndConditionsWallOfFame",
          gamification: "termAndConditionsGamification",
          rewards: "termAndConditionsRewards",
        };

        const termsField = termsFieldMap[module];
        if (!termsField) {
          throw new GraphQLError(`Invalid module: ${module}`);
        }

        const settings = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entityId),
        });

        // The previous code had a redundant assignment and check for faqField
        // return (settings as any)[faqField] || null;
        // I'll keep it consistent with the previous logic but cleaner.

        return (settings as any)[termsField] || null;
      } catch (error) {
        log.error("Error in getFaqByModule", { error, module: input?.module });
        throw error;
      }
    },
  },
};
