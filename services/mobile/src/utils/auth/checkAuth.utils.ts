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

        const db = getDb(userToken.country);

        const sessionResult = await USER_LOGIN_SESSION.query("id")
          .eq(userToken.sessionId)
          .exec();

        if (!sessionResult) {
          log.error("Authentication failed: Session ID missing in token", {
            userId: userToken.userId,
            country: userToken.country,
          });
          throw new GraphQLError("Permission Denied: Session ID missing", {
            extensions: {
              code: 403,
              http: { status: 403 },
            },
          });
        }

        // console.log("userToken", userToken);
        const result = { ...userToken, db };
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
