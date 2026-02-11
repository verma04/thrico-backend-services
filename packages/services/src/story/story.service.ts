import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, gt, inArray, or, sql, desc } from "drizzle-orm";
import {
  stories,
  connections,
  user,
  aboutUser,
  userToEntity,
} from "@thrico/database";
import { upload } from "../upload";
import { GamificationEventService } from "../gamification/gamification-event.service";
import {
  CloseFriendNotificationService,
  Module,
} from "../network/closefriend-notification.service";

export class StoryService {
  static async createStory({
    db,
    userId,
    entityId,
    input: { image, textOverlays, caption },
  }: {
    db: any;
    userId: string;
    entityId: string;
    input: {
      image: File | string;
      textOverlays?: {
        id: string;
        text: string;
        color: string;
        fontSize: number;
        x: number;
        y: number;
      }[];
      caption?: string;
    };
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (!image) {
        throw new GraphQLError("Image is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Creating story", { userId, entityId });

      let imageUrl: string | undefined;

      if (typeof image !== "string") {
        imageUrl = await upload(image);
        log.debug("Image uploaded", { userId, imageUrl });
      } else {
        imageUrl = image;
      }

      const [story] = await db
        .insert(stories)
        .values({
          entity: entityId,
          image: imageUrl,
          textOverlays: textOverlays ?? [],
          caption: caption ?? "",
          userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .returning();

      log.info("Story created", { userId, storyId: story.id, entityId });

      // Close Friend Notification
      CloseFriendNotificationService.publishNotificationTask({
        creatorId: userId,
        module: "FEED",
        entityId,
        type: "STORY",
        contentId: userId,
        title: caption || "New Story",
      }).catch((err: any) => {
        log.error("Failed to trigger close friend story notification", {
          userId,
          storyId: story.id,
          error: err.message,
        });
      });

      // Gamification trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-story-create",
        moduleId: "stories",
        userId,
        entityId,
      });

      return story;
    } catch (error) {
      log.error("Error in createStory", { error, userId, entityId });
      throw error;
    }
  }

  static async getStoriesGroupedByConnections({
    db,
    userId,
    entityId,
    cursor,
    limit = 10,
  }: {
    db: any;
    userId: string;
    entityId: string;
    cursor?: string | null;
    limit?: number;
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting stories grouped by connections", {
        userId,
        entityId,
        cursor,
        limit,
      });

      const now = new Date();

      // 1. Get friend IDs (bidirectional connections)
      const friendIdsSubquery = db
        .select({
          friendId: user.id,
        })
        .from(connections)
        .innerJoin(
          userToEntity,
          or(
            and(
              eq(connections.user1, userId),
              eq(connections.user2, userToEntity.id),
            ),
            and(
              eq(connections.user2, userId),
              eq(connections.user1, userToEntity.id),
            ),
          ),
        )
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .where(
          and(
            eq(connections.entity, entityId),
            eq(connections.connectionStatusEnum, "ACCEPTED"),
            or(eq(connections.user1, userId), eq(connections.user2, userId)),
          ),
        );

      // 2. Query to get users with their stories
      const baseQuery = db
        .select({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          headline: aboutUser.headline,
          lastStoryCreatedAt: sql<Date>`MAX(${stories.createdAt})`.as(
            "last_story_created_at",
          ),
          stories: sql<any[]>`JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ${stories.id},
              'image', ${stories.image},
              'caption', ${stories.caption},
              'textOverlays', ${stories.textOverlays},
              'createdAt', ${stories.createdAt},
              'expiresAt', ${stories.expiresAt}
            ) ORDER BY ${stories.createdAt} ASC
          )`.as("user_stories"),
        })
        .from(stories)
        .innerJoin(user, eq(stories.userId, user.id))
        .innerJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(
          and(
            inArray(stories.userId, friendIdsSubquery),
            eq(stories.entity, entityId),
            eq(stories.isActive, true),
            gt(stories.expiresAt, now),
          ),
        )
        .groupBy(
          user.id,
          user.firstName,
          user.lastName,
          user.avatar,
          aboutUser.headline,
        );

      // 3. Apply cursor and ordering
      let query = baseQuery.orderBy(desc(sql`last_story_created_at`));

      // if (cursor) {
      //   const cursorDate = new Date(cursor);
      //   query = query.having(sql`MAX(${stories.createdAt}) < ${cursorDate}`);
      // }

      const results = await query.limit(limit + 1);

      console.log(results);

      // const hasNextPage = results.length > limit;
      // const data = hasNextPage ? results.slice(0, limit) : results;

      const edges = results.map((item: any) => ({
        cursor: item.lastStoryCreatedAt.toISOString(),
        node: {
          user: {
            id: item.id,
            firstName: item.firstName,
            lastName: item.lastName,
            avatar: item.avatar,
            about: {
              headline: item.headline,
            },
          },
          stories: item.stories,
        },
      }));

      log.info("Stories grouped by connections retrieved", {
        userId,
        count: results.length,
      });

      return {
        edges,
        pageInfo: {
          hasNextPage: false,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    } catch (error) {
      log.error("Error in getStoriesGroupedByConnections", {
        error,
        userId,
        entityId,
      });
      throw error;
    }
  }

  static async getMyStories({
    db,
    userId,
    entityId,
  }: {
    db: any;
    userId: string;
    entityId: string;
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting my stories", { userId, entityId });

      const now = new Date();
      const storiesList = await db
        .select({
          id: stories.id,
          image: stories.image,
          textOverlays: stories.textOverlays,
          caption: stories.caption,
          createdAt: stories.createdAt,
          expiresAt: stories.expiresAt,
          isActive: stories.isActive,
        })
        .from(stories)
        .where(
          and(
            eq(stories.userId, userId),
            eq(stories.entity, entityId),
            gt(stories.expiresAt, now),
          ),
        )
        .orderBy(stories.createdAt);

      log.info("My stories retrieved", { userId, count: storiesList.length });
      return storiesList;
    } catch (error) {
      log.error("Error in getMyStories", { error, userId, entityId });
      throw error;
    }
  }

  static async deleteStory({
    db,
    storyId,
    userId,
  }: {
    db: any;
    storyId: string;
    userId: string;
  }) {
    try {
      if (!storyId || !userId) {
        throw new GraphQLError("Story ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Deleting story", { storyId, userId });

      const [deleted] = await db
        .delete(stories)
        .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
        .returning();

      if (!deleted) {
        throw new GraphQLError(
          "Story not found or you don't have permission to delete it.",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      log.info("Story deleted", { storyId, userId });
      return deleted;
    } catch (error) {
      log.error("Error in deleteStory", { error, storyId, userId });
      throw error;
    }
  }
}
