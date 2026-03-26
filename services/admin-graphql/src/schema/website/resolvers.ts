import { WebsiteCache } from "../../lib/redis-cache";
import { footers, modules, navbars, pages, websites } from "@thrico/database";
import { and, eq, ne } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";

const cache = new WebsiteCache();

import { createAuditLog } from "../../utils/audit/auditLog.utils";

// const cache = new WebsiteCache();

export const websiteResolvers = {
  Query: {
    async getWebsite(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.READ);
        const { id, entity, db } = auth;

        const cached = await cache.getWebsite(entity);
        if (cached) return cached;

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

        if (website) {
          await cache.setWebsite(entity, website);
        }

        return website;
      } catch (error) {
        log.error("Error in getWebsite", { error });
        throw error;
      }
    },
    async getAllPagesSeo(_: any, { websiteId }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.READ);
        const { db } = auth;

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
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.READ);
        const { db } = auth;

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
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.APPEARANCE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

        const previousState = await db.query.websites.findFirst({
          where: and(eq(websites.id, websiteId), eq(websites.entityId, entity)),
        });

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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.APPEARANCE,
          action: "UPDATE_THEME",
          resourceId: websiteId,
          previousState,
          newState: updatedWebsite,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        await cache.invalidateWebsite(entity, websiteId);
        return updatedWebsite;
      } catch (error) {
        log.error("Error in updateWebsiteTheme", { error });
        throw error;
      }
    },

    async updateWebsiteFont(_: any, { websiteId, font }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.APPEARANCE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

        const previousState = await db.query.websites.findFirst({
          where: and(eq(websites.id, websiteId), eq(websites.entityId, entity)),
        });

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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.APPEARANCE,
          action: "UPDATE_FONT",
          resourceId: websiteId,
          previousState,
          newState: updatedWebsite,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

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
      context: any,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.APPEARANCE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

        const previousState = await db.query.websites.findFirst({
          where: and(eq(websites.id, websiteId), eq(websites.entityId, entity)),
        });

        if (customColors === undefined || customColors === null) {
          throw new GraphQLError(
            "customColors is required and cannot be null.",
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }

        const [updatedWebsite] = await db
          .update(websites)
          .set({ customColors, updatedAt: new Date() })
          .where(and(eq(websites.id, websiteId), eq(websites.entityId, entity)))
          .returning();

        if (!updatedWebsite) {
          throw new GraphQLError("Website not found or access denied.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.APPEARANCE,
          action: "UPDATE_CUSTOM_COLORS",
          resourceId: websiteId,
          previousState: previousState?.customColors,
          newState: updatedWebsite.customColors,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        await cache.invalidateWebsite(entity, websiteId);
        return updatedWebsite.customColors;
      } catch (error) {
        log.error("Error in updateWebsiteCustomColors", { error });
        throw error;
      }
    },

    async updatePage(_: any, input: any, context: any) {
      try {
        const {
          pageId,
          name,
          slug,
          isEnabled,
          title,
          description,
          keywords,
          schemaMarkup,
          includeInSitemap,
        } = input;
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

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
              ne(pages.id, pageId),
            ),
          });

          if (existingPage) {
            throw new GraphQLError("A page with this slug already exists.", {
              extensions: { code: "BAD_USER_INPUT" },
            });
          }
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
            ...(name && { name }),
            ...(slug && { slug }),
            ...(isEnabled !== undefined && { isEnabled }),
            ...(includeInSitemap !== undefined && { includeInSitemap }),
            seo: updatedSeo,
            updatedAt: new Date(),
          })
          .where(eq(pages.id, pageId))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "UPDATE_PAGE",
          resourceId: pageId,
          previousState: page,
          newState: updatedPage,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        await cache.invalidateWebsite(entity, page.websiteId);
        return updatedPage;
      } catch (error) {
        log.error("Error in updatePage", { error });
        throw error;
      }
    },

    async updatePageSeo(_: any, input: any, context: any) {
      try {
        const {
          pageId,
          title,
          description,
          keywords,
          schemaMarkup,
          includeInSitemap,
        } = input;
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "UPDATE_PAGE_SEO",
          resourceId: pageId,
          previousState: page.seo,
          newState: updatedPage.seo,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        await cache.invalidateWebsite(entity, page.websiteId);
        return updatedPage;
      } catch (error) {
        log.error("Error in updatePageSeo", { error });
        throw error;
      }
    },

    async deletePage(_: any, { pageId }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.DELETE);
        const { db, entity, id: adminId } = auth;

        const page = await db.query.pages.findFirst({
          where: eq(pages.id, pageId),
        });

        if (!page) {
          throw new GraphQLError("Page not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await db.delete(modules).where(eq(modules.pageId, pageId));

        const [deletedPage] = await db
          .delete(pages)
          .where(eq(pages.id, pageId))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "DELETE_PAGE",
          resourceId: pageId,
          previousState: page,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        await cache.invalidateWebsite(entity, page.websiteId);
        return true;
      } catch (error) {
        log.error("Error in deletePage", { error });
        throw error;
      }
    },

    async updateNavbar(
      _: any,
      { websiteId, layout, content, isEnabled }: any,
      context: any,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.APPEARANCE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

        const previousState = await db.query.navbars.findFirst({
          where: eq(navbars.websiteId, websiteId),
        });

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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.APPEARANCE,
          action: "UPDATE_NAVBAR",
          resourceId: websiteId,
          previousState,
          newState: updated,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

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
      context: any,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.APPEARANCE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

        const previousState = await db.query.footers.findFirst({
          where: eq(footers.websiteId, websiteId),
        });

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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.APPEARANCE,
          action: "UPDATE_FOOTER",
          resourceId: websiteId,
          previousState,
          newState: updated,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

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
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.CREATE);
        const { id: adminId, entity, db } = auth;

        const existingPage = await db.query.pages.findFirst({
          where: and(eq(pages.websiteId, websiteId), eq(pages.slug, slug)),
        });

        if (existingPage) {
          throw new GraphQLError("A page with this slug already exists.", {
            extensions: { code: "BAD_USER_INPUT", http: { status: 400 } },
          });
        }

        const existingPagesList = await db.query.pages.findMany({
          where: eq(pages.websiteId, websiteId),
        });
        const maxOrder = Math.max(
          ...existingPagesList.map((p: any) => p.order),
          -1,
        );

        const seo = {
          title: name,
          description: name,
          keywords: [],
          schemaMarkup: null,
        };

        const [newPage] = await db
          .insert(pages)
          .values({ websiteId, name, slug, order: maxOrder + 1, seo })
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "CREATE_PAGE",
          resourceId: newPage.id,
          newState: newPage,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

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
      context: any,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

        const previousState = await db.query.modules.findFirst({
          where: eq(modules.id, moduleId),
        });

        if (!previousState) {
          throw new GraphQLError("Module not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "UPDATE_MODULE",
          resourceId: moduleId,
          previousState,
          newState: updatedModule,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        const page = await db.query.pages.findFirst({
          where: eq(pages.id, updatedModule.pageId),
        });

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
      context: any,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.CREATE);
        const { id: adminId, entity, db } = auth;

        const existingModulesList = await db.query.modules.findMany({
          where: eq(modules.pageId, pageId),
        });
        const maxOrder = Math.max(
          ...existingModulesList.map((m: any) => m.order),
          -1,
        );

        const [newModule] = await db
          .insert(modules)
          .values({ pageId, type, name, layout, content, order: maxOrder + 1 })
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "CREATE_MODULE",
          resourceId: newModule.id,
          newState: newModule,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        const page = await db.query.pages.findFirst({
          where: eq(pages.id, pageId),
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
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.DELETE);
        const { db, entity, id: adminId } = auth;

        const moduleRecord = await db.query.modules.findFirst({
          where: eq(modules.id, moduleId),
        });

        if (!moduleRecord) {
          throw new GraphQLError("Module not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await db.delete(modules).where(eq(modules.id, moduleId));

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "DELETE_MODULE",
          resourceId: moduleId,
          previousState: moduleRecord,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        const page = await db.query.pages.findFirst({
          where: eq(pages.id, moduleRecord.pageId),
        });

        await cache.invalidatePage(moduleRecord.pageId);
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
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

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

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "TOGGLE_MODULE",
          resourceId: moduleId,
          newState: updatedModule,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        const page = await db.query.pages.findFirst({
          where: eq(pages.id, updatedModule.pageId),
        });

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
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.WEBSITE, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;

        const previousState = await db.query.modules.findMany({
          where: eq(modules.pageId, pageId),
          orderBy: (m: any, { asc }: any) => [asc(m.order)],
        });

        await Promise.all(
          moduleIds.map((id: string, index: number) =>
            db.update(modules).set({ order: index }).where(eq(modules.id, id)),
          ),
        );

        const newState = await db.query.modules.findMany({
          where: eq(modules.pageId, pageId),
          orderBy: (m: any, { asc }: any) => [asc(m.order)],
        });

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.WEBSITE,
          action: "REORDER_MODULES",
          resourceId: pageId,
          previousState,
          newState,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        await cache.invalidatePage(pageId);
        return newState;
      } catch (error) {
        log.error("Error in reorderModules", { error });
        throw error;
      }
    },
  },
};
