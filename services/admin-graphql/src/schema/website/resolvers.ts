import { WebsiteCache } from "../../lib/redis-cache";
import { footers, modules, navbars, pages, websites } from "@thrico/database";
import { and, eq, ne } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";

const cache = new WebsiteCache();

export const websiteResolvers = {
  Query: {
    async getWebsite(_: any, { input }: any, context: any) {
      try {
        // Try cache first
        const { id, entity, db } = await checkAuth(context);
        log.debug("Auth check", { id, entity });
        const cached = await cache.getWebsite(entity);

        if (cached) return cached;

        // Fetch from database
        const website = await db.query.websites.findFirst({
          where: eq(websites.entityId, entity),
          with: {
            navbar: true,
            footer: true,
            pages: {
              with: {
                modules: {
                  orderBy: (modules: any, { asc }: any) => [asc(modules.order)],
                },
              },
              orderBy: (pages: any, { asc }: any) => [asc(pages.order)],
            },
          },
        });

        if (website && website.pages && website.pages.length > 0) {
          log.debug("Website fetched from DB", {
            modules: website.pages[0].modules,
          });
        }

        // Cache the result
        if (website) {
          await cache.setWebsite(entity, website);
          log.info("Website fetched from DB", { websiteId: website.id });
        }

        return website;
      } catch (error) {
        log.error("Error in getWebsite", { error });
        throw error;
      }
    },
    async getAllPagesSeo(_: any, { websiteId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const websitePages = await db.query.pages.findMany({
          where: eq(pages.websiteId, websiteId),
          orderBy: (p: any, { asc }: any) => [asc(p.order)],
        });
        return websitePages;
      } catch (error) {
        log.error("Error in getAllPagesSeo", { error });
        throw error;
      }
    },

    async getPageBySlug(_: any, { websiteId, slug }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const page = await db.query.pages.findFirst({
          where: and(eq(pages.websiteId, websiteId), eq(pages.slug, slug)),
          with: {
            modules: {
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
        };
      } catch (error) {
        log.error("Error in getPageBySlug", { error });
        throw error;
      }
    },
  },

  Mutation: {
    async updateWebsiteTheme(_: any, { websiteId, theme }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const [updatedWebsite] = await db
          .update(websites)
          .set({ theme, updatedAt: new Date() })
          .where(and(eq(websites.id, websiteId), eq(websites.entityId, entity)))
          .returning();

        if (!updatedWebsite) {
          throw new GraphQLError("Website not found or access denied.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await cache.invalidateWebsite(entity, websiteId);
        return updatedWebsite;
      } catch (error) {
        log.error("Error in updateWebsiteTheme", { error });
        throw error;
      }
    },

    async updateWebsiteFont(_: any, { websiteId, font }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const [updatedWebsite] = await db
          .update(websites)
          .set({ font, updatedAt: new Date() })
          .where(and(eq(websites.id, websiteId), eq(websites.entityId, entity)))
          .returning();

        if (!updatedWebsite) {
          throw new GraphQLError("Website not found or access denied.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await cache.invalidateWebsite(entity, websiteId);
        return updatedWebsite;
      } catch (error) {
        log.error("Error in updateWebsiteFont", { error });
        throw error;
      }
    },

    async updateWebsiteCustomColors(
      _: any,
      { websiteId, customColors }: any,
      context: any
    ) {
      try {
        const { db, entity } = await checkAuth(context);
        log.debug("Update website custom colors", { websiteId, customColors });

        if (customColors === undefined || customColors === null) {
          throw new GraphQLError(
            "customColors is required and cannot be null.",
            {
              extensions: { code: "BAD_USER_INPUT" },
            }
          );
        }

        // Build the update object conditionally
        const updateData: any = {
          updatedAt: new Date(),
        };

        // Only add customColors if it's a valid value
        if (customColors !== undefined && customColors !== null) {
          updateData.customColors = customColors;
        }

        const [updatedWebsite] = await db
          .update(websites)
          .set(updateData)
          .where(and(eq(websites.id, websiteId), eq(websites.entityId, entity)))
          .returning();

        log.info("Website custom colors updated", {
          websiteId,
          hasCustomColors: !!updatedWebsite?.customColors,
        });

        if (!updatedWebsite) {
          throw new GraphQLError("Website not found or access denied.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await cache.invalidateWebsite(entity, websiteId);
        return updatedWebsite.customColors;
      } catch (error) {
        log.error("Error in updateWebsiteCustomColors", { error });
        throw error;
      }
    },

    async updatePage(
      _: any,
      {
        pageId,
        name,
        slug,
        isEnabled,
        title,
        description,
        keywords,
        schemaMarkup,
        includeInSitemap,
      }: any,
      context: any
    ) {
      try {
        const { db, entity } = await checkAuth(context);

        const page = await db.query.pages.findFirst({
          where: eq(pages.id, pageId),
        });

        if (!page) {
          throw new GraphQLError("Page not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (slug) {
          const existingPage = await db.query.pages.findFirst({
            where: and(
              eq(pages.websiteId, page.websiteId),
              eq(pages.slug, slug),
              ne(pages.id, pageId)
            ),
          });

          if (existingPage) {
            throw new GraphQLError("A page with this slug already exists.", {
              extensions: { code: "BAD_USER_INPUT" },
            });
          }
        }

        // Merge existing SEO if updating only some fields, or start fresh if no SEO exists
        const currentSeo = (page.seo as any) || {};
        const updatedSeo = {
          ...currentSeo,
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(keywords !== undefined && { keywords }),
          ...(schemaMarkup !== undefined && { schemaMarkup }),
        };

        const [updatedPage] = await db
          .update(pages)
          .set({
            ...(name && { name }),
            ...(slug && { slug }),
            ...(isEnabled !== undefined && { isEnabled }),
            ...(includeInSitemap !== undefined && { includeInSitemap }),
            seo: updatedSeo,

            updatedAt: new Date(),
          })
          .where(eq(pages.id, pageId))
          .returning();

        await cache.invalidateWebsite(entity, page.websiteId);
        return updatedPage;
      } catch (error) {
        log.error("Error in updatePage", { error });
        throw error;
      }
    },

    async updatePageSeo(
      _: any,
      {
        pageId,
        title,
        description,
        keywords,
        schemaMarkup,
        includeInSitemap,
      }: any,
      context: any
    ) {
      try {
        const { db, entity } = await checkAuth(context);

        const page = await db.query.pages.findFirst({
          where: eq(pages.id, pageId),
        });

        if (!page) {
          throw new GraphQLError("Page not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const currentSeo = (page.seo as any) || {};
        const updatedSeo = {
          ...currentSeo,
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(keywords !== undefined && { keywords }),
          ...(schemaMarkup !== undefined && { schemaMarkup }),
        };

        const [updatedPage] = await db
          .update(pages)
          .set({
            seo: updatedSeo,
            ...(includeInSitemap !== undefined && { includeInSitemap }),
            updatedAt: new Date(),
          })
          .where(eq(pages.id, pageId))
          .returning();

        await cache.invalidateWebsite(entity, page.websiteId);
        return updatedPage;
      } catch (error) {
        log.error("Error in updatePageSeo", { error });
        throw error;
      }
    },

    async deletePage(_: any, { pageId }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const page = await db.query.pages.findFirst({
          where: eq(pages.id, pageId),
        });

        if (!page) {
          throw new GraphQLError("Page not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Delete associated modules first
        await db.delete(modules).where(eq(modules.pageId, pageId));

        // Delete the page
        const [deletedPage] = await db
          .delete(pages)
          .where(eq(pages.id, pageId))
          .returning();

        await cache.invalidateWebsite(entity, page.websiteId);

        return true; // Original was returning object, but Mutation return type logic says Boolean!
      } catch (error) {
        log.error("Error in deletePage", { error });
        throw error;
      }
    },

    async updateNavbar(
      _: any,
      { websiteId, layout, content, isEnabled }: any,
      context: any
    ) {
      try {
        const { id, entity, db } = await checkAuth(context);
        // Update database
        const [updated] = await db
          .update(navbars)
          .set({
            ...(layout && { layout }),
            ...(content && { content }),
            ...(isEnabled !== undefined && { isEnabled }),
            updatedAt: new Date(),
          })
          .where(eq(navbars.websiteId, websiteId))
          .returning();

        // Invalidate cache
        const website = await db.query.websites.findFirst({
          where: eq(websites.id, websiteId),
        });
        if (website) {
          await cache.invalidateWebsite(website.entityId, websiteId);
        }

        return updated;
      } catch (error) {
        log.error("Error in updateNavbar", { error });
        throw error;
      }
    },

    async updateFooter(
      _: any,
      { websiteId, layout, content, isEnabled }: any,
      context: any
    ) {
      try {
        const { id, entity, db } = await checkAuth(context);
        // Similar to updateNavbar
        const [updated] = await db
          .update(footers)
          .set({
            ...(layout && { layout }),
            ...(content && { content }),
            ...(isEnabled !== undefined && { isEnabled }),
            updatedAt: new Date(),
          })
          .where(eq(footers.websiteId, websiteId))
          .returning();

        const website = await db.query.websites.findFirst({
          where: eq(websites.id, websiteId),
        });
        if (website) {
          await cache.invalidateWebsite(website.entityId, websiteId);
        }

        return updated;
      } catch (error) {
        log.error("Error in updateFooter", { error });
        throw error;
      }
    },

    async createPage(_: any, { websiteId, name, slug }: any, context: any) {
      try {
        const { id, entity, db } = await checkAuth(context);

        // Check if a page with the same slug already exists for this website
        const existingPage = await db.query.pages.findFirst({
          where: and(eq(pages.websiteId, websiteId), eq(pages.slug, slug)),
        });

        if (existingPage) {
          throw new GraphQLError("A page with this slug already exists.", {
            extensions: {
              code: "BAD_USER_INPUT",
              http: { status: 400 },
            },
          });
        }

        // Get max order
        const existingPages = await db.query.pages.findMany({
          where: eq(pages.websiteId, websiteId),
        });
        const maxOrder = Math.max(
          ...existingPages.map((p: any) => p.order),
          -1
        );

        const seo = {
          title: name,
          description: name,
          keywords: [],
          schemaMarkup: null,
        };

        const [newPage] = await db
          .insert(pages)
          .values({
            websiteId,
            name,
            slug,
            order: maxOrder + 1,
            seo,
          })
          .returning();

        // Invalidate cache
        const website = await db.query.websites.findFirst({
          where: eq(websites.id, websiteId),
        });
        if (website) {
          await cache.invalidateWebsite(website.entityId, websiteId);
        }

        return newPage;
      } catch (error) {
        log.error("Error in createPage", { error });
        throw error;
      }
    },

    async updateModule(
      _: any,
      { moduleId, name, layout, content, isEnabled }: any,
      context: any
    ) {
      try {
        const { db, entity } = await checkAuth(context);

        const [updatedModule] = await db
          .update(modules)
          .set({
            ...(name && { name }),
            ...(layout && { layout }),
            ...(content && { content }),
            ...(isEnabled !== undefined && { isEnabled }),
            updatedAt: new Date(),
          })
          .where(eq(modules.id, moduleId))
          .returning();

        if (!updatedModule) {
          throw new GraphQLError("Module not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Get the page to find the websiteId
        const page = await db.query.pages.findFirst({
          where: eq(pages.id, updatedModule.pageId),
        });

        // Invalidate both page and website cache
        await cache.invalidatePage(updatedModule.pageId);
        if (page) {
          await cache.invalidateWebsite(entity, page.websiteId);
        }

        return updatedModule;
      } catch (error) {
        log.error("Error in updateModule", { error });
        throw error;
      }
    },

    async createModule(
      _: any,
      { pageId, type, name, layout, content }: any,
      context: any
    ) {
      try {
        const { id, entity, db } = await checkAuth(context);
        // Get max order
        const existingModules = await db.query.modules.findMany({
          where: eq(modules.pageId, pageId),
        });
        const maxOrder = Math.max(
          ...existingModules.map((m: any) => m.order),
          -1
        );

        const [newModule] = await db
          .insert(modules)
          .values({
            pageId,
            type,
            name,
            layout,
            content,
            order: maxOrder + 1,
          })
          .returning();

        // Get the page to find the websiteId
        const page = await db.query.pages.findFirst({
          where: eq(pages.id, pageId),
        });

        // Invalidate both page and website cache
        log.info("Module created", {
          moduleId: newModule.id,
          pageId: newModule.pageId,
        });
        await cache.invalidatePage(pageId);
        if (page) {
          await cache.invalidateWebsite(entity, page.websiteId);
        }

        return newModule;
      } catch (error) {
        log.error("Error in createModule", { error });
        throw error;
      }
    },

    async deleteModule(_: any, { moduleId }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const module = await db.query.modules.findFirst({
          where: eq(modules.id, moduleId),
        });

        if (!module) {
          throw new GraphQLError("Module not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Get the page to find the websiteId
        const page = await db.query.pages.findFirst({
          where: eq(pages.id, module.pageId),
        });

        await db.delete(modules).where(eq(modules.id, moduleId)).returning();

        // Invalidate both page and website cache
        await cache.invalidatePage(module.pageId);
        if (page) {
          await cache.invalidateWebsite(entity, page.websiteId);
        }

        return true;
      } catch (error) {
        log.error("Error in deleteModule", { error });
        throw error;
      }
    },

    async toggleModule(_: any, { moduleId, isEnabled }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [updatedModule] = await db
          .update(modules)
          .set({ isEnabled, updatedAt: new Date() })
          .where(eq(modules.id, moduleId))
          .returning();

        if (!updatedModule) {
          throw new GraphQLError("Module not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Get the page to find the websiteId
        const page = await db.query.pages.findFirst({
          where: eq(pages.id, updatedModule.pageId),
        });

        // Invalidate both page and website cache
        await cache.invalidatePage(updatedModule.pageId);
        if (page) {
          await cache.invalidateWebsite(entity, page.websiteId);
        }

        return updatedModule;
      } catch (error) {
        log.error("Error in toggleModule", { error });
        throw error;
      }
    },

    async reorderModules(_: any, { pageId, moduleIds }: any, context: any) {
      try {
        // Update order for each module
        const { id, entity, db } = await checkAuth(context);
        await Promise.all(
          moduleIds.map((id: string, index: number) =>
            db.update(modules).set({ order: index }).where(eq(modules.id, id))
          )
        );

        // Invalidate cache
        await cache.invalidatePage(pageId);

        // Return updated modules
        return db.query.modules.findMany({
          where: eq(modules.pageId, pageId),
          orderBy: (modules: any, { asc }: any) => [asc(modules.order)],
        });
      } catch (error) {
        log.error("Error in reorderModules", { error });
        throw error;
      }
    },
  },
};
