import { GraphQLError } from "graphql";
import { v4 as uuidv4 } from "uuid";
import { DatabaseRegion } from "@thrico/shared";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  entity,
  entitySettings,
  entitySettingsGroups,
  razorpay,
  stripe,
  theme,
  trendingConditionsGroups,
  entitySettingsUser,
  trendingConditionsJobs,
  trendingConditionsListing,
  entitySettingsListing,
  entitySettingsEvents,
  trendingConditionsEvents,
  trendingConditionsStories,
  entityStoriesSettings,
  highlights,
  orgSocialMedia,
  getDb,
} from "@thrico/database";

import { log } from "@thrico/logging"; // Added import
import {
  ADMIN,
  DOMAIN,
  ENTITY_INDUSTRY,
  ENTITY_TYPE,
  ENTITY_THEME,
} from "@thrico/database";

import { eq } from "drizzle-orm";
import upload from "../../utils/upload/uploadImageToFolder.utils";
// import { userOrg } from "./mentorship.resolvers"; // Replaced with context.entity check

import { countryClient, entityClient, subscriptionClient } from "@thrico/grpc";

import { seedDiscussionCategories } from "../../seed/seedDiscussionCategories";
import { initializeWebsite as initWebsiteContent } from "../../lib/website/create-default-pages";
import { changeDomain } from "../../queue/email-rabbit";

const shardCountry = async ({
  entityDomain,
  address,
  name,
  entityType,
  country,
  website,
  uploadedLogo,
  id,
  userId,
}: any) => {
  // Map country code to DatabaseRegion
  let region: DatabaseRegion;
  switch (country) {
    case "IND":
      region = DatabaseRegion.IND;
      break;
    case "USA":
      region = DatabaseRegion.US;
      break;
    case "UAE":
      region = DatabaseRegion.UAE;
      break;
    default:
      region = DatabaseRegion.IND; // Default fallback
  }

  // checkDbByCountry replaced with getDb(country)
  const db = getDb(region);

  await db.transaction(async (tx: any) => {
    const createEntity = await tx
      .insert(entity)
      .values({
        id,
        address,
        entityType,
        name,
        timeZone: "sdsd",
        logo: uploadedLogo ? uploadedLogo : "thricoLogo.png",
        website,
        userId,
        favicon: uploadedLogo,
        country,
      })
      .returning();

    await tx.insert(theme).values({
      entityId: createEntity[0]?.id,
    });

    await tx.insert(razorpay).values({
      isEnabled: false,
      entity: createEntity[0]?.id,
    });
    await tx.insert(entitySettings).values({
      entity: createEntity[0]?.id,
    });
    await tx.insert(entitySettingsUser).values({
      entity: createEntity[0]?.id,
    });
    await tx.insert(entitySettingsGroups).values({
      entity: createEntity[0]?.id,
      autoApprove: false,
    });
    await tx.insert(entitySettingsEvents).values({
      entity: createEntity[0]?.id,
      autoApprove: false,
    });
    await tx.insert(entitySettingsListing).values({
      entity: createEntity[0]?.id,
      autoApprove: false,
    });

    await tx.insert(entityStoriesSettings).values({
      entity: createEntity[0]?.id,
      autoApprove: false,
    });
    await tx.insert(trendingConditionsGroups).values({
      entity: createEntity[0]?.id,
    });

    await tx.insert(trendingConditionsJobs).values({
      entity: createEntity[0]?.id,
    });
    await tx.insert(trendingConditionsListing).values({
      entity: createEntity[0]?.id,
    });
    await tx.insert(trendingConditionsEvents).values({
      entity: createEntity[0]?.id,
    });

    await tx.insert(trendingConditionsStories).values({
      entity: createEntity[0]?.id,
    });
    await tx.insert(stripe).values({
      isEnabled: false,
      entity: createEntity[0]?.id,
    });
    await tx.insert(orgSocialMedia).values({
      entity: createEntity[0]?.id,
    });

    await tx.insert(highlights).values({
      title: `Welcome to ${name} Community`, // Fixed: entity.name -> name (local var)
      entity: createEntity[0]?.id,
      highlightsType: "ANNOUNCEMENT",
      isExpirable: false,
    });

    await DOMAIN.create({
      domain: entityDomain,
      entity: id,
    });
  });
};

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
        await checkAuth(context);

        const countries = await countryClient.getAllCountries();
        return countries;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async checkDomain(_: any, { input }: any, context: any) {
      try {
        await checkAuth(context);

        const findDomain = await DOMAIN.query("domain").eq(input.domain).exec();

        if (findDomain.count !== 0) {
          return new GraphQLError(
            "Sorry, that domain already exists. Please try a different one.",
            {
              extensions: {
                code: "NOT FOUND",
                http: { status: 400 },
              },
            }
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
      context: any
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
        const { entity: entityId } = await checkAuth(context);

        const theme = await ENTITY_THEME.query("entity").eq(entityId).exec();

        return theme.toJSON()[0] ? theme.toJSON()[0] : null;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async checkEntitySubscription(_: any, { input }: any, context: any) {
      try {
        const { entity: entityId } = await checkAuth(context);

        const subscription = await subscriptionClient.checkEntitySubscription(
          entityId
        );

        return subscription;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async registerEntity(_: any, { input }: any, context: any) {
      try {
        const {
          domain: entityDomain,
          address,
          name,
          entityType,
          industryType,
          country,
          logo,
          website,
          designation,
          phone,
          language,
          domain,
          agreement,
        } = input;

        // checkAuth might fail if no token, but registerEntity implies new user?
        // Or existing user creating entity?
        // User code: const data = await checkAuth(context);
        const data = await checkAuth(context);

        let uploadedLogo;

        if (logo) {
          const result = await upload("entity-logos", [logo]);
          uploadedLogo = result[0]?.url;
        }

        if (!data?.id) {
          throw new GraphQLError("User ID is required to register an entity");
        }

        const id = uuidv4();

        const entityLogo = uploadedLogo ? uploadedLogo : "thricoLogo.png";
        const entityData = {
          id,
          address,
          entityType,
          industryType,
          name,
          designation,
          country,
          phone,
          language,
          logo: entityLogo,
          website,
          userId: data.id,
          favicon: entityLogo,
          domain: entityDomain,
          subscriptionId: "",
          agreement,
        };

        const result = await entityClient.registerEntity(entityData);
        // Using id from input or result? User code implicitly used entity.id from result

        await shardCountry({
          entityDomain,
          address,
          name,
          entityType,
          country,
          website,
          entityLogo,
          id: result?.id, // Using the generated UUID
          userId: data?.id || null,
        });

        // // Seed discussion categories after entity registration
        // // Passing data.db? checkAuth returns db, yes.
        if (data?.db && id && data?.id) {
          try {
            await seedDiscussionCategories(data.db, result?.id, data.id);
          } catch (e) {
            console.error("Failed to seed discussion categories", e);
          }
        }

        if (data?.db && id && data?.id) {
          try {
            await initWebsiteContent(data.db, result?.id, name, entityLogo, {
              theme: entityType,
              font: "inter",
            });
          } catch (e) {
            console.error("Failed to initialize website", e);
          }
        }

        return {
          success: true,
        };
      } catch (error: any) {
        log.error("Failed to register entity", {
          error: error.message,
          stack: error.stack,
          input,
        });
        throw new GraphQLError(error.message || "Registration failed");
      }
    },
    async editEntityTheme(_: any, { input }: any, context: any) {
      try {
        const { entity: entityId } = await checkAuth(context);

        const existingThemeResult = await ENTITY_THEME.query("entity")
          .eq(entityId)
          .exec();

        let themeItem;

        if (existingThemeResult.count > 0) {
          themeItem = existingThemeResult[0];

          await ENTITY_THEME.update(
            { id: themeItem.id },
            {
              $SET: {
                ...input,
                entity: entityId,
              },
            }
          );
        } else {
          // Create new item — id will be auto-generated
          await ENTITY_THEME.create({
            ...input,
            entity: entityId,
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Error editing theme:", error);
        throw error;
      }
    },

    async updateCurrency(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);

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
      context: any
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
      context: any
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

        // Upload the file
        const uploadResult = await upload("entity-logos", [file]);
        const uploadedLogo = uploadResult[0]?.url;

        // Update via gRPC
        const response = await entityClient.editEntityLogo({
          entityId: user.entity,
          logo: uploadedLogo,
        });

        // Optionally, fetch updated entity details - commented out in user code or used?
        // User code: const entityDetails = await getEntityDetails(user.entity);
        // It fetches it.
        const entityDetails = await entityClient.getEntityDetails(user.entity);

        // Update local DB if necessary? User code did:
        // await user.db.update(entity).set({ logo: uploadedLogo })...

        await user.db
          .update(entity)
          .set({ logo: uploadedLogo })
          .where(eq(entity.id, user.entity));

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
            }
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
          }
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
          entityResult.logo
        );

        return true;
      } catch (error) {
        console.error("Error initializing website:", error);
        throw error;
      }
    },
  },
};
