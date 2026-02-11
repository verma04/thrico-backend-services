import { GraphQLError } from "graphql";
import * as jwt from "jsonwebtoken";
import { log } from "@thrico/logging";
import { decryptToken } from "../crypto/jwt.crypto";
import { getDb } from "@thrico/database";
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

        if (!userToken.sessionId) {
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
        throw new GraphQLError("Invalid/Expired token", {
          extensions: {
            code: 403,
            http: { status: 403 },
          },
        });
      }
    }
    throw new GraphQLError("Permission Denied", {
      extensions: {
        code: 403,
        http: { status: 403 },
      },
    });
  }
  throw new GraphQLError("Permission Denied", {
    extensions: {
      code: 403,
      http: { status: 403 },
    },
  });
};

export default checkAuth;
