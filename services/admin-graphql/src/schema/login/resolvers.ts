import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { DatabaseRegion, ErrorCode } from "@thrico/shared";
import {
  getDbForUser,
  loginSession,
  ADMIN,
  LOGIN_SESSION,
  OTP,
  ENTITY_MEMBER,
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
  DOMAIN,
  ENTITY_INDUSTRY,
  ENTITY_TYPE,
  ENTITY_THEME,
  AppDatabase,
  getDb as getDatabaseInstance,
} from "@thrico/database";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";
import checkAuthLogin from "../../utils/auth/checkAuthLogin.utils";
import sendOtp from "../../utils/sendOtp.utils";
import { decryptOtp } from "../../utils/crypto/otp.crypto";

import { entityClient } from "@thrico/grpc";
import { StorageService } from "@thrico/services";
import { seedDiscussionCategories } from "../../seed/seedDiscussionCategories";
import { initializeWebsite as initWebsiteContent } from "../../lib/website/create-default-pages";
import { seedDefaultGamification } from "../../lib/website/gamification-defaults.seed";
import {
  generateJwtLoginToken,
  generateJwtToken,
} from "../../utils/generateJwtToken.utils";

interface Context {
  headers: {
    authorization?: string;
    [key: string]: any;
  };
  requestId?: string;
  [key: string]: any;
}

const getDbByCountry = async (country: string) => {
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
  const db: AppDatabase = getDatabaseInstance(region);
  return db;
};
// checkDbByCountry replaced with getDbByCountry(country)

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

  const db = await getDbByCountry(country);

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

export const loginResolvers: any = {
  Query: {
    getMyAccounts: async (_: any, __: any, context: Context) => {
      try {
        const auth = await checkAuthLogin(context);
        const { userId } = auth;
        const result = await entityClient.getMyAccounts(userId);

        return result;
      } catch (error: any) {
        log.error("Error fetching my accounts", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch your accounts");
      }
    },
    getMyOtherAccounts: async (_: any, __: any, context: Context) => {
      try {
        const auth = await checkAuth(context);
        const { userId, email, entity } = auth;

        const result = await entityClient.getMyAccounts(userId);

        return result.filter((t: any) => t?.id !== entity);
      } catch (error: any) {
        log.error("Error fetching other accounts", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch your other accounts");
      }
    },
    getLoginUserDetails: async (_: any, __: any, context: Context) => {
      try {
        const auth = await checkAuthLogin(context);
        const { firstName, lastName, email, id, role } = auth;
        return { firstName, lastName, email, id, role };
      } catch (error: any) {
        log.error("Error fetching login user details", {
          error: error.message,
        });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch login user details");
      }
    },
  },

  Mutation: {
    registerAsAdmin: async (_: any, { input }: { input: any }) => {
      try {
        const { email, firstName, lastName, password } = input;

        // Check if accounts already exist for this email
        const check = await ADMIN.query("email")
          .eq(email)
          .using("EmailIndex")
          .exec();

        if (check.count > 0) {
          throw new GraphQLError("An account already exists with this email", {
            extensions: {
              code: ErrorCode.DUPLICATE_ENTRY,
              http: { status: 400 },
            },
          });
        }

        const newAdmin = await ADMIN.create({
          id: uuidv4(),
          email,
          firstName,
          lastName,
          role: "superAdmin",
          isEntityCreated: false,
          welcomeSent: false,
        });

        log.info("New admin registered", { email, adminId: newAdmin.id });

        return {
          success: true,
        };
      } catch (error: any) {
        log.error("Registration error", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Registration failed");
      }
    },

    logoutAdmin: async (_: any, __: any, context: Context) => {
      try {
        // await checkAuth(context);
        const token =
          context.headers?.authorization?.replace("Bearer ", "") ||
          context.requestId;
        const db = getDbForUser();

        await db
          .update(loginSession)
          .set({ logout: true, updatedAt: new Date() })
          .where(eq(loginSession.token, token || ""));

        return {
          success: true,
        };
      } catch (error: any) {
        log.error("Logout error", { error: error.message });
        throw new GraphQLError("Logout failed", {
          extensions: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            http: { status: 500 },
          },
        });
      }
    },

    logoutAdminAllDevices: async (_: any, __: any, context: Context) => {
      try {
        const data = await checkAuth(context);
        const db = getDbForUser();

        await db
          .update(loginSession)
          .set({ logout: true, updatedAt: new Date() })
          .where(eq(loginSession.userId, data.id));

        log.info("Admin logged out from all devices", { userId: data.id });
        return {
          success: true,
        };
      } catch (error: any) {
        log.error("Error logoutAdminAllDevices", { error: error.message });
        throw new GraphQLError("Logout all devices failed", {
          extensions: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            http: { status: 500 },
          },
        });
      }
    },

    adminLogin: async (_: any, { input }: { input: any }) => {
      try {
        const { email } = input;

        const adminUsers = await ADMIN.query("email")
          .eq(email)
          .using("EmailIndex")
          .exec();

        if (adminUsers.count === 0) {
          log.warn("Login failed: Email not found", { email });
          throw new GraphQLError("Email Not Found");
        }

        // Use the global userId from the matched admin record
        const personId = adminUsers[0].id;

        const results = await entityClient.getMyAccounts(personId);

        return results;
      } catch (error: any) {
        log.error("Login error", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Login failed");
      }
    },

    sendAdminLoginOtp: async (_: any, { input }: { input: any }) => {
      try {
        const { email, password } = input;

        // Fetch accounts for this email
        const check = await ADMIN.query("email")
          .eq(email)
          .using("EmailIndex")
          .exec();

        if (check.count === 0) {
          throw new GraphQLError("Email Not Found");
        }

        const admin = check[0];

        return sendOtp(admin);
      } catch (error: any) {
        log.error("Send OTP error", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to send OTP");
      }
    },

    otpLogin: async (_: any, { input }: { input: any }) => {
      try {
        const { otp, id } = input;

        const otpEntry = await OTP.query("id").eq(id).exec();

        if (otpEntry.count === 0) {
          log.warn("OTP login failed: OTP expired or invalid ID", { id });
          throw new GraphQLError("OTP Expired", {
            extensions: {
              code: ErrorCode.RECORD_NOT_FOUND,
              http: { status: 404 },
            },
          });
        }

        const check = otpEntry[0];
        let decryptedOtp: string;
        try {
          decryptedOtp = await decryptOtp(check.otp);
        } catch (e) {
          throw new GraphQLError("Failed to decrypt OTP", {
            extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
          });
        }

        if (decryptedOtp !== otp) {
          log.warn("OTP login failed: Invalid OTP", { id });
          throw new GraphQLError("Invalid OTP", {
            extensions: {
              code: ErrorCode.INVALID_CREDENTIALS,
              http: { status: 401 },
            },
          });
        }
        const jwt = await generateJwtLoginToken(check.userId);

        log.info("OTP verified, pre-auth token generated", {
          userId: check.userId,
        });
        return { token: jwt };
      } catch (error: any) {
        log.error("OTP Login error", { error: error.message });
        if (
          error.code === "ConditionalCheckFailedException" ||
          error.name === "ConditionalCheckFailedException"
        ) {
          throw new GraphQLError("OTP Expired", {
            extensions: {
              code: ErrorCode.TOKEN_EXPIRED,
              http: { status: 400 },
            },
          });
        } else if (error instanceof GraphQLError) {
          throw error;
        } else {
          throw new GraphQLError("Something went wrong", {
            extensions: {
              code: ErrorCode.INTERNAL_SERVER_ERROR,
              http: { status: 500 },
            },
          });
        }
      }
    },

    loginByEntityId: async (
      _: any,
      { entityId }: { entityId: string },
      context: Context,
    ) => {
      try {
        //   Use the token from input
        const auth = await checkAuthLogin(context);

        const { email, id } = auth;
        // Verify the membership
        console.log(entity);

        const sessionToken = await generateJwtToken({
          userId: id,
          entityId,
        });
        // Now create the actual login session
        await LOGIN_SESSION.create({
          id: `session-${Date.now()}`,
          userId: id,
          token: sessionToken,
          activeEntityId: entityId,
        });
        log.info("Session created for entityId", {
          email,
          entityId,
          adminId: id,
        });
        return { token: sessionToken };
      } catch (error: any) {
        log.error("Login by entityId error", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Login failed");
      }
    },
    registerEntity: async (_: any, { input }: any, context: any) => {
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
        const data = await checkAuthLogin(context);

        let uploadedLogo;

        if (logo) {
          const tempDb = await getDbByCountry(country);
          const result = await StorageService.uploadImages(
            [logo],
            "SYSTEM",
            "GENERAL",
            data?.id || "SYSTEM",
            tempDb,
          );
          uploadedLogo = result[0]?.file;
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
          createdBy: data?.id,
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

        const entityId = result?.id;
        const db = await getDbByCountry(country);

        // Seed discussion categories after entity registration
        // Passing data.db? checkAuth returns db, yes.
        if (db && id && data?.id) {
          try {
            await seedDiscussionCategories(db, result?.id, data.id);
          } catch (e) {
            console.error("Failed to seed discussion categories", e);
          }
        }

        if (db && id && data?.id) {
          try {
            await initWebsiteContent(db, result?.id, name, entityLogo, {
              theme: entityType,
              font: "inter",
            });
            await seedDefaultGamification(db, result?.id);
          } catch (e) {
            console.error("Failed to initialize website", e);
          }
        }

        const sessionToken = await generateJwtToken({
          userId: data?.id,
          entityId,
        });

        await LOGIN_SESSION.create({
          id: `session-${Date.now()}`,
          userId: data?.id,
          token: sessionToken,
          activeEntityId: entityId,
        });
        log.info("Session created for entityId", {
          email: data?.email,
          entityId,
          adminId: id,
        });
        return { token: sessionToken };
      } catch (error: any) {
        console.log(error);
        log.error("Failed to register entity", {
          error: error.message,
          stack: error.stack,
          input,
        });
        throw new GraphQLError(error.message || "Registration failed");
      }
    },
    switchToOtherAccount: async (
      _: any,
      { entityId }: { entityId: string },
      context: Context,
    ) => {
      try {
        const auth = await checkAuth(context);
        const { email, userId } = auth;
        const result = await ADMIN.query("id").eq(userId).exec();
        const targetAdmin = result[0];

        if (!targetAdmin || targetAdmin.email !== email) {
          throw new GraphQLError("Invalid user account", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        const sessionToken = await generateJwtToken({ userId, entityId });
        await LOGIN_SESSION.create({
          id: `session-${Date.now()}`,
          userId: userId,
          token: sessionToken,
          activeEntityId: entityId,
        });

        return { token: sessionToken };
      } catch (error: any) {
        log.error("Error switching account", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to switch account");
      }
    },
  },
};
