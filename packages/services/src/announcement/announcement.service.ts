import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { announcements, highlights, userStory } from "@thrico/database";
import { and, desc, eq } from "drizzle-orm";

export class AnnouncementService {
  static async getAnnouncements({
    currentUserId,
    entityId,
    getUnreadCountFn,
  }: {
    currentUserId: string;
    entityId: string;
    getUnreadCountFn?: (userId: string) => Promise<number>;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting announcements", { currentUserId, entityId });

      //   const result = await db
      //     .select({
      //       id: announcements.id,
      //       note: announcements.note,
      //       createdAt: announcements.createdAt,
      //       updatedAt: announcements.updatedAt,
      //       entity: announcements.entity,
      //       description: announcements.description,
      //     })
      //     .from(announcements)
      //     .where(and(eq(announcements.entity, entityId)))
      //     .orderBy(desc(announcements.createdAt));

      //   let unread = 0;
      //   if (getUnreadCountFn) {
      //     unread = await getUnreadCountFn(currentUserId);
      //   }

      //   log.info("Announcements retrieved", {
      //     currentUserId,
      //     entityId,
      //     count: result.length,
      //     unread,
      //   });

      //   return {
      //     unread,
      //     result,
      //   };
    } catch (error) {
      log.error("Error in getAnnouncements", {
        error,
        currentUserId,
        entityId,
      });
      throw error;
    }
  }

  static async getHighlights({
    entityId,
    getCacheFn,
    setCacheFn,
  }: {
    entityId: string;
    getCacheFn?: (key: string) => Promise<any>;
    setCacheFn?: (data: any, key: string) => Promise<void>;
  }) {
    try {
      if (!entityId) {
        throw new GraphQLError("Entity ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting highlights", { entityId });

      const cacheKey = `Highlights:${entityId}`;

      if (getCacheFn) {
        const cacheResults = await getCacheFn(cacheKey);
        if (cacheResults) {
          log.debug("Highlights retrieved from cache", { entityId });
          return cacheResults;
        }
      }

      //   const result = await db
      //     .select({
      //       id: highlights.id,
      //       highlightsType: highlights.highlightsType,
      //       announcements: announcements,
      //       story: userStory,
      //     })
      //     .from(highlights)
      //     .where(and(eq(highlights.entity, entityId)))
      //     .leftJoin(
      //       announcements,
      //       eq(highlights.announcementId, announcements.id)
      //     )
      //     .leftJoin(userStory, eq(highlights.storyId, userStory.id))
      //     .orderBy(desc(highlights.createdAt));

      //   if (setCacheFn) {
      //     await setCacheFn(result, cacheKey);
      //   }

      //   log.info("Highlights retrieved", { entityId, count: result.length });
      //   return result;
    } catch (error) {
      log.error("Error in getHighlights", { error, entityId });
      throw error;
    }
  }
}
