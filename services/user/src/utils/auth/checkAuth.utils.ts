import {
  DOMAIN,
  getDb,
  userToEntity,
  type AppDatabase,
} from "@thrico/database";
import { entityClient } from "@thrico/grpc";
import { DatabaseRegion, ENV } from "@thrico/shared";
import { and, eq } from "drizzle-orm";

import jwt from "jsonwebtoken";
import { decryptToken } from "../crypto/jwt.crypto";
import { IncomingHttpHeaders } from "http";
import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";

interface MiddlewareUser {
  id: string;
  entity: string;
  iat: number;
  exp: number;
}

interface UnauthenticatedContext {
  headers: IncomingHttpHeaders;
}

export interface AuthenticatedContext extends UnauthenticatedContext {
  id: string;
  userId: string;
  entityId: string;
  db: AppDatabase;
}

const domainCheck = async (
  domain: string | undefined
): Promise<string | null> => {
  if (!domain) return null;

  try {
    // Basic cleanup - this could be improved with URL parsing if the input is guaranteed to be a valid URL
    // but often 'origin' is just the domain or protocol + domain.
    const checkDomain = domain
      .replace(/^https?:\/\//, "") // Remove protocol
      .replace(/:[0-9]+$/, "") // Remove port
      .replace(/\.localhost$/, "") // Remove .localhost (for local testing quirks)
      .replace(/\.thrico\.community$/, ""); // Remove suffix if present

    const findDomain = await DOMAIN.query("domain").eq(checkDomain).exec();

    if (findDomain.count === 0) {
      log.debug("Domain not found in checkAuth", {
        domain: checkDomain,
        original: domain,
      });
      return null;
    }

    return findDomain.toJSON()[0].entity;
  } catch (error) {
    log.error("Error in domainCheck", { error, domain });
    return null;
  }
};

const checkAuth = async (
  context: UnauthenticatedContext
): Promise<AuthenticatedContext> => {
  if (!context.headers?.authorization) {
    throw new GraphQLError("Unauthorized");
  }

  try {
    const authHeaderRaw = context.headers.authorization;
    const authHeader = await decryptToken(authHeaderRaw);
    const origin = context.headers.origin as string | undefined;

    if (!authHeader) {
      log.warn("Failed to decrypt auth token");
      throw new GraphQLError("Unauthorized");
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : null;

    if (!token) {
      log.warn("No Bearer token found in decrypted header");
      throw new GraphQLError("Unauthorized");
    }
    log.debug("Verifying token with secret", { secret: ENV.JWT_SECRET });
    const userToken = jwt.verify(token, "123466") as MiddlewareUser;

    const domain = await domainCheck(origin);

    if (domain && userToken) {
      const check = await entityClient.getEntityDetails(userToken.entity);

      let region: DatabaseRegion = DatabaseRegion.IND;
      const countryStr = check.country?.toUpperCase();

      if (countryStr === "IND") {
        region = DatabaseRegion.IND;
      } else if (countryStr === "USA" || countryStr === "US") {
        region = DatabaseRegion.US;
      } else if (countryStr === "UAE") {
        region = DatabaseRegion.UAE;
      }

      const DB: AppDatabase = getDb(region);

      const entity = await DB.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity?.entityId, domain),
          eq(userToEntity?.userId, userToken.id)
        ),
      });

      if (!entity) {
        log.warn("User not found in entity", {
          userId: userToken.id,
          entityId: domain,
        });
        throw new GraphQLError("Unauthorized");
      }

      return {
        id: entity.id,
        userId: entity.userId,
        entityId: entity.entityId,
        db: DB,
        headers: context.headers,
      };
    } else {
      log.debug("Auth failed: Invalid domain or user token", {
        domain,
        userTokenId: userToken?.id,
      });
      throw new GraphQLError("Unauthorized");
    }
  } catch (err) {
    // common to have jsonwebtoken errors if token is invalid/expired
    log.error("Error in checkAuth", { error: err });
    throw new GraphQLError("Unauthorized");
  }
};

export default checkAuth;
