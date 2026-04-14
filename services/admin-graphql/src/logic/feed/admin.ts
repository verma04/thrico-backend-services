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
  source: sourceFilter,
  isPinned: pinnedFilter,
}: {
  db: AppDatabase;
  offset?: number;
  limit?: number;
  entity: string;
  source?: string;
  isPinned?: boolean;
}) => {
  try {
    let whereClause = eq(userFeed.entity, entity);
    if (sourceFilter) {
      whereClause = and(whereClause, eq(userFeed.source, sourceFilter as any)) as any;
    }
    if (pinnedFilter !== undefined) {
      whereClause = and(whereClause, eq(userFeed.isPinned, pinnedFilter)) as any;
    }

    const feeds = await db.query.userFeed.findMany({
      where: whereClause,
      limit: limit,
      offset: offset,
      orderBy: [desc(userFeed.isPinned), desc(userFeed.createdAt)],
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
        moment: {
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        },
        job: {
          with: {
            postedBy: true,
          },
        },
        marketPlace: {
          with: {
            media: true,
            postedBy: true,
          },
        },
      },
    });

    // Transform or add computed fields if necessary
    // For isLiked, we might need the current user context if we want to show if *admin* liked it,
    // but the query doesn't pass a specific user to check against.
    // Assuming false or we need to join with reactions filtered by current user.
    // For now, mapping as is.

    return feeds.map((feed) => ({
      ...feed,
      // No mapping needed, FeedMedia matches the drizzle object structure
      media: feed.media || [],
      moment: feed.moment
        ? {
            ...feed.moment,
            owner: feed.moment.user
              ? {
                  id: feed.moment.user.id,
                  firstName: feed.moment.user.firstName,
                  lastName: feed.moment.user.lastName,
                  avatar: feed.moment.user.avatar,
                  headline: (feed.moment.user as any).about?.headline || null,
                }
              : null,
          }
        : null,
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
        source: "admin",
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
      media: createdFeed?.media || [],
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

export const pinFeedAdmin = async ({
  input,
  db,
  entity,
}: {
  input: any;
  db: AppDatabase;
  entity: string;
}) => {
  try {
    const { feedId, isPinned } = input;

    const [updatedFeed] = await db
      .update(userFeed)
      .set({
        isPinned,
        pinnedAt: isPinned ? new Date() : null,
      })
      .where(and(eq(userFeed.id, feedId), eq(userFeed.entity, entity)))
      .returning();

    // Fetch complete feed to return
    const createdFeed = await db.query.userFeed.findFirst({
      where: eq(userFeed.id, feedId),
      with: {
        media: true,
        user: true,
      },
    });

    return {
      ...createdFeed,
      media: createdFeed?.media || [],
      isOwner: true,
      isLiked: false,
    };
  } catch (error) {
    console.error("Error pinning feed:", error);
    throw error;
  }
};

export const deleteFeedAdmin = async ({
  input,
  db,
  entity,
}: {
  input: any;
  db: AppDatabase;
  entity: string;
}) => {
  try {
    const { id: feedId } = input;

    // Check if feed belongs to this entity
    const feed = await db.query.userFeed.findFirst({
      where: and(eq(userFeed.id, feedId), eq(userFeed.entity, entity)),
    });

    if (!feed) {
      throw new Error("Feed not found or unauthorized");
    }

    // Use transaction for safer deletion
    const result = await db.transaction(async (tx: any) => {
      // Manually delete media records if they don't have cascade in DB
      await tx.delete(media).where(eq(media.feedId, feedId));

      await tx.delete(userFeed).where(eq(userFeed.id, feedId));

      return { status: true };
    });

    return result;
  } catch (error) {
    console.error("Error deleting feed:", error);
    throw error;
  }
};

export const getFeedIntelligenceKPI = async ({
  db,
  entity,
  timeRange,
  dateRange,
}: {
  db: AppDatabase;
  entity: string;
  timeRange?: string;
  dateRange?: { startDate: string; endDate: string };
}) => {
  try {
    // Initial implementation with placeholder data that can be refined with actual analytics logic
    return {
      aggregateReach: 1250000,
      activeDialogue: 42300,
      networkVelocity: 88.5,
      engagementYield: 12.4,
      reachTrend: 15.2,
      dialogueTrend: 8.4,
      velocityTrend: -2.3,
      yieldTrend: 4.1,
    };
  } catch (error) {
    console.error("Error fetching intelligence KPIs:", error);
    throw error;
  }
};

export const getFeedYieldVelocity = async ({
  db,
  entity,
  timeRange,
  dateRange,
}: {
  db: AppDatabase;
  entity: string;
  timeRange?: string;
  dateRange?: { startDate: string; endDate: string };
}) => {
  try {
    return [
      { day: "Mon", signups: 400 },
      { day: "Tue", signups: 300 },
      { day: "Wed", signups: 600 },
      { day: "Thu", signups: 800 },
      { day: "Fri", signups: 500 },
      { day: "Sat", signups: 900 },
      { day: "Sun", signups: 700 },
    ];
  } catch (error) {
    console.error("Error fetching yield velocity:", error);
    throw error;
  }
};

export const getFeedInterestMatrix = async ({
  db,
  entity,
  timeRange,
  dateRange,
}: {
  db: AppDatabase;
  entity: string;
  timeRange?: string;
  dateRange?: { startDate: string; endDate: string };
}) => {
  try {
    return [
      { name: "Technology", value: 45, color: "#6366f1" },
      { name: "Entrepreneurship", value: 32, color: "#8b5cf6" },
      { name: "Sustainability", value: 28, color: "#10b981" },
      { name: "Digital Health", value: 24, color: "#f43f5e" },
      { name: "FinTech", value: 20, color: "#f59e0b" },
    ];
  } catch (error) {
    console.error("Error fetching interest matrix:", error);
    throw error;
  }
};

export const getPromotedNodeEvents = async ({
  db,
  entity,
  timeRange,
  dateRange,
}: {
  db: AppDatabase;
  entity: string;
  timeRange?: string;
  dateRange?: { startDate: string; endDate: string };
}) => {
  try {
    return [
      {
        title: "Ecosystem Leadership Summit",
        date: "May 24, 2024",
        time: "09:00 AM - 05:00 PM",
        location: "Convention Center",
        description: "A premier gathering for ecosystem leaders to discuss future trends.",
      },
      {
        title: "Innovation & AI workshop",
        date: "June 12, 2024",
        time: "02:00 PM - 04:00 PM",
        location: "Virtual Event",
        description: "Hands-on session on implementing AI in modern workflows.",
      },
    ];
  } catch (error) {
    console.error("Error fetching promoted events:", error);
    throw error;
  }
};
