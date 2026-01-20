import { and, desc, eq, inArray, or, sql, asc } from "drizzle-orm";
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
} from "@thrico/database";
import { log } from "@thrico/logging";
import type { FeedQueryParams } from "./types";

export class FeedQueryService {
  // Helper to set common fields
  private static async setField(currentUserId: string) {
    return {
      id: userFeed.id,
      description: userFeed.description,
      source: userFeed.source,
      createdAt: userFeed.createdAt,
      totalComment: userFeed.totalComment,
      totalReactions: userFeed.totalReactions,
      totalReShare: userFeed.totalReShare,
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
        discount: offers.discount,
        image: offers.image,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
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
    };
  }

  // Get user's own feed
  static async getMyFeed({
    currentUserId,
    db,
    offset = 0,
    limit = 2,
    entity,
  }: FeedQueryParams) {
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
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(
          and(eq(userFeed.userId, currentUserId), eq(userFeed.entity, entity))
        )
        .orderBy(desc(userFeed.createdAt))
        .limit(limit)
        .offset(offset);

      return result;
    } catch (error) {
      log.error("Error in getMyFeed", {
        error,
        currentUserId,
        entity,
        offset,
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
        .where(eq(userFeed.id, feedId))
        .limit(1);

      return result?.[0] || null;
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
  static async getCommunitiesFeedList({
    currentUserId,
    db,
    id,
    offset = 0,
    limit = 2,
    entity,
  }: FeedQueryParams & { id: string }) {
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
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(and(eq(userFeed.groupId, id), eq(userFeed.entity, entity)))
        .orderBy(desc(userFeed.createdAt))
        .limit(limit)
        .offset(offset);

      return result;
    } catch (error) {
      log.error("Error in getCommunitiesFeedList", {
        error,
        currentUserId,
        id,
        entity,
        offset,
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

      return result;
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

      return result;
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
            eq(connectionsRequest.connectionStatusEnum, "PENDING")
          )
        )
        .union(
          db
            .select({ followingUserId: connections.user2 })
            .from(connections)
            .where(
              and(
                eq(connections.user1, currentUserId),
                eq(connections.connectionStatusEnum, "ACCEPTED")
              )
            )
        )
        .union(
          db
            .select({ followingUserId: connections.user1 })
            .from(connections)
            .where(
              and(
                eq(connections.user2, currentUserId),
                eq(connections.connectionStatusEnum, "ACCEPTED")
              )
            )
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
              eq(userFeed.userId, currentUserId)
            ),
            eq(userFeed.source, "event")
          )
        )
        .orderBy(desc(userFeed.createdAt))
        .limit(50);

      return result;
    } catch (error) {
      log.error("Error in getUserEventsFeed", { error, currentUserId });
      throw error;
    }
  }

  // Get feed comments
  static async getFeedComment({
    currentUserId,
    input,
    db,
  }: {
    currentUserId: string;
    input: { feedId: string };
    db: any;
  }) {
    try {
      const result = await db.query.feedComment.findMany({
        where: eq(feedComment.feedId, input.feedId),
        with: {
          user: {
            with: {
              about: true,
            },
          },
          replies: {
            with: {
              user: {
                with: {
                  about: true,
                },
              },
            },
          },
        },
        orderBy: [desc(feedComment.createdAt)],
      });

      return result;
    } catch (error) {
      log.error("Error in getFeedComment", { error, currentUserId, input });
      throw error;
    }
  }

  // Get user feed (all posts from a specific user)
  static async getUserFeed({
    currentUserId,
    db,
    offset = 0,
    limit = 10,
    entity,
  }: {
    currentUserId: string;
    db: any;
    offset?: number;
    limit?: number;
    entity: string;
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
          poll: {
            id: polls.id,
            title: polls.title,
          },
        })
        .from(userFeed)
        .leftJoin(user, eq(userFeed.userId, user.id))
        .leftJoin(groups, eq(userFeed.groupId, groups.id))
        .leftJoin(jobs, eq(userFeed.jobId, jobs.id))
        .leftJoin(polls, eq(userFeed.pollId, polls.id))
        .leftJoin(offers, eq(userFeed.offerId, offers.id))
        .leftJoin(celebration, eq(userFeed.celebrationId, celebration.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(eq(userFeed.entity, entity))
        .orderBy(desc(userFeed.createdAt))
        .limit(limit)
        .offset(offset);

      console.log(result.length);

      return result;
    } catch (error) {
      log.error("Error in getUserFeed", {
        error,
        currentUserId,
        entity,
        offset,
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

      return result;
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
          sql`${userFeed.groupId} = ${groupMember.groupId}`
        )
        .where(
          sql`${groupMember.userId} = ${currentUserId} AND ${userFeed.groupId} IS NOT NULL`
        )
        .orderBy(desc(userFeed.createdAt))
        .limit(50);

      return result;
    } catch (error) {
      log.error("Error in getCommunitiesFeed", { error, currentUserId });
      throw error;
    }
  }
}
