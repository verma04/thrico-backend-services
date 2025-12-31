import { ENTITY_FONT } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { packageClient } from "@thrico/grpc";
import { subscriptionClient } from "@thrico/grpc";
import { eq, sql } from "drizzle-orm";
import { user } from "@thrico/database";
// import { createCustomRequest } from "@thrico/grpc"; // Assuming this is now available or mocked

export const planResolvers = {
  Query: {
    async getCountryPackage(_: any, { input }: any, context: any) {
      try {
        const { entity, country } = await checkAuth(context);

        console.log(entity, country);
        const packages = await packageClient.getCountryPackages(
          country,
          entity
        );
        console.log(packages);

        // console.log(packages);
        return packages;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getPlanOverview(_: any, { input }: any, context: any) {
      try {
        const { entity, country, db } = await checkAuth(context);

        const overView = await subscriptionClient.getPlanOverview(entity);

        // Find total number of users for the entity
        const result = await db
          .select({ count: sql`count(*)` })
          .from(user)
          .where(eq(user.entityId, entity));

        const userPercent = overView?.userLimit
          ? Math.round((Number(result[0].count) / overView.userLimit) * 100)
          : 0;
        const data = {
          ...overView,
          userUsage: {
            used: result[0].count,
            limit: overView.userLimit,
            percent: userPercent,
          },
        };

        return data;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getAllEntityInvoice(_: any, { input }: any, context: any) {
      try {
        const { entity, country, db } = await checkAuth(context);

        const invoicesResult = await subscriptionClient.getAllEntityInvoice(
          entity
        );

        return invoicesResult?.invoices;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async updateTrialToPackage(_: any, { input }: any, context: any) {
      try {
        const { entity, country } = await checkAuth(context);

        const { packageId, billingCycle } = input;
        const packages = await subscriptionClient.updateTrialToPackage(
          entity,
          packageId,
          country,
          billingCycle
        );

        return packages?.razorpayOrder;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateToYearly(_: any, { input }: any, context: any) {
      try {
        const { entity, country } = await checkAuth(context);

        const { packageId } = input;
        const packages = await subscriptionClient.updateToYearly({
          entityId: entity,
          packageId,
          countryCode: country,
        });

        console.log(packages?.razorpayOrder);
        return packages?.razorpayOrder;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async verifyRazorpayPayment(_: any, { input }: any, context: any) {
      try {
        const { entity, country } = await checkAuth(context);

        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;
        console.log(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        const packages = await subscriptionClient.verifyRazorpayPayment(
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature
        );

        return packages;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async createCustomRequest(_: any, { input }: any, context: any) {
      try {
        const { entity, country } = await checkAuth(context);

        const { teamRequirements, features, timeLine, contact, security } =
          input;

        // const request = await createCustomRequest({
        //   teamRequirements,
        //   features,
        //   timeLine,
        //   contact,
        //   security,
        //   entityId: entity,
        // });

        // console.log(request);
        // return request;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getUpgradePlanSummary(_: any, { input }: any, context: any) {
      try {
        const { entity, country } = await checkAuth(context);

        const request = await subscriptionClient.getUpgradePlanSummary({
          entityId: entity,
          newPackageId: input.packageId,
        });

        console.log(request);
        return request;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async upgradePlan(_: any, { input }: any, context: any) {
      try {
        const { entity, country } = await checkAuth(context);

        const request = await subscriptionClient.upgradePlan({
          entityId: entity,
          newPackageId: input.packageId,
          billingCycle: input.billingCycle,
          countryCode: country,
        });

        return request?.razorpayOrder;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
