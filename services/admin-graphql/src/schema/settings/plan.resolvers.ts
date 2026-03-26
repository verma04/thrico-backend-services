import { ENTITY_FONT } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { packageClient } from "@thrico/grpc";
import { subscriptionClient } from "@thrico/grpc";
import { eq, sql } from "drizzle-orm";
import { user } from "@thrico/database";
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const planResolvers = {
  Query: {
    async getCountryPackage(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.READ);
        const { entity, country } = auth;

        const packages = await packageClient.getCountryPackages(
          country,
          entity,
        );

        return packages;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getPlanOverview(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.READ);
        const { entity, country, db } = auth;

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
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.READ);
        const { entity } = auth;

        const invoicesResult =
          await subscriptionClient.getAllEntityInvoice(entity);

        return invoicesResult?.invoices;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getUpdateToYearlySummary(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.READ);
        const { entity, country } = auth;

        const summary = await subscriptionClient.updateToYearlySummary({
          entityId: entity,
          countryCode: country,
        });

        return summary;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async updateTrialToPackage(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);
        const { entity, country, db, id: adminId } = auth;

        const { packageId, billingCycle } = input;
        const result = await subscriptionClient.updateTrialToPackage(
          entity,
          packageId,
          country,
          billingCycle,
        );

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.SUBSCRIPTION,
          action: "UPDATE_TRIAL_TO_PACKAGE",
          resourceId: packageId,
          newState: { packageId, billingCycle, result },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return result?.razorpayOrder;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateToYearly(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);
        const { entity, country, db, id: adminId } = auth;

        const result = await subscriptionClient.updateToYearly({
          entityId: entity,
          countryCode: country,
        });

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.SUBSCRIPTION,
          action: "UPDATE_TO_YEARLY",
          newState: result,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async verifyRazorpayPayment(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);
        const { entity, db, id: adminId } = auth;

        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;
        const result = await subscriptionClient.verifyRazorpayPayment(
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        );

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.SUBSCRIPTION,
          action: "VERIFY_PAYMENT",
          resourceId: razorpayOrderId,
          newState: { razorpayOrderId, razorpayPaymentId, result },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async createCustomRequest(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);
        const { entity, db, id: adminId } = auth;

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.SUBSCRIPTION,
          action: "CREATE_CUSTOM_REQUEST",
          newState: input,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        // Current implementation is a placeholder
        return { success: true };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getUpgradePlanSummary(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.READ);
        const { entity } = auth;

        const request = await subscriptionClient.getUpgradePlanSummary({
          entityId: entity,
          newPackageId: input.packageId,
        });

        return request;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async upgradePlan(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.EDIT);
        const { entity, country, db, id: adminId } = auth;

        const result = await subscriptionClient.upgradePlan({
          entityId: entity,
          newPackageId: input.packageId,
          billingCycle: input.billingCycle,
          countryCode: country,
        });

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.SUBSCRIPTION,
          action: "UPGRADE_PLAN",
          resourceId: input.packageId,
          newState: { ...input, result },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return result?.razorpayOrder;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
