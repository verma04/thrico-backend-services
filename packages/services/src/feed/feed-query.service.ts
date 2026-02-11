import { and, desc, eq, inArray, or, sql, asc, isNull } from "drizzle-orm";
import {
  feedReactions,
  feedWishList,
  feedComment,
  user,
  userFeed,
  groups,
  media,
  aboutUser,
  jobs,
  marketPlace,
  marketPlaceMedia,
  events,
  userStory,
  connectionsRequest,
  connections,
  groupMember,
  polls,
  celebration,
  offers,
  userToEntity,
  communityFeed,
} from "@thrico/database";
import { log } from "@thrico/logging";
import type { FeedQueryParams } from "./types";

interface FeedPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
  canModerate: boolean;
  canReport: boolean;
}

export class FeedQueryService {
  // Calculate feed permissions based on user role and ownership
  private static calculateFeedPermissions(
    isOwner: boolean,
    groupRole?: string | null,
  ): FeedPermissions {
    // Group-level permissions (for community feeds)
    const isGroupAdmin = groupRole === "ADMIN";
    const isGroupManager = groupRole === "MANAGER";
    const isGroupModerator = groupRole === "MODERATOR";

    return {
      canEdit: isOwner,
      canDelete: isOwner || isGroupAdmin || isGroupManager,
      canPin: isGroupAdmin || isGroupManager,
      canModerate: isGroupAdmin || isGroupManager || isGroupModerator,
      canReport: !isOwner, // Can't report own feed
    };
  }

  // Helper to set common fields
  static async setField(currentUserId: string) {
    return {
      id: userFeed.id,
      description: userFeed.description,
      source: userFeed.source,
      createdAt: userFeed.createdAt,
      totalComment: userFeed.totalComment,
      totalReactions: userFeed.totalReactions,
      totalReShare: userFeed.totalReShare,
      isPinned: userFeed.isPinned,
      privacy: userFeed.privacy,
      addedBy: userFeed.addedBy,
      videoUrl: userFeed.videoUrl,
      thumbnailUrl: userFeed.thumbnailUrl,
      groupId: userFeed.groupId,
      jobId: userFeed.jobId,
      marketPlaceId: userFeed.marketPlaceId,
      eventId: userFeed.eventId,
      pollId: userFeed.pollId,
      storyId: userFeed.storyId,
      offerId: userFeed.offerId,
      repostId: userFeed.repostId,
      offer: {
        id: offers.id,
        title: offers.title,
        description: offers.description,
        location: offers.location,
        company: offers.company,
        timeline: offers.timeline,
      },

      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        headline: aboutUser.headline,
      },
      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM ${feedReactions}
        WHERE ${feedReactions.feedId} = ${userFeed.id}
        AND ${feedReactions.userId} = ${currentUserId}
      )`,
      isWishList: sql<boolean>`EXISTS (
        SELECT 1 FROM ${feedWishList}
        WHERE ${feedWishList.feedId} = ${userFeed.id}
        AND ${feedWishList.userId} = ${currentUserId}
      )`,
      media: sql<Array<string>>`ARRAY(
        SELECT ${media.url}
        FROM ${media}
        WHERE ${media.feedId} = ${userFeed.id}
      )`,
      isOwner: sql<boolean>`${userFeed.userId} = ${currentUserId}`,
      // Get user's group role for permission calculation
      groupRole: sql<string | null>`(
        SELECT ${groupMember.role}
        FROM ${groupMember}
        WHERE ${groupMember.userId} = ${currentUserId}
        AND ${groupMember.groupId} = ${userFeed.groupId}
        LIMIT 1
      )`,
    };
  }

  // Process feeds and add permissions
  private static processFeedsWithPermissions(feeds: any[]): any[] {
    return feeds.map((feed) => {
      const permissions = this.calculateFeedPermissions(
        feed.isOwner,
        feed.groupRole,
      );

      // Remove the role field from the response
      const { groupRole, ...feedWithoutRoles } = feed;

      return {
        ...feedWithoutRoles,
        permissions,
      };
    });
  }

  // Get user's own feed with cursor-based pagination
  static async getMyFeed({
    currentUserId,
    db,
    cursor,
    limit = 20,
    entity,
  }: {
    currentUserId: string;
    db: any;
    cursor?: string;
    limit?: number;
    entity: string;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      // Build conditions
      const conditions = [
        eq(userFeed.userId, currentUserId),
        eq(userFeed.entity, entity),
        isNull(userFeed.groupId),
      ];

      // Add cursor condition if provided
      if (cursor) {
        conditions.push(sql`${userFeed.createdAt} < ${new Date(cursor)}`);
      }

      // Fetch limit + 1 to determine if there's a next page
      const result = await db
        .select({
          ...fields,
          group: {
            id: groups.id,
            title: groups.title,
            cover: groups.cover,
          },
          job: {
            id: jobs.id,
            title: jobs.title,
            company: jobs.company,
            description: jobs.description,
            location: jobs.location,
            jobType: jobs.jobType,
            workplaceType: jobs.workplaceType,
          },
          listing: {
            id: marketPlace.id,
            title: marketPlace.title,
            description: marketPlace.description,
            price: marketPlace.price,
            currency: marketPlace.currency,
            location: marketPlace.location,
            category: marketPlace.category,
            createdAt: marketPlace.createdAt,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(groups, eq(userFeed.groupId, groups.id))
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .leftJoin(marketPlace, eq(userFeed.marketPlaceId, marketPlace.id))
        .leftJoin(jobs, eq(userFeed.jobId, jobs.id))
        .where(and(...conditions))
        .orderBy(
          desc(userFeed.isPinned),
          desc(userFeed.pinnedAt),
          desc(userFeed.createdAt),
        )
        .limit(limit + 1);

      // Determine if there's a next page
      const hasNextPage = result.length > limit;
      const nodes = hasNextPage ? result.slice(0, limit) : result;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFeed)
        .where(
          and(
            eq(userFeed.userId, currentUserId),
            eq(userFeed.entity, entity),
            isNull(userFeed.groupId),
          ),
        );

      const totalCount = Number(countResult?.count || 0);

      // Process feeds with permissions
      const processedFeeds = this.processFeedsWithPermissions(nodes);

      // Build edges
      const edges = processedFeeds.map((feed: any) => ({
        cursor: feed.createdAt.toISOString(),
        node: feed,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount,
      };
    } catch (error) {
      log.error("Error in getMyFeed", {
        error,
        currentUserId,
        entity,
        cursor,
        limit,
      });
      throw error;
    }
  }

  // Get feed by ID
  static async getFeedDetailsById({
    feedId,
    currentUserId,
    db,
  }: {
    feedId: string;
    currentUserId: string;
    db: any;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      const result = await db
        .select({
          ...fields,
          group: {
            id: groups.id,
            title: groups.title,
            cover: groups.cover,
          },
          job: {
            id: jobs.id,
            title: jobs.title,
            company: jobs.company,
            description: jobs.description,
            location: jobs.location,
            jobType: jobs.jobType,
            workplaceType: jobs.workplaceType,
          },
          listing: {
            id: marketPlace.id,
            title: marketPlace.title,
            description: marketPlace.description,
            price: marketPlace.price,
            currency: marketPlace.currency,
            location: marketPlace.location,
            category: marketPlace.category,
            createdAt: marketPlace.createdAt,
          },

          poll: {
            id: polls.id,
            title: polls.title,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(groups, eq(userFeed.groupId, groups.id))
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .leftJoin(marketPlace, eq(userFeed.marketPlaceId, marketPlace.id))
        .leftJoin(jobs, eq(userFeed.jobId, jobs.id))
        .leftJoin(polls, eq(userFeed.pollId, polls.id))
        .where(eq(userFeed.id, feedId))
        .limit(1);

      const processed = this.processFeedsWithPermissions(result);
      return processed?.[0] || null;
    } catch (error) {
      log.error("Error in getFeedDetailsById", {
        error,
        currentUserId,
        feedId,
      });
      throw error;
    }
  }

  // Get communities feed list
  // Get communities feed list with cursor-based pagination
  static async getCommunitiesFeedList({
    currentUserId,
    db,
    id,
    cursor,
    limit = 20,
    entity,
  }: FeedQueryParams & { id: string }) {
    try {
      const fields = await this.setField(currentUserId);

      // Build conditions
      const conditions = [
        eq(userFeed.groupId, id),
        eq(userFeed.entity, entity),
      ];

      // Add cursor condition if provided
      if (cursor) {
        conditions.push(sql`${userFeed.createdAt} < ${new Date(cursor)}`);
      }

      // Fetch limit + 1 to determine if there's a next page
      const result = await db
        .select({
          ...fields,
          communityfeedId: communityFeed.id,
          group: {
            id: groups.id,
            title: groups.title,
            cover: groups.cover,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(groups, eq(userFeed.groupId, groups.id))
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .leftJoin(communityFeed, eq(userFeed.id, communityFeed.userFeedId))
        .where(and(...conditions))
        .orderBy(desc(userFeed.createdAt))
        .limit(limit + 1);

      // Determine if there's a next page
      const hasNextPage = result.length > limit;
      const nodes = hasNextPage ? result.slice(0, limit) : result;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFeed)
        .where(and(eq(userFeed.groupId, id), eq(userFeed.entity, entity)));

      const totalCount = Number(countResult?.count || 0);

      // Process feeds with permissions
      const processedFeeds = this.processFeedsWithPermissions(nodes);

      // Build edges
      const edges = processedFeeds.map((feed: any) => ({
        cursor: feed.createdAt.toISOString(),
        node: feed,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount,
      };
    } catch (error) {
      log.error("Error in getCommunitiesFeedList", {
        error,
        currentUserId,
        id,
        entity,
        cursor,
        limit,
      });
      throw error;
    }
  }

  // Get marketplace feed
  static async getMarketPlaceFeed({
    currentUserId,
    db,
  }: {
    currentUserId: string;
    db: any;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      const result = await db
        .select({
          ...fields,
          marketPlace: {
            title: marketPlace.title,
            price: marketPlace.price,
            description: marketPlace.description,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(marketPlace, eq(userFeed.marketPlaceId, marketPlace.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(eq(userFeed.source, "marketPlace"))
        .orderBy(desc(userFeed.createdAt))
        .limit(50);

      return this.processFeedsWithPermissions(result);
    } catch (error) {
      log.error("Error in getMarketPlaceFeed", { error, currentUserId });
      throw error;
    }
  }

  // Get job feed
  static async getJobFeed({
    currentUserId,
    db,
  }: {
    currentUserId: string;
    db: any;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      const result = await db
        .select({
          ...fields,
          job: {
            title: jobs?.title,
            company: jobs?.company,
            description: jobs?.description,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(jobs, eq(userFeed.jobId, jobs?.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(eq(userFeed.source, "jobs"))
        .orderBy(desc(userFeed.createdAt))
        .limit(50);

      return this.processFeedsWithPermissions(result);
    } catch (error) {
      log.error("Error in getJobFeed", { error, currentUserId });
      throw error;
    }
  }

  // Get user events feed
  static async getUserEventsFeed({
    currentUserId,
    db,
  }: {
    currentUserId: string;
    db: any;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      const followingUsersSubQuery = db
        .select({ followingUserId: connectionsRequest.receiver })
        .from(connectionsRequest)
        .where(
          and(
            eq(connectionsRequest.sender, currentUserId),
            eq(connectionsRequest.connectionStatusEnum, "PENDING"),
          ),
        )
        .union(
          db
            .select({ followingUserId: connections.user2 })
            .from(connections)
            .where(
              and(
                eq(connections.user1, currentUserId),
                eq(connections.connectionStatusEnum, "ACCEPTED"),
              ),
            ),
        )
        .union(
          db
            .select({ followingUserId: connections.user1 })
            .from(connections)
            .where(
              and(
                eq(connections.user2, currentUserId),
                eq(connections.connectionStatusEnum, "ACCEPTED"),
              ),
            ),
        );

      const result = await db
        .select({
          ...fields,
          event: {
            id: events.id,
            cover: events.cover,
            eventType: events.type,
            registrationEndDate: events.lastDateOfRegistration,
            eventStartTime: events.startDate,
            eventEndTime: events.endDate,
            visibility: events.visibility,
            name: events.title,
            numberOfAttendees: events.numberOfAttendees,
            numberOfPost: events.numberOfPost,
            numberOfViews: events.numberOfViews,
            location: events.location,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(events, eq(userFeed.eventId, events.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(
          and(
            or(
              inArray(userFeed.userId, followingUsersSubQuery),
              eq(userFeed.userId, currentUserId),
            ),
            eq(userFeed.source, "event"),
          ),
        )
        .orderBy(desc(userFeed.createdAt))
        .limit(50);

      return this.processFeedsWithPermissions(result);
    } catch (error) {
      log.error("Error in getUserEventsFeed", { error, currentUserId });
      throw error;
    }
  }

  // Get feed comments
  // Get feed comments with cursor-based pagination and permissions
  static async getFeedComment({
    currentUserId,
    feedId,
    cursor,
    limit = 20,
    db,
  }: {
    currentUserId: string;
    feedId: string;
    cursor?: string;
    limit?: number;
    db: any;
  }) {
    try {
      // Build conditions
      const conditions = [eq(feedComment.feedId, feedId)];

      // Add cursor condition if provided
      if (cursor) {
        conditions.push(sql`${feedComment.createdAt} < ${new Date(cursor)}`);
      }

      // Fetch comments along with post owner, group ID, and current user's role in that group
      const result = await db
        .select({
          id: feedComment.id,
          content: feedComment.content,
          createdAt: feedComment.createdAt,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            about: {
              headline: aboutUser.headline,
            },
          },
          postOwnerId: userFeed.userId,
          commentAuthorId: feedComment.user,
          currentUserRole: groupMember.role,
        })
        .from(feedComment)
        .leftJoin(user, eq(feedComment.user, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .leftJoin(userFeed, eq(feedComment.feedId, userFeed.id))
        .leftJoin(
          groupMember,
          and(
            eq(userFeed.groupId, groupMember.groupId),
            eq(groupMember.userId, currentUserId),
          ),
        )
        .where(and(...conditions))
        .orderBy(desc(feedComment.createdAt))
        .limit(limit + 1);

      // Determine if there's a next page
      const hasNextPage = result.length > limit;
      const nodes = hasNextPage ? result.slice(0, limit) : result;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(feedComment)
        .where(eq(feedComment.feedId, feedId));

      const totalCount = Number(countResult?.count || 0);

      // Map results and calculate permissions
      const processedComments = nodes.map((comment: any) => {
        const isCommentAuthor = comment.commentAuthorId === currentUserId;
        const isPostOwner = comment.postOwnerId === currentUserId;
        const isAdmin = ["ADMIN", "MANAGER", "MODERATOR"].includes(
          comment.currentUserRole || "",
        );

        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          user: comment.user,
          isOwner: isCommentAuthor,
          isPostOwner: isPostOwner,
          permissions: {
            canDelete: isCommentAuthor || isPostOwner || isAdmin,
            canEdit: isCommentAuthor,
            canReport: !isCommentAuthor,
          },
        };
      });

      // Build edges
      const edges = processedComments.map((comment: any) => ({
        cursor: comment.createdAt.toISOString(),
        node: comment,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount,
      };
    } catch (error) {
      log.error("Error in getFeedComment", { error, currentUserId, feedId });
      throw error;
    }
  }

  // Get user feed (all posts from entity) with cursor-based pagination
  static async getUserFeed({
    currentUserId,
    db,
    cursor,
    limit = 20,
    entity,
  }: {
    currentUserId: string;
    db: any;
    cursor?: string;
    limit?: number;
    entity: string;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      // Build conditions
      const conditions = [
        eq(userFeed.entity, entity),
        isNull(userFeed.groupId),
      ];

      // Add cursor condition if provided
      if (cursor) {
        conditions.push(sql`${userFeed.createdAt} < ${new Date(cursor)}`);
      }

      // Fetch limit + 1 to determine if there's a next page
      const result = await db
        .select({
          ...fields,
          group: {
            id: groups.id,
            title: groups.title,
            cover: groups.cover,
          },
          celebration: {
            id: celebration.id,
            celebrationType: celebration.celebrationType,
            title: celebration.title,
            description: celebration.description,
            cover: celebration.cover,
          },
          job: {
            id: jobs.id,
            title: jobs.title,
            company: jobs.company,
            description: jobs.description,
            location: jobs.location,
            jobType: jobs.jobType,
            workplaceType: jobs.workplaceType,
          },
          listing: {
            id: marketPlace.id,
            title: marketPlace.title,
            description: marketPlace.description,
            price: marketPlace.price,
            currency: marketPlace.currency,
            location: marketPlace.location,
            category: marketPlace.category,
            createdAt: marketPlace.createdAt,
          },
          poll: {
            id: polls.id,
            title: polls.title,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(groups, eq(userFeed.groupId, groups.id))
        .leftJoin(marketPlace, eq(userFeed.marketPlaceId, marketPlace.id))
        .leftJoin(jobs, eq(userFeed.jobId, jobs.id))
        .leftJoin(polls, eq(userFeed.pollId, polls.id))
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(celebration, eq(userFeed.celebrationId, celebration.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(and(...conditions))
        .orderBy(desc(userFeed.createdAt))
        .limit(limit + 1);

      // Determine if there's a next page
      const hasNextPage = result.length > limit;
      const nodes = hasNextPage ? result.slice(0, limit) : result;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFeed)
        .where(and(eq(userFeed.entity, entity), isNull(userFeed.groupId)));

      const totalCount = Number(countResult?.count || 0);

      // Process feeds with permissions
      const processedFeeds = this.processFeedsWithPermissions(nodes);

      // Build edges
      const edges = processedFeeds.map((feed: any) => ({
        cursor: feed.createdAt.toISOString(),
        node: feed,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount,
      };
    } catch (error) {
      log.error("Error in getUserFeed", {
        error,
        currentUserId,
        entity,
        cursor,
        limit,
      });
      throw error;
    }
  }

  // Get user activity feed (specific user's posts, shares, etc.)
  static async getUserActivityFeed({
    currentUserId,
    userId,
    db,
  }: {
    currentUserId: string;
    userId: string;
    db: any;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      const result = await db
        .select({
          ...fields,
          repostId: userFeed?.repostId,
          group: {
            id: groups.id,
            title: groups.title,
            cover: groups.cover,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(groups, eq(userFeed.groupId, groups.id))
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(eq(userFeed.userId, userId))
        .orderBy(desc(userFeed.createdAt))
        .limit(50);

      return this.processFeedsWithPermissions(result);
    } catch (error) {
      log.error("Error in getUserActivityFeed", {
        error,
        currentUserId,
        userId,
      });
      throw error;
    }
  }

  // Get communities feed (all posts from joined communities)
  static async getCommunitiesFeed({
    currentUserId,
    db,
  }: {
    currentUserId: string;
    db: any;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      const result = await db
        .select({
          ...fields,
          group: {
            id: groups.id,
            title: groups.title,
            cover: groups.cover,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(groups, eq(userFeed.groupId, groups.id))
        .leftJoin(userStory, eq(userFeed.storyId, userStory.id))
        .leftJoin(events, eq(userFeed.eventId, events.id))
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .leftJoin(
          groupMember,
          sql`${userFeed.groupId} = ${groupMember.groupId}`,
        )
        .where(
          sql`${groupMember.userId} = ${currentUserId} AND ${userFeed.groupId} IS NOT NULL`,
        )
        .orderBy(desc(userFeed.createdAt))
        .limit(50);

      return this.processFeedsWithPermissions(result);
    } catch (error) {
      log.error("Error in getCommunitiesFeed", { error, currentUserId });
      throw error;
    }
  }

  // Get user activity feed with cursor-based pagination
  static async getFeedActivityByUserId({
    currentUserId,
    userId,
    db,
    cursor,
    limit = 20,
    entity,
  }: {
    currentUserId: string;
    userId: string;
    db: any;
    cursor?: string;
    limit?: number;
    entity: string;
  }) {
    try {
      const fields = await this.setField(currentUserId);

      // Build conditions
      const conditions = [
        eq(userFeed.userId, userId),
        eq(userFeed.entity, entity),
      ];

      // Add cursor condition if provided
      if (cursor) {
        conditions.push(sql`${userFeed.createdAt} < ${new Date(cursor)}`);
      }

      // Fetch limit + 1 to determine if there's a next page
      const result = await db
        .select({
          ...fields,
          repostId: userFeed?.repostId,
          group: {
            id: groups.id,
            title: groups.title,
            cover: groups.cover,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(groups, eq(userFeed.groupId, groups.id))
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(and(...conditions))
        .orderBy(desc(userFeed.createdAt))
        .limit(limit + 1);

      // Determine if there's a next page
      const hasNextPage = result.length > limit;
      const nodes = hasNextPage ? result.slice(0, limit) : result;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFeed)
        .where(and(eq(userFeed.userId, userId), eq(userFeed.entity, entity)));

      const totalCount = Number(countResult?.count || 0);

      // Process feeds with permissions
      const processedFeeds = this.processFeedsWithPermissions(nodes);

      // Build edges
      const edges = processedFeeds.map((feed: any) => ({
        cursor: feed.createdAt.toISOString(),
        node: feed,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount,
      };
    } catch (error) {
      log.error("Error in getFeedActivityByUserId", {
        error,
        userId,
        entity,
        cursor,
        limit,
      });
      throw error;
    }
  }
}
