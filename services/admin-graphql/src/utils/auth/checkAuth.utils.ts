import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import { ADMIN, AppDatabase, getDb } from "@thrico/database";
import { DatabaseRegion, JWTPayload, ENV } from "@thrico/shared";
import { entityClient } from "@thrico/grpc";
import { decryptToken } from "../crypto/jwt.crypto";

export type AuthContext = {
  id: string; // Map to admin.id
  userId: string; // from JWT
  token: string;
  entity: string;
  entityId?: string; // from JWT/Admin
  db: AppDatabase;
  country: DatabaseRegion;
  email: string;
  firstName?: string;
  lastName?: string;
} & Partial<JWTPayload>;

const checkAuth = async (context: any): Promise<AuthContext> => {
  // // If context already has an authenticated user, return it
  // if (context.id && context.userId && context.db) {
  //   return context as AuthContext;
  // }

  const authHeaderRaw = context.headers?.authorization;

  if (!authHeaderRaw) {
    throw new GraphQLError("Permission Denied", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }

  const authHeader = await decryptToken(authHeaderRaw);

  if (!authHeader) {
    throw new GraphQLError("Permission Denied", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }

  const token = authHeader?.split("Bearer ")[1];

  if (!token) {
    throw new GraphQLError("Permission Denied", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }

  try {
    const decoded = jwt.verify(token, String(ENV.JWT_SECRET)) as JWTPayload;

    const adminResult = await ADMIN.query("id").eq(decoded.userId).exec();
    const admin = adminResult[0];

    if (!admin || admin.entityId === null) {
      throw new GraphQLError("Permission Denied", {
        extensions: { code: "FORBIDDEN", http: { status: 403 } },
      });
    }

    let region: DatabaseRegion = DatabaseRegion.IND;
    let entityId = "";

    if (admin.entityId) {
      const entity = await entityClient.getEntityDetails(admin.entityId);
      if (!entity) {
        throw new GraphQLError("Entity not found", {
          extensions: { code: "NOT_FOUND", http: { status: 404 } },
        });
      }

      const countryStr = entity.country?.toUpperCase();

      if (countryStr === "IND") {
        region = DatabaseRegion.IND;
      } else if (countryStr === "USA" || countryStr === "US") {
        region = DatabaseRegion.US;
      } else if (countryStr === "UAE") {
        region = DatabaseRegion.UAE;
      } else {
        throw new GraphQLError("Unsupported region", {
          extensions: { code: "BAD_REQUEST", http: { status: 400 } },
        });
      }
      entityId = entity.id;
    }

    console.log(region);
    const db = getDb(region);

    const { userId: _u, email: _e, ...restDecoded } = decoded;

    return {
      ...restDecoded,
      id: admin.id,
      userId: decoded.userId,
      token,
      entity: entityId,
      entityId: admin.entityId || decoded.entityId,
      db,
      country: region,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
    };
  } catch (err) {
    console.error("Auth error:", err);
    if (err instanceof GraphQLError) throw err;

    throw new GraphQLError("Invalid/Expired token", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }
};

export default checkAuth;
