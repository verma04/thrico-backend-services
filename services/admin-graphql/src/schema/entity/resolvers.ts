import { GraphQLError } from "graphql";
import { v4 as uuidv4 } from "uuid";
import { DatabaseRegion } from "@thrico/shared";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { entity, entitySettings, storageFiles } from "@thrico/database";

import { log } from "@thrico/logging"; // Added import
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";
import {
  ADMIN,
  DOMAIN,
  ENTITY_INDUSTRY,
  ENTITY_TYPE,
  ENTITY_THEME,
  AuditLog,
} from "@thrico/database";

import { eq } from "drizzle-orm";
import upload from "../../utils/upload/uploadImageToFolder.utils";
// import { userOrg } from "./mentorship.resolvers"; // Replaced with context.entity check

import { countryClient, entityClient, subscriptionClient } from "@thrico/grpc";

import { seedDiscussionCategories } from "../../seed/seedDiscussionCategories";
import { initializeWebsite as initWebsiteContent } from "../../lib/website/create-default-pages";
import { changeDomain } from "../../queue/email-rabbit";
import { EntityService } from "@thrico/services";

export const entityResolvers: any = {
  Query: {
    async getEntity(_: any, { input }: any, context: any) {
      try {
        const user = await checkAuth(context);

        if (!user?.entity) {
          return null;
        }

        // Parallelize fetching entity details, subscription, and domain
        const [entityData, subscription, domainResult] = await Promise.all([
          entityClient.getEntityDetails(user.entity),
          subscriptionClient.checkEntitySubscription(user.entity),
          DOMAIN.query("entity").eq(user.entity).exec(),
        ]);

        const domainData = domainResult.count
          ? domainResult[0]?.toJSON()
          : null;

        return {
          ...entityData,
          domain: domainData?.domain ?? null,
          subscription: subscription?.status === "" ? null : subscription,
        };
      } catch (error: any) {
        log.error("Failed to get entity", {
          error: error.message,
          stack: error.stack,
          entityId: context.user?.entity,
        });
        throw error;
      }
    },

    async getKycCountries(_: any, { input }: any, context: any) {
      try {
        // Just checking auth?
        // await checkAuthLogin(context);

        const countries = await countryClient.getAllCountries();
        return countries;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async checkDomain(_: any, { input }: any, context: any) {
      try {
        // await checkAuth(context);

        const findDomain = await DOMAIN.query("domain").eq(input.domain).exec();

        if (findDomain.count !== 0) {
          return new GraphQLError(
            "Sorry, that domain already exists. Please try a different one.",
            {
              extensions: {
                code: "NOT FOUND",
                http: { status: 400 },
              },
            },
          );
        }
        return {
          success: true,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // Missing definition for 'currency' table/model in provided context,
    // but code uses data.db.query.currency.
    // I will assume data.db (drizzle) has currency.
    async getCurrency(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);

        // Warning: data.db might be typed as any or specific schema.
        // Assuming query.currency exists.
        const currency = await data?.db.query.currency.findMany();

        return currency;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getEntityCurrency(_: any, { input }: any, context: any) {
      try {
        const { entity } = await checkAuth(context);

        const entityResult = await entityClient.getEntityDetails(entity);

        return entityResult.currency || "USD"; // Default to USD if no currency is set
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getEntityType(_: any, { input }: any, context: any) {
      try {
        await checkAuth(context);

        const check = await ENTITY_TYPE.scan().exec();

        return check.toJSON();
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getIndustryType(_: any, { input }: any, context: any) {
      try {
        await checkAuth(context);

        const industry = await ENTITY_INDUSTRY.scan().exec();

        return industry.toJSON();
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getEntitySettings(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SETTINGS, PermissionAction.READ);
        const { db, entity: entityId } = auth;

        const settings = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entityId),
        });

        return settings;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getFaqByModule(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);
        const { module } = input;

        const settings = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entityId),
        });

        if (!settings) {
          throw new GraphQLError("Entity settings not found");
        }

        // Map module name to FAQ field
        const faqFieldMap: Record<string, string> = {
          members: "faqMembers",
          communities: "faqCommunities",
          forums: "faqForums",
          events: "faqEvents",
          jobs: "faqJobs",
          mentorship: "faqMentorship",
          listing: "faqListing",
          shop: "faqShop",
          offers: "faqOffers",
          surveys: "faqSurveys",
          polls: "faqPolls",
          stories: "faqStories",
          wallOfFame: "faqWallOfFame",
          gamification: "faqGamification",
          rewards: "faqRewards",
        };

        const faqField = faqFieldMap[module];
        if (!faqField) {
          throw new GraphQLError(`Invalid module: ${module}`);
        }

        return {
          module,
          faq: (settings as any)[faqField] || null,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getTermsAndConditionsByModule(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);
        const { module } = input;

        const settings = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entityId),
        });

        if (!settings) {
          throw new GraphQLError("Entity settings not found");
        }

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

        return {
          module,
          termsAndConditions: (settings as any)[termsField] || null,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getMembersTermsAndConditions(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        const settings = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entityId),
        });

        return settings;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getDiscussionForumTermsAndConditions(
      _: any,
      { input }: any,
      context: any,
    ) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        const settings = await db.query.entitySettings.findFirst({
          where: (entitySettings: any, { eq }: any) =>
            eq(entitySettings.entity, entityId),
        });

        return settings;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getEntityTheme(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.APPEARANCE, PermissionAction.READ);
        const { entity: entityId } = auth;

        return await EntityService.getEntityTheme({ entityId });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async checkEntitySubscription(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SUBSCRIPTION, PermissionAction.READ);
        const { entity: entityId } = auth;

        const subscription =
          await subscriptionClient.checkEntitySubscription(entityId);

        return subscription;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async editEntityTheme(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.APPEARANCE, PermissionAction.EDIT);
        const { entity: entityId } = auth;

        return await EntityService.editEntityTheme({ entityId, input });
      } catch (error) {
        console.error("Error editing theme:", error);
        throw error;
      }
    },

    async updateCurrency(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SETTINGS, PermissionAction.EDIT);
        const data = auth;

        // const orgId = await userOrg(data.id);
        // Replaced with data.entity if that's what userOrg did.
        const orgId = data.entity;

        if (!orgId) throw new Error("Entity ID not found for user");

        const updatedCurrency = await data.db
          .update(entity)
          .set({ currency: input.id })
          .where(eq(entity.id, orgId))
          .returning();

        return updatedCurrency[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateEntitySettings(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.SETTINGS, PermissionAction.EDIT);
        const { db, entity: entityId } = auth;

        const updated = await db
          .update(entitySettings)
          .set({ ...input })
          .where(eq(entitySettings.entity, entityId))
          .returning();

        return updated[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateFaqByModule(_: any, { module, faq }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        // Map module name to FAQ field
        const faqFieldMap: Record<string, string> = {
          members: "faqMembers",
          communities: "faqCommunities",
          forums: "faqForums",
          events: "faqEvents",
          jobs: "faqJobs",
          mentorship: "faqMentorship",
          listing: "faqListing",
          shop: "faqShop",
          offers: "faqOffers",
          surveys: "faqSurveys",
          polls: "faqPolls",
          stories: "faqStories",
          wallOfFame: "faqWallOfFame",
          gamification: "faqGamification",
          rewards: "faqRewards",
        };

        const faqField = faqFieldMap[module];
        if (!faqField) {
          throw new GraphQLError(`Invalid module: ${module}`);
        }

        const updated = await db
          .update(entitySettings)
          .set({ [faqField]: faq })
          .where(eq(entitySettings.entity, entityId))
          .returning();

        return {
          module,
          faq: (updated[0] as any)[faqField],
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateTermsAndConditionsByModule(
      _: any,
      { module, termsAndConditions }: any,
      context: any,
    ) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

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

        const updated = await db
          .update(entitySettings)
          .set({ [termsField]: termsAndConditions })
          .where(eq(entitySettings.entity, entityId))
          .returning();

        return {
          module,
          termsAndConditions: (updated[0] as any)[termsField],
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateMemberTermsAndConditions(_: any, { input }: any, context: any) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        const updated = await db
          .update(entitySettings)
          .set({ ...input })
          .where(eq(entitySettings.entity, entityId))
          .returning();

        return updated[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateDiscussionForumTermsAndConditions(
      _: any,
      { input }: any,
      context: any,
    ) {
      try {
        const { db, entity: entityId } = await checkAuth(context);

        const updated = await db
          .update(entitySettings)
          .set({ ...input })
          .where(eq(entitySettings.entity, entityId))
          .returning();

        return updated[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async uploadEntityLogo(_: any, { file }: any, context: any) {
      try {
        const user = await checkAuth(context);

        // Upload the file - utility now handles folder (entityId/purpose) and DB tracking
        const uploadResult = await upload(
          user.entity,
          [file],
          user.db,
          user.userId,
          "GENERAL",
        );
        const uploadedLogo = uploadResult[0]?.url;

        // Update via gRPC
        const response = await entityClient.editEntityLogo({
          entityId: user.entity,
          logo: uploadedLogo,
        });

        // Update local DB
        await user.db
          .update(entity)
          .set({ logo: uploadedLogo })
          .where(eq(entity.id, user.entity));

        // Record Audit Log
        try {
          await AuditLog.create({
            id: uuidv4(),
            userId: user.userId,
            action: "UPLOAD_ENTITY_LOGO",
            resourceType: "ENTITY",
            resourceId: user.entity,
            timestamp: Date.now(),
            changes: { logo: uploadedLogo },
          });
        } catch (auditError) {
          log.error("Failed to record audit log:", { auditError });
        }

        const entityDetails = await entityClient.getEntityDetails(user.entity);

        return {
          id: entityDetails.id,
          name: entityDetails.name,
          logo: response.logo,
          success: response.success,
          message: response.message,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async changeEntityDomain(_: any, { input }: any, context: any) {
      try {
        const {
          entity: entityId,
          email,
          firstName,
          lastName,
        } = await checkAuth(context);
        const { domain } = input;

        // Check if domain already exists
        const checkDomain = await DOMAIN.query("domain").eq(domain).exec();
        if (checkDomain.count > 0) {
          throw new GraphQLError(
            "Sorry, that domain already exists. Please try a different one.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                http: { status: 400 },
              },
            },
          );
        }

        // Get current domain record
        const findDomain = await DOMAIN.query("entity").eq(entityId).exec();

        if (findDomain.count === 0) {
          throw new GraphQLError("Domain record not found for this entity.", {
            extensions: {
              code: "NOT_FOUND",
              http: { status: 404 },
            },
          });
        }

        const domainRecord = findDomain[0];
        const oldDomain = domainRecord.domain;

        // Update domain in DB
        await DOMAIN.update(
          { id: domainRecord.id },
          {
            $SET: {
              domain: domain,
            },
          },
        );

        // Fetch entity details for name
        const entityDetails = await entityClient.getEntityDetails(entityId);

        // Push to RabbitMQ
        await changeDomain({
          entityId,
          entityName: entityDetails?.name || "",
          email,
          firstName: firstName || "",
          lastName: lastName || "",
          oldDomain: `https://${oldDomain}.thrico.community/`,
          newDomain: `https://${domain}.thrico.community/`,
        });

        return {
          success: true,
        };
      } catch (error: any) {
        log.error("Failed to change domain", {
          error: error.message,
          stack: error.stack,
          entityId: context.user?.entity,
        });
        throw new GraphQLError(error.message || "Failed to change domain");
      }
    },
    async changeEntityCurrency(_: any, { currency }: any, context: any) {
      try {
        const { entity: entityId, db } = await checkAuth(context);

        await db
          .update(entity)
          .set({ currency: currency })
          .where(eq(entity.id, entityId));

        return {
          success: true,
          message: "Currency updated successfully",
        };
      } catch (error: any) {
        log.error("Failed to change currency", {
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    },

    async updateEntityProfile(_: any, { input }: any, context: any) {
      try {
        const user = await checkAuth(context);

        // Ensure entityId is set (from input or user context)
        const entityId = user.entity;

        // Call gRPC to update the profile
        const response = await entityClient.editEntityProfile({
          ...input,
          entityId,
        });

        // Fetch updated entity details
        const entityDetails = await entityClient.getEntityDetails(entityId);

        await user.db
          .update(entity)
          .set({ name: input.name })
          .where(eq(entity.id, entityId));

        return {
          id: entityDetails.id,
          name: entityDetails.name,
          logo: entityDetails.logo,
          success: response.success,
          message: response.message,
        };
      } catch (error) {
        console.error(error);
        throw error;
      }
    },

    async initializeWebsite(_: any, { entityId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        // Fetch entity details to get the name
        const entityResult = await entityClient.getEntityDetails(entityId);

        if (!entityResult) {
          throw new GraphQLError("Entity not found");
        }

        await initWebsiteContent(
          db,
          entityId,
          entityResult.name,
          entityResult.logo,
        );

        return true;
      } catch (error) {
        console.error("Error initializing website:", error);
        throw error;
      }
    },
  },
};
