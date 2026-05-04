import { GraphQLError } from "graphql";
import * as jwt from "jsonwebtoken";
import { log } from "@thrico/logging";
import { decryptToken } from "../crypto/jwt.crypto";
import { getDb, USER_LOGIN_SESSION } from "@thrico/database";
import { ENV, DatabaseRegion } from "@thrico/shared";

// Define the type locally since the imported one doesn't exist in mobile service
export interface middlewareUser {
  userId: string;
  email: string;
  role: string;
  country: DatabaseRegion;
  sessionId: string;
  entityId: string;
  id: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

const authCache = new WeakMap<any, any>();

const checkAuth = async (context: any): Promise<any> => {
  if (context && authCache.has(context)) {
    return authCache.get(context);
  }
  if (!context.headers?.authorization) {
    log.error(
      "Authentication failed: Authorization header missing",
      context.headers,
    );
    throw new GraphQLError("Permission Denied", {
      extensions: {
        code: 403,
        http: { status: 403 },
      },
    });
  }

  const authHeader = await decryptToken(context.headers?.authorization);

  if (authHeader) {
    const token = authHeader?.split("Bearer ")[1];
    if (token) {
      try {
        const userToken = jwt.verify(
          token,
          process.env.JWT_TOKEN ||
            process.env.JWT_SECRET ||
            String(ENV.JWT_SECRET),
        ) as middlewareUser;

        const sessionResult = await USER_LOGIN_SESSION.query("id")
          .eq(userToken.sessionId)
          .exec();

        if (!sessionResult || sessionResult.count === 0) {
          log.error("Authentication failed: Session ID missing or invalid", {
            userId: userToken.userId,
            sessionId: userToken.sessionId,
          });
          throw new GraphQLError("Permission Denied: Invalid Session", {
            extensions: {
              code: 403,
              http: { status: 403 },
            },
          });
        }

        const db = getDb(userToken.country);
        const userExists = await db.query.userToEntity.findFirst({
          where: (ute: any, { eq, and, ne }: any) =>
            and(
              eq(ute.id, userToken.id),
              eq(ute.entityId, userToken.entityId),
              ne(ute.status, "DELETED"),
            ),
        });

        if (!userExists) {
          log.error("Authentication failed: User record missing or deleted", {
            userId: userToken.userId,
            id: userToken.id,
            entityId: userToken.entityId,
          });
          throw new GraphQLError("Permission Denied: User not found", {
            extensions: {
              code: 403,
              http: { status: 403 },
            },
          });
        }

        const result = {
          ...userToken,
          db,
          sessionResult,
        };
        if (context) {
          authCache.set(context, result);
        }
        return result;
      } catch (err) {
        if (err instanceof GraphQLError) throw err;
        log.error("Authentication failed: Invalid or expired token", {
          error: err instanceof Error ? err.message : String(err),
        });
        throw new GraphQLError("Invalid/Expired token", {
          extensions: {
            code: 403,
            http: { status: 403 },
          },
        });
      }
    }
    log.error("Authentication failed: Bearer token missing in header");
    throw new GraphQLError("Permission Denied", {
      extensions: {
        code: 403,
        http: { status: 403 },
      },
    });
  }
  log.error("Authentication failed: Token decryption failed");
  throw new GraphQLError("Permission Denied", {
    extensions: {
      code: 403,
      http: { status: 403 },
    },
  });
};

export default checkAuth;
