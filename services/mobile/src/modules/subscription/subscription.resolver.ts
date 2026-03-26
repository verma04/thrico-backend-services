import { log } from "@thrico/logging";
import { AuthService } from "@thrico/services";
import { subscriptionClient } from "@thrico/grpc";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const subscriptionResolvers = {
  Query: {
    async checkSubscription(_: any, {}: any, context: any) {
      try {
        const { entityId } = context.user || (await checkAuth(context));
        return AuthService.checkSubscription({
          entityId,
          checkEntitySubscriptionFn: (id) =>
            subscriptionClient.checkEntitySubscription(id),
        });
      } catch (error) {
        log.error("Error in checkSubscription", { error });
        throw error;
      }
    },

    async getFaqModule(_: any, __: any, context: any) {
      try {
        const { db, entityId } = context.user || (await checkAuth(context));

        // 1. Get subscribed modules first
        const subscription = await AuthService.checkSubscription({
          entityId,
          checkEntitySubscriptionFn: (id) =>
            subscriptionClient.checkEntitySubscription(id),
        });

        const subscribedModuleNames =
          subscription?.modules
            ?.filter((mod: any) => mod.enabled)
            .map((mod: any) => mod.name) || [];

        if (subscribedModuleNames.length === 0) {
          return [];
        }

        // 2. Get entity settings to check FAQ fields
        const settings = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entityId),
        });

        if (!settings) {
          return [];
        }

        // Returning full list as in previous implementation
        return [
          "members",
          "communities",
          "forums",
          "events",
          "jobs",
          "mentorship",
          "listing",
          "shop",
          "offers",
          "surveys",
          "polls",
          "stories",
          "wallOfFame",
          "gamification",
          "rewards",
        ];
      } catch (error) {
        log.error("Error in getFaqModule", { error });
        throw error;
      }
    },
  },
};
