import { GraphQLError } from "graphql";
import {
  CUSTOM_DOMAIN,
  DOMAIN,
  getDbForUser,
  websites,
  type AppDatabase,
} from "@thrico/database";
import { entityClient } from "@thrico/grpc";
import { eq } from "drizzle-orm";

export interface ResolvedEntity {
  entity: any;
  domainData: any;
  db: AppDatabase;
  website: any;
}

export async function resolveEntityByDomain(
  domain: string
): Promise<ResolvedEntity> {
  const cleanDomain = domain
    ?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  if (!cleanDomain) {
    console.error("resolveEntityByDomain: Invalid domain provided", {
      original: domain,
    });
    throw new GraphQLError("Invalid domain provided", {
      extensions: { code: "BAD_USER_INPUT", http: { status: 400 } },
    });
  }

  // 1. Try exact match in DOMAIN
  let domainResult = await DOMAIN.query("domain").eq(cleanDomain).exec();

  // 2. Try exact match in CUSTOM_DOMAIN
  if (domainResult.count === 0) {
    const customDomainResult = await CUSTOM_DOMAIN.query("domain")
      .eq(cleanDomain)
      .exec();
    if (customDomainResult.count > 0) {
      domainResult = customDomainResult;
    }
  }

  // 3. Fallback: Check for subdomain if not found and matches known suffixes
  if (domainResult.count === 0) {
    const suffixRegex =
      /(\.thrico\.network|\.thrico\.community|\.localhost:\d+)$/;
    const match = cleanDomain.match(suffixRegex);
    if (match) {
      const potentialSub = cleanDomain.replace(suffixRegex, "");
      const subResult = await DOMAIN.query("domain").eq(potentialSub).exec();
      if (subResult.count > 0) {
        domainResult = subResult;
      }
    }
  }

  if (domainResult.count === 0) {
    throw new GraphQLError("No Domain Found", {
      extensions: { code: "NOT_FOUND", http: { status: 404 } },
    });
  }

  const domainData = domainResult.toJSON()[0];
  const entityResult = await entityClient.getEntityDetails(domainData.entity);

  if (!entityResult) {
    throw new GraphQLError("No Entity Found", {
      extensions: { code: "NOT_FOUND", http: { status: 404 } },
    });
  }

  const db = (await getDbForUser(entityResult.country)) as AppDatabase;

  // Get website for this entity
  const website = await db.query.websites.findFirst({
    where: eq(websites.entityId, entityResult.id),
  });

  return {
    entity: entityResult,
    domainData,
    db,
    website,
  };
}
