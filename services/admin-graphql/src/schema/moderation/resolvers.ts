import { and, eq, sql, desc } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  bannedWords,
  blockedLinks,
  contentReports,
  moderationSettings,
  user,
} from "@thrico/database";

export const moderationResolvers = {
  Query: {
    async getBannedWords(_: any, { limit, offset }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const whereClause = eq(bannedWords.entityId, entity);

        const items = await db.query.bannedWords.findMany({
          where: whereClause,
          orderBy: [desc(bannedWords.createdAt)],
          limit: limit || 100,
          offset: offset || 0,
        });

        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(bannedWords)
          .where(whereClause);

        return {
          items,
          totalCount: Number(countResult?.count || 0),
        };
      } catch (error) {
        console.error("Failed to get banned words:", error);
        throw error;
      }
    },

    async getBlockedLinks(_: any, { limit, offset }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const whereClause = eq(blockedLinks.entityId, entity);

        const items = await db.query.blockedLinks.findMany({
          where: whereClause,
          orderBy: [desc(blockedLinks.createdAt)],
          limit: limit || 100,
          offset: offset || 0,
        });

        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(blockedLinks)
          .where(whereClause);

        return {
          items,
          totalCount: Number(countResult?.count || 0),
        };
      } catch (error) {
        console.error("Failed to get blocked links:", error);
        throw error;
      }
    },

    async getContentReports(
      _: any,
      { status, contentType, limit, offset }: any,
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);
        let whereClause = eq(contentReports.entityId, entity);

        if (status) {
          whereClause = and(whereClause, eq(contentReports.status, status))!;
        }
        if (contentType) {
          whereClause = and(
            whereClause,
            eq(contentReports.contentType, contentType),
          )!;
        }

        const items = await db.query.contentReports.findMany({
          where: whereClause,
          with: {
            reportedBy: true,
            reportedUser: true,
            resolvedBy: true,
          },
          orderBy: [desc(contentReports.createdAt)],
          limit: limit || 50,
          offset: offset || 0,
        });

        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(contentReports)
          .where(whereClause);

        return {
          items,
          totalCount: Number(countResult?.count || 0),
        };
      } catch (error) {
        console.error("Failed to get content reports:", error);
        throw error;
      }
    },

    async getModerationSettings(_: any, __: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        let settings = await db.query.moderationSettings.findFirst({
          where: eq(moderationSettings.entityId, entity),
        });

        if (!settings) {
          // Initialize default settings if not exists
          const [newSettings] = await db
            .insert(moderationSettings)
            .values({
              entityId: entity,
            })
            .returning();
          settings = newSettings;
        }

        return settings;
      } catch (error) {
        console.error("Failed to get moderation settings:", error);
        throw error;
      }
    },

    async getModerationStats(_: any, __: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const [reportsStats] = await db
          .select({
            total: sql<number>`count(*)`,
            pending: sql<number>`count(*) filter (where status = 'PENDING')`,
            resolved: sql<number>`count(*) filter (where status = 'RESOLVED')`,
          })
          .from(contentReports)
          .where(eq(contentReports.entityId, entity));

        const [wordsCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(bannedWords)
          .where(eq(bannedWords.entityId, entity));

        const [linksCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(blockedLinks)
          .where(eq(blockedLinks.entityId, entity));

        return {
          totalReports: Number(reportsStats?.total || 0),
          pendingReports: Number(reportsStats?.pending || 0),
          resolvedReports: Number(reportsStats?.resolved || 0),
          bannedWordsCount: Number(wordsCount?.count || 0),
          blockedLinksCount: Number(linksCount?.count || 0),
          autoModeratedToday: 0, // In real app, this would come from a log table or cache
        };
      } catch (error) {
        console.error("Failed to get moderation stats:", error);
        throw error;
      }
    },
  },

  Mutation: {
    async addBannedWord(
      _: any,
      { word, severity, category }: any,
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);
        const [result] = await db
          .insert(bannedWords)
          .values({
            entityId: entity,
            word,
            severity,
            category,
          })
          .returning();
        return result;
      } catch (error) {
        console.error("Failed to add banned word:", error);
        throw error;
      }
    },

    async updateBannedWord(_: any, { id, ...updates }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const [result] = await db
          .update(bannedWords)
          .set({ ...updates, updatedAt: new Date() })
          .where(and(eq(bannedWords.id, id), eq(bannedWords.entityId, entity)))
          .returning();
        return result;
      } catch (error) {
        console.error("Failed to update banned word:", error);
        throw error;
      }
    },

    async deleteBannedWord(_: any, { id }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        await db
          .delete(bannedWords)
          .where(and(eq(bannedWords.id, id), eq(bannedWords.entityId, entity)));
        return true;
      } catch (error) {
        console.error("Failed to delete banned word:", error);
        throw error;
      }
    },

    async addBlockedLink(
      _: any,
      { url, type, isBlocked, reason }: any,
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);
        const [result] = await db
          .insert(blockedLinks)
          .values({
            entityId: entity,
            url,
            type,
            isBlocked,
            reason,
          })
          .returning();
        return result;
      } catch (error) {
        console.error("Failed to add blocked link:", error);
        throw error;
      }
    },

    async updateBlockedLink(_: any, { id, ...updates }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const [result] = await db
          .update(blockedLinks)
          .set(updates)
          .where(
            and(eq(blockedLinks.id, id), eq(blockedLinks.entityId, entity)),
          )
          .returning();
        return result;
      } catch (error) {
        console.error("Failed to update blocked link:", error);
        throw error;
      }
    },

    async deleteBlockedLink(_: any, { id }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        await db
          .delete(blockedLinks)
          .where(
            and(eq(blockedLinks.id, id), eq(blockedLinks.entityId, entity)),
          );
        return true;
      } catch (error) {
        console.error("Failed to delete blocked link:", error);
        throw error;
      }
    },

    async resolveReport(_: any, { id, action }: any, context: any) {
      try {
        const { entity, db, id: adminId } = await checkAuth(context);
        const [result] = await db
          .update(contentReports)
          .set({
            status: "RESOLVED",
            resolvedById: adminId,
            resolvedAt: new Date(),
          })
          .where(
            and(eq(contentReports.id, id), eq(contentReports.entityId, entity)),
          )
          .returning();

        // TODO: Apply the actual action (e.g., delete post, warning user)
        // This would typically involve calling other services or updating other tables

        return result;
      } catch (error) {
        console.error("Failed to resolve report:", error);
        throw error;
      }
    },

    async dismissReport(_: any, { id }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const [result] = await db
          .update(contentReports)
          .set({ status: "DISMISSED" })
          .where(
            and(eq(contentReports.id, id), eq(contentReports.entityId, entity)),
          )
          .returning();
        return result;
      } catch (error) {
        console.error("Failed to dismiss report:", error);
        throw error;
      }
    },

    async updateModerationSettings(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const [result] = await db
          .update(moderationSettings)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(moderationSettings.entityId, entity))
          .returning();
        return result;
      } catch (error) {
        console.error("Failed to update moderation settings:", error);
        throw error;
      }
    },
  },
};
