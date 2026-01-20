import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { ErrorCode } from "@thrico/shared";
import {
  getDbForUser,
  loginSession,
  ADMIN,
  LOGIN_SESSION,
  OTP,
} from "@thrico/database";
import { log } from "@thrico/logging";

// Utilities
import checkAuth from "../../utils/auth/checkAuth.utils";
import sendOtp from "../../utils/sendOtp.utils";
import { decryptOtp } from "../../utils/crypto/otp.crypto";
import generateJwtToken from "../../utils/generateJwtToken.utils";
import { subscriptionClient } from "@thrico/grpc";
import uploadImageToFolder from "../../utils/upload/uploadImageToFolder.utils";

// Define a context type if not available globally, or use any if strictly necessary but better typed
interface Context {
  headers: {
    authorization?: string;
    [key: string]: any;
  };
  requestId?: string;
  [key: string]: any;
}

export const adminResolvers: any = {
  Query: {
    health: () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
    getUser: async (_: any, __: any, context: Context) => {
      try {
        const user = await checkAuth(context);
        // Authorization header might be Bearer token, we need the raw token or handled appropriately
        // checkAuth usually verifies token but here we explicitly check session

        const token =
          context.headers?.authorization?.replace("Bearer ", "") || "";

        if (!token) {
          throw new GraphQLError("Token missing", {
            extensions: {
              code: ErrorCode.UNAUTHORIZED,
              http: { status: 401 },
            },
          });
        }

        const sessionResult = await LOGIN_SESSION.query("token")
          .eq(token)
          .exec();

        // Dynamoose returns an array-like object
        const session = sessionResult[0];

        if (!session || session.logout) {
          log.warn("Session invalid or expired", { userId: user.id });
          throw new GraphQLError("Session expired or invalid", {
            extensions: {
              code: ErrorCode.FORBIDDEN,
              http: { status: 403 },
            },
          });
        }

        const adminResult = await ADMIN.query("id").eq(session.userId).exec();
        const admin = adminResult[0];

        if (!admin) {
          log.warn("Admin user found in session but not in DB", {
            userId: session.userId,
          });
          throw new GraphQLError("User not found", {
            extensions: {
              code: ErrorCode.RECORD_NOT_FOUND,
              http: { status: 404 },
            },
          });
        }

        return {
          status: true,
          ...admin,
        };
      } catch (error: any) {
        log.error("Error fetching admin user", {
          error: error.message,
          stack: error.stack,
        });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Internal server error", {
          extensions: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            http: { status: 500 },
            originalError: error.message,
          },
        });
      }
    },

    adminProfile: async (_: any, __: any, context: Context) => {
      try {
        const data = await checkAuth(context);
        return {
          email: data.email,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
        };
      } catch (error: any) {
        log.error("Error fetching admin profile", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch profile", {
          extensions: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            http: { status: 500 },
          },
        });
      }
    },
  },

  Mutation: {
    logoutAdmin: async (_: any, __: any, context: Context) => {
      try {
        const data = await checkAuth(context);
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

    registerAsAdmin: async (_: any, { input }: { input: any }) => {
      try {
        const { password, firstName, lastName, email, phone } = input;

        const check = await ADMIN.query("email")
          .eq(email)
          .using("EmailIndex")
          .count()
          .exec();

        if (check.count !== 0) {
          log.warn("Registration failed: Email already exists", { email });
          throw new GraphQLError(
            "An email with this address already exists. Please try another one",
            {
              extensions: {
                code: ErrorCode.DUPLICATE_ENTRY,
                http: { status: 400 },
              },
            }
          );
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const newAdmin = new ADMIN({
          password: hashPassword,
          firstName,
          lastName,
          email,
          phone,
          id: uuidv4(),
          isEntityCreated: false,
          welcomeSent: false,
        });

        await newAdmin.save();

        log.info("New admin registered", { email });
        return {
          success: true,
        };
      } catch (error: any) {
        log.error("Registration error", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Something went wrong during registration", {
          extensions: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            http: { status: 500 },
          },
        });
      }
    },

    loginAsAdmin: async (_: any, { input }: { input: any }) => {
      try {
        const { email, password } = input;

        const check = await ADMIN.query("email")
          .eq(email)
          .using("EmailIndex")
          .exec();

        if (check.count === 0) {
          log.warn("Login failed: Email not found", { email });
          throw new GraphQLError("Email Not Found", {
            extensions: {
              code: ErrorCode.RECORD_NOT_FOUND,
              http: { status: 404 },
            },
          });
        }

        const admin = check[0];
        const comparePassword = await bcrypt.compare(password, admin.password);

        if (!comparePassword) {
          log.warn("Login failed: Wrong credentials", { email });
          throw new GraphQLError("Wrong credentials", {
            extensions: {
              code: ErrorCode.INVALID_CREDENTIALS,
              http: { status: 401 },
            },
          });
        }

        log.info("Admin login successful, sending OTP", { email });
        return sendOtp(admin);
      } catch (error: any) {
        log.error("Login error", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Login failed", {
          extensions: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            http: { status: 500 },
          },
        });
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

        const jwt = await generateJwtToken(check);

        // Create a new login session in DynamoDB
        await LOGIN_SESSION.create({
          id: `session-${Date.now()}`,
          userId: check.userId,
          token: jwt,
        });

        log.info("OTP verified, session created", { userId: check.userId });
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

    uploadImage: async (_: any, { file }: { file: any }, context: Context) => {
      try {
        const data = await checkAuth(context);
        const org_id = data.entityId || "general";

        console.log(file);

        const url = await uploadImageToFolder(`${org_id}`, [file]);
        log.info("Image uploaded successfully", { org_id });
        return url[0].url;
      } catch (error: any) {
        log.error("Upload error", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Image upload failed", {
          extensions: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            http: { status: 500 },
          },
        });
      }
    },

    async updateEntityModule(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        console.log(input);

        const subscription = await subscriptionClient.updateEntityModules(
          entity,
          input
        );
        // const subscription = await checkEntitySubscription(entityId);

        return subscription;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
