import {
  AppDatabase,
  userFeed,
  feedComment,
  feedReactions,
  media,
} from "@thrico/database";
import { and, desc, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import upload from "../../utils/upload/uploadImageToFolder.utils";

export const getAllFeedEntity = async ({
  db,
  offset = 0,
  limit = 10,
  entity,
}: {
  db: AppDatabase;
  offset?: number;
  limit?: number;
  entity: string;
}) => {
  try {
    const feeds = await db.query.userFeed.findMany({
      where: eq(userFeed.entity, entity),
      limit: limit,
      offset: offset,
      orderBy: [desc(userFeed.createdAt)],
      with: {
        user: {
          with: {
            about: true,
          },
        },
        group: true,
        poll: {
          with: {
            options: true,
          },
        },
        media: true,
      },
    });

    // Transform or add computed fields if necessary
    // For isLiked, we might need the current user context if we want to show if *admin* liked it,
    // but the query doesn't pass a specific user to check against.
    // Assuming false or we need to join with reactions filtered by current user.
    // For now, mapping as is.

    return feeds.map((feed) => ({
      ...feed,
      isLiked: false, // Default since we aren't checking for a specific user here
      isOwner: true, // Admin viewing entity feed implies ownership/control
    }));
  } catch (error) {
    console.error("Error fetching feeds:", error);
    throw error;
  }
};

export const addFeedAdmin = async ({
  input,
  db,
  entity,
}: {
  input: any;
  db: AppDatabase;
  entity: string;
}) => {
  try {
    const { description, media: mediaFiles } = input;

    let uploadedMediaUrls: string[] = [];
    if (mediaFiles && mediaFiles.length > 0) {
      // Upload media files
      const uploadResults = await upload("feed-media", mediaFiles);
      uploadedMediaUrls = uploadResults.map((res: any) => res.url);
    }

    const [newFeed] = await db
      .insert(userFeed)
      .values({
        entity,
        description,
        addedBy: "ENTITY", // Admin adding feed
        privacy: "PUBLIC",
        status: "APPROVED",
        // No userId needed if addedBy is ENTITY (based on schema check constraint?)
        // Schema check: (addedBy != 'USER' OR userId IS NOT NULL)
        // So if addedBy == 'ENTITY', userId can be null.
      })
      .returning();

    if (uploadedMediaUrls.length > 0) {
      // Insert media records
      for (const url of uploadedMediaUrls) {
        await db.insert(media).values({
          feedId: newFeed.id,
          url,
          entity,
          addedBy: "ENTITY",
        });
      }
    }

    // Fetch complete feed to return
    const createdFeed = await db.query.userFeed.findFirst({
      where: eq(userFeed.id, newFeed.id),
      with: {
        media: true,
        user: true,
      },
    });

    return {
      ...createdFeed,
      isOwner: true,
      isLiked: false,
    };
  } catch (error) {
    console.error("Error adding feed:", error);
    throw error;
  }
};

export const likeFeedAdmin = async ({
  input,
  entity,
  db,
}: {
  input: any;
  entity: string;
  db: AppDatabase;
}) => {
  // Like as entity? The schema for reactions has userId/likedBy check too.
  // likedBy: addedBy("likedBy").default("USER")
  // Constraint: (likedBy != 'USER' OR userId IS NOT NULL)

  // So if we like as entity, we must set likedBy="ENTITY".

  // We don't have a specific userId for the "Entity" actor here unless we use the admin's userId.
  // But implementation plan suggests acting as entity.

  const { id: feedId } = input;

  // Check if already liked by this entity?
  // We can't identify "which" entity liked it solely by userId if we don't store entityId in reactions.
  // Wait, feedReactions schema has: userId, feedId. No entityId column.
  // But it has `likedBy` enum.

  // If we use likedBy='ENTITY', we might need to store the entity ID in distinct way or re-use userId column if it's a UUID?
  // Schema definition for feedReactions:
  // userId: uuid("user_id")

  // Ideally we should put entityId in userId column if acting as entity, assuming entityId is a UUID.

  try {
    const existingLike = await db.query.feedReactions.findFirst({
      where: and(
        eq(feedReactions.feedId, feedId),
        eq(feedReactions.userId, entity) // Using entityId as userId for the reaction
      ),
    });

    if (existingLike) {
      // Unlike
      await db
        .delete(feedReactions)
        .where(eq(feedReactions.id, existingLike.id));

      // Decrement count
      await db
        .update(userFeed)
        .set({ totalReactions: sql`${userFeed.totalReactions} - 1` })
        .where(eq(userFeed.id, feedId));

      return { status: false };
    } else {
      // Like
      await db.insert(feedReactions).values({
        feedId,
        userId: entity, // Using entityId
        likedBy: "ENTITY",
        reactionsType: "like",
      });

      // Increment count
      await db
        .update(userFeed)
        .set({ totalReactions: sql`${userFeed.totalReactions} + 1` })
        .where(eq(userFeed.id, feedId));

      return { status: true };
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
};

export const addFeedCommentAdmin = async ({
  input,
  entity,
  db,
}: {
  input: any;
  entity: string;
  db: AppDatabase;
}) => {
  try {
    const { feedID, comment } = input;

    const [newComment] = await db
      .insert(feedComment)
      .values({
        content: comment,
        feedId: feedID,
        addedBy: "ENTITY",
        // user: null // Schema allows user to be null?
        // feedComment schema: user: uuid("user_id") -- nullable by default unless .notNull() specified.
        // It is nullable in schema.ts provided.
      })
      .returning();

    // Increment comment count
    await db
      .update(userFeed)
      .set({ totalComment: sql`${userFeed.totalComment} + 1` })
      .where(eq(userFeed.id, feedID));

    return newComment;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};
