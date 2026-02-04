import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import {
  stories,
  connections,
  user,
  aboutUser,
  userToEntity,
} from "@thrico/database";
import { upload } from "../upload";
import { GamificationEventService } from "../gamification/gamification-event.service";

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

      log.debug("Getting stories grouped by connections", { userId, entityId });

      const connectionsRows = await db
        .select({
          connectionId: connections.id,
          connectionUserId: sql<string>`
            CASE 
              WHEN ${connections.user1} = ${userId} THEN ${connections.user2}
              ELSE ${connections.user1}
            END
          `.as("connectionUserId"),
          connectedAt: connections.createdAt,
        })
        .from(connections)
        .where(
          and(
            eq(connections.entity, entityId),
            eq(connections.connectionStatusEnum, "ACCEPTED"),
            or(eq(connections.user1, userId), eq(connections.user2, userId)),
          ),
        );

      const connectionUserIds = connectionsRows.map(
        (row: any) => row.connectionUserId,
      );
      log.debug("Found connections", {
        userId,
        count: connectionUserIds.length,
      });

      if (connectionUserIds.length === 0) {
        log.info("No connections found", { userId, entityId });
        return [];
      }

      console.log(connectionUserIds);

      const now = new Date();
      const rows = await db
        .select({
          id: userToEntity.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          cover: user.cover,
          designation: aboutUser.headline,
          isOnline: sql`
            CASE WHEN ${userToEntity.lastActive} + interval '10 minutes' > now() 
            THEN true ELSE false END
          `.as("is_online"),
          connectedAt: connections.createdAt,
          status: sql<string>`'CONNECTED'`.as("status"),
          storyId: stories.id,
          image: stories.image,
          caption: stories.caption,
          textOverlays: stories.textOverlays,
          createdAt: stories.createdAt,
          expiresAt: stories.expiresAt,
          isActive: stories.isActive,
        })
        .from(userToEntity)
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
        .innerJoin(
          connections,
          or(
            and(
              eq(connections.user1, userId),
              eq(connections.user2, userToEntity.userId),
            ),
            and(
              eq(connections.user2, userId),
              eq(connections.user1, userToEntity.userId),
            ),
          ),
        )
        .leftJoin(
          stories,
          and(
            eq(stories.userId, userToEntity.userId),
            gt(stories.expiresAt, now),
            eq(stories.isActive, true),
          ),
        )
        .where(
          and(
            eq(userToEntity.entityId, entityId),
            inArray(userToEntity.userId, connectionUserIds),
          ),
        )
        .orderBy(userToEntity.id, stories.createdAt);

      const grouped: Record<string, any> = {};
      for (const row of rows) {
        if (!grouped[row.id]) {
          grouped[row.id] = {
            user: {
              id: row.id,
              firstName: row.firstName,
              lastName: row.lastName,
              avatar: row.avatar,
              cover: row.cover,
              designation: row.designation,
              isOnline: row.isOnline,
              connectedAt: row.connectedAt,
              status: row.status,
            },
            stories: [],
          };
        }
        if (row.storyId) {
          grouped[row.id].stories.push({
            id: row.storyId,
            image: row.image,
            caption: row.caption,
            textOverlays: row.textOverlays,
            createdAt: row.createdAt,
            expiresAt: row.expiresAt,
            isActive: row.isActive,
          });
        }
      }

      const result = Object.values(grouped).filter(
        (item) => item.stories.length > 0,
      );
      log.info("Stories grouped by connections retrieved", {
        userId,
        groupCount: result.length,
      });
      return result;
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
