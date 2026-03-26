import { GraphQLError } from "graphql";
import { ErrorCode } from "@thrico/shared";
import { ADMIN, LOGIN_SESSION, ENTITY_MEMBER, roles } from "@thrico/database";
import { log } from "@thrico/logging";
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";

// Utilities
import checkAuth from "../../utils/auth/checkAuth.utils";
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
          role: user.role,
          roleId: user.role?.id,
          isSuperAdmin: user.role?.isSystem,
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
    uploadImage: async (_: any, { file }: { file: any }, context: Context) => {
      try {
        const data = await checkAuth(context);
        const org_id = data.entityId || "general";

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
        const auth = await checkAuth(context);
        ensurePermission(
          auth,
          AdminModule.PLATFORM_FEATURES,
          PermissionAction.EDIT,
        );
        const { entity } = auth;

        const subscription = await subscriptionClient.updateEntityModules(
          entity,
          input,
        );

        return subscription;
      } catch (error: any) {
        log.error("Error updating entity module", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw error;
      }
    },
  },
};
