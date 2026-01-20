import { GraphQLError } from "graphql";
import { and, eq } from "drizzle-orm";
import {
  ENTITY_THEME,
  getDb,
  getDbForUser,
  type AppDatabase,
} from "@thrico/database";
import { entityClient, subscriptionClient } from "@thrico/grpc";
import { resolveEntityByDomain } from "../../utils/entity/domain.utils";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  userToEntity,
  entity,
  entityTag,
  userKyc,
  entitySettings,
  pages,
} from "@thrico/database";
import { AuthService } from "@thrico/services";
import { log } from "@thrico/logging";

// Export types for TypeScript
export interface InputKyc {
  input: {
    affliction: string[];
    referralSource: string[];
    comment: string;
    agreement: boolean;
    identificationNumber?: string;
  };
}

export interface CheckDomainArgs {
  domain: string;
}

export interface GetPageBySlugArgs {
  domain: string;
  slug: string;
}

export interface GetModuleFaqArgs {
  input: {
    module: string;
  };
}

export interface GetHeaderLinksArgs {
  domain: string;
}

const entityResolvers: any = {
  Query: {
    async checkDomain(_: any, { domain }: CheckDomainArgs) {
      try {
        const {
          entity: entityResult,
          domainData,
          db: dbInstance,
        } = (await resolveEntityByDomain(domain)) as any;

        const db = dbInstance as AppDatabase;

        const org = await db.query.entity.findFirst({
          where: eq(entity.id, entityResult.id),
        });

        const theme = await ENTITY_THEME.query("entity")
          .eq(domainData.entity)
          .exec();

        if (!org) {
          return new GraphQLError("Entity not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        return {
          ...org,
          theme: theme.toJSON()[0]
            ? theme.toJSON()[0]
            : {
                primaryColor: "#000000",
              },
        };
      } catch (error) {
        console.error(error);
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Internal server error", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getWebsitePageBySlug(
      _: any,
      { domain, slug }: GetPageBySlugArgs
    ): Promise<any> {
      try {
        const { db: dbInstance, website } = (await resolveEntityByDomain(
          domain
        )) as any;
        const db = dbInstance as AppDatabase;

        if (!website) {
          throw new GraphQLError("Website not found for this domain", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        const page = await db.query.pages.findFirst({
          where: and(eq(pages.websiteId, website.id), eq(pages.slug, slug)),
          with: {
            modules: {
              where: (m: any, { eq }: any) => eq(m.isEnabled, true),
              orderBy: (modules: any, { asc }: any) => [asc(modules.order)],
            },
            website: {
              with: {
                navbar: true,
                footer: true,
              },
            },
          },
        });

        if (!page) return null;

        return {
          ...page,
          navbar: (page as any).website?.navbar,
          footer: (page as any).website?.footer,
          font: (page as any).website?.font,
          customColors: (page as any).website?.customColors,
        };
      } catch (error) {
        console.error("getPageBySlug error:", { error, domain, slug });
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch page", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getWebsiteFont(_: any, { domain }: { domain: string }): Promise<any> {
      try {
        const { website } = await resolveEntityByDomain(domain);
        if (!website) {
          throw new GraphQLError("Website not found for this domain", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }
        return website.font;
      } catch (error) {
        console.error("getWebsiteFont error:", error);
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch website font", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getWebsiteCustomColor(
      _: any,
      { domain }: { domain: string }
    ): Promise<any> {
      try {
        const { website } = await resolveEntityByDomain(domain);
        if (!website) {
          return null;
        }
        return website.customColors;
      } catch (error) {
        console.error("getWebsiteCustomColor error:", { error, domain });
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch website custom colors", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getWebsiteCustomColors(
      _: any,
      { domain }: { domain: string }
    ): Promise<any> {
      try {
        const { website } = await resolveEntityByDomain(domain);
        if (!website) {
          return null;
        }
        return website.customColors;
      } catch (error) {
        console.error("getWebsiteCustomColors error:", { error, domain });
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch website custom colors", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getSitemapPages(
      _: any,
      { domain }: { domain: string }
    ): Promise<any> {
      try {
        const { db: dbInstance, website } = (await resolveEntityByDomain(
          domain
        )) as any;
        const db = dbInstance as AppDatabase;

        if (!website) {
          throw new GraphQLError("Website not found for this domain", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        const activePages = await db.query.pages.findMany({
          where: and(
            eq(pages.websiteId, website.id),
            eq(pages.isEnabled, true),
            eq(pages.includeInSitemap, true)
          ),
          with: {
            website: {
              with: {
                navbar: true,
                footer: true,
              },
            },
          },
        });

        return activePages.map((page: any) => ({
          ...page,
          navbar: page.website?.navbar,
          footer: page.website?.footer,
          font: page.website?.font,
          customColors: page.website?.customColors,
          sitemapUrl: `https://${domain}/${page.slug}`,
        }));
      } catch (error) {
        console.error("getSitemapPages error:", { error, domain });
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch sitemap pages", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getOrgDetails(_: any, __: any, context: any): Promise<any> {
      try {
        const { db, entityId } = await checkAuth(context);

        const check = await db.query.entity.findFirst({
          where: eq(entity.id, entityId!),
        });

        if (!check) {
          throw new GraphQLError("Organization not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        return check;
      } catch (error) {
        console.error("getOrgDetails error:", error);
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch organization details", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getEntityTag(_: any, __: any, context: any): Promise<any> {
      try {
        const { db, entityId } = await checkAuth(context);

        const tags = await db.query.entityTag.findMany({
          where: eq(entityTag.entity, entityId!),
        });

        return tags;
      } catch (error) {
        console.error("getEntityTag error:", error);
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch entity tags", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getModuleFaq(
      _: any,
      { input }: GetModuleFaqArgs,
      context: any
    ): Promise<any> {
      try {
        const { db, entityId } = await checkAuth(context);

        const faqs = await db.query.moduleFaqs.findMany({
          where: (moduleFaqs: any, { eq, and }: any) =>
            and(
              eq(moduleFaqs.entity, entityId),
              eq(moduleFaqs.faqModule, input.module)
            ),
          orderBy: (moduleFaqs: any, { asc }: any) => [asc(moduleFaqs.sort)],
        });

        return faqs;
      } catch (error) {
        console.error("getModuleFaq error:", error);
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch FAQs", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async getUser(_: any, __: any, context: any): Promise<any> {
      try {
        const { db, id } = await checkAuth(context);

        const user = await db.query.userToEntity.findFirst({
          where: eq(userToEntity.id, id),
        });

        if (!user) {
          throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND", http: { status: 404 } },
          });
        }

        return user;
      } catch (error) {
        console.error("getUser error:", error);
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to fetch user", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },
  },

  Mutation: {
    async checkSubscription(_: any, { input }: any, context: any) {
      try {
        const { entityId } = context.user || (await checkAuth(context));
        return AuthService.checkSubscription({
          entityId,
          checkEntitySubscriptionFn: (id) =>
            subscriptionClient.checkEntitySubscription(id),
        });
      } catch (error) {
        log.error("Error in checkSubscription", { error });
        throw error;
      }
    },
    async completeKyc(
      _: any,
      { input }: InputKyc,
      context: any
    ): Promise<{ success: boolean }> {
      try {
        const { affliction, referralSource, comment, agreement } = input;
        const { id, entityId, db } = await checkAuth(context);

        if (!entityId) {
          throw new GraphQLError("Entity ID not found", {
            extensions: { code: "BAD_REQUEST", http: { status: 400 } },
          });
        }

        const checkSettings = await db.query.entitySettings.findFirst({
          where: eq(entitySettings.entity, entityId),
        });

        await db.transaction(async (tx: any) => {
          await tx.insert(userKyc).values({
            affliction,
            referralSource,
            comment,
            agreement,
            entityId,
            userId: id,
          });

          await tx
            .update(userToEntity)
            .set({
              isRequested: true,
              isApproved: checkSettings?.autoApproveUser ? true : false,
              status: checkSettings?.autoApproveUser ? "APPROVED" : "PENDING",
            })
            .where(eq(userToEntity.id, id));
        });

        if (checkSettings?.autoApproveUser) {
          console.log("TODO: Trigger send email confirmation mail");
        }

        return {
          success: true,
        };
      } catch (error) {
        console.error("completeKyc error:", error);
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to complete KYC", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },

    async switchAccount(_: any, { input }: any, context: any): Promise<any> {
      try {
        // TODO: Implement switchAccount logic
        throw new GraphQLError("Not implemented", {
          extensions: {
            code: "NOT_IMPLEMENTED",
            http: { status: 501 },
          },
        });
      } catch (error) {
        console.error("switchAccount error:", error);
        throw error instanceof GraphQLError
          ? error
          : new GraphQLError("Failed to switch account", {
              extensions: {
                code: "INTERNAL_SERVER_ERROR",
                http: { status: 500 },
              },
            });
      }
    },
  },
};

export { entityResolvers };
