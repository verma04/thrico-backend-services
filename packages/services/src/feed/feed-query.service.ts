import {
  and,
  desc,
  eq,
  inArray,
  or,
  sql,
  asc,
  isNull,
  exists,
} from "drizzle-orm";
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
  moments,
  momentReactions,
  momentWishlist,
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
      isAiContent: userFeed.isAiContent,
      groupId: userFeed.groupId,
      jobId: userFeed.jobId,
      marketPlaceId: userFeed.marketPlaceId,
      eventId: userFeed.eventId,
      pollId: userFeed.pollId,
      storyId: userFeed.storyId,
      offerId: userFeed.offerId,
      repostId: userFeed.repostId,
      momentId: userFeed.momentId,
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
      )::boolean`,
      isWishList: sql<boolean>`EXISTS (
        SELECT 1 FROM ${feedWishList}
        WHERE ${feedWishList.feedId} = ${userFeed.id}
        AND ${feedWishList.userId} = ${currentUserId}
      )::boolean`,
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
      reactionType: sql<string | null>`(
        SELECT ${feedReactions.reactionsType}::text
        FROM ${feedReactions}
        WHERE ${feedReactions.feedId} = ${userFeed.id}
        AND ${feedReactions.userId} = ${currentUserId}
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

  // ─── Cursor helpers ───────────────────────────────────────────────────────
  /**
   * Encode a feed row into a stable base64 cursor.
   * Format inside: "<ISO-createdAt>|<uuid-id>"
   */
  private static encodeCursor(feed: { createdAt: Date; id: string }): string {
    return Buffer.from(`${feed.createdAt.toISOString()}|${feed.id}`).toString(
      "base64",
    );
  }

  /**
   * Decode a base64 cursor back into { createdAt, id }.
   */
  private static decodeCursor(cursor: string): { createdAt: Date; id: string } {
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    const [createdAtStr, id] = decoded.split("|");
    return { createdAt: new Date(createdAtStr), id };
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── Root-only fields (no JOIN-dependent columns) ─────────────────────────
  /**
   * Returns only userFeed columns + scalar subqueries.
   * Used for step-1 pagination queries that must NOT join other tables.
   */
  private static getRootFields(currentUserId: string) {
    return {
      id: userFeed.id,
      userId: userFeed.userId,
      description: userFeed.description,
      source: userFeed.source,
      createdAt: userFeed.createdAt,
      totalComment: userFeed.totalComment,
      totalReactions: userFeed.totalReactions,
      totalReShare: userFeed.totalReShare,
      isPinned: userFeed.isPinned,
      pinnedAt: userFeed.pinnedAt,
      privacy: userFeed.privacy,
      addedBy: userFeed.addedBy,
      videoUrl: userFeed.videoUrl,
      thumbnailUrl: userFeed.thumbnailUrl,
      isAiContent: userFeed.isAiContent,
      groupId: userFeed.groupId,
      jobId: userFeed.jobId,
      marketPlaceId: userFeed.marketPlaceId,
      eventId: userFeed.eventId,
      pollId: userFeed.pollId,
      storyId: userFeed.storyId,
      offerId: userFeed.offerId,
      repostId: userFeed.repostId,
      momentId: userFeed.momentId,
      celebrationId: userFeed.celebrationId,
      // Correlated scalar subqueries — safe without JOINs
      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM ${feedReactions}
        WHERE ${feedReactions.feedId} = ${userFeed.id}
        AND ${feedReactions.userId} = ${currentUserId}
      )::boolean`,
      isWishList: sql<boolean>`EXISTS (
        SELECT 1 FROM ${feedWishList}
        WHERE ${feedWishList.feedId} = ${userFeed.id}
        AND ${feedWishList.userId} = ${currentUserId}
      )::boolean`,
      media: sql<Array<string>>`ARRAY(
        SELECT ${media.url}
        FROM ${media}
        WHERE ${media.feedId} = ${userFeed.id}
      )`,
      isOwner: sql<boolean>`${userFeed.userId} = ${currentUserId}`,
      groupRole: sql<string | null>`(
        SELECT ${groupMember.role}
        FROM ${groupMember}
        WHERE ${groupMember.userId} = ${currentUserId}
        AND ${groupMember.groupId} = ${userFeed.groupId}
        LIMIT 1
      )`,
      reactionType: sql<string | null>`(
        SELECT ${feedReactions.reactionsType}::text
        FROM ${feedReactions}
        WHERE ${feedReactions.feedId} = ${userFeed.id}
        AND ${feedReactions.userId} = ${currentUserId}
        LIMIT 1
      )`,
    };
  }

  // ─── Batch relation hydrator (step 2) ─────────────────────────────────────
  /**
   * Given an array of root-only feed rows, batch-load all requested relations
   * in parallel and merge them back into each feed via lookup maps.
   */
  private static async hydrateFeeds(
    baseFeeds: any[],
    db: any,
    currentUserId: string,
    opts: {
      includeGroup?: boolean;
      includeJob?: boolean;
      includeMarketplace?: boolean;
      includeMoment?: boolean;
      includePoll?: boolean;
      includeCelebration?: boolean;
      includeOffer?: boolean;
      includeCommunityFeed?: boolean;
      includeMedia?: boolean;
    } = {},
  ): Promise<any[]> {
    if (baseFeeds.length === 0) return [];

    // ── Collect unique foreign-key IDs ──────────────────────────────────
    const userIds = [
      ...new Set(baseFeeds.map((f) => f.userId).filter(Boolean)),
    ];
    const queries: Record<string, Promise<any[]>> = {};

    // Always load users + aboutUser
    if (userIds.length > 0) {
      queries.users = db
        .select({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        })
        .from(user)
        .where(inArray(user.id, userIds));
      queries.aboutUsers = db
        .select({ userId: aboutUser.userId, headline: aboutUser.headline })
        .from(aboutUser)
        .where(inArray(aboutUser.userId, userIds));
    }

    if (opts.includeMedia) {
      const ids = [...new Set(baseFeeds.map((f) => f.id).filter(Boolean))];
      if (ids.length > 0)
        queries.media = db
          .select({ id: media.id, feedId: media.feedId, url: media.url })
          .from(media)
          .where(inArray(media.feedId, ids));
    }

    if (opts.includeGroup) {
      const ids = [...new Set(baseFeeds.map((f) => f.groupId).filter(Boolean))];
      if (ids.length > 0)
        queries.groups = db
          .select({ id: groups.id, title: groups.title, cover: groups.cover })
          .from(groups)
          .where(inArray(groups.id, ids));
    }
    if (opts.includeJob) {
      const ids = [...new Set(baseFeeds.map((f) => f.jobId).filter(Boolean))];
      if (ids.length > 0)
        queries.jobs = db
          .select({
            id: jobs.id,
            title: jobs.title,
            company: jobs.company,
            description: jobs.description,
            location: jobs.location,
            jobType: jobs.jobType,
            workplaceType: jobs.workplaceType,
          })
          .from(jobs)
          .where(inArray(jobs.id, ids));
    }
    if (opts.includeMarketplace) {
      const ids = [
        ...new Set(baseFeeds.map((f) => f.marketPlaceId).filter(Boolean)),
      ];
      if (ids.length > 0)
        queries.marketplace = db
          .select({
            id: marketPlace.id,
            title: marketPlace.title,
            description: marketPlace.description,
            price: marketPlace.price,
            currency: marketPlace.currency,
            location: marketPlace.location,
            category: marketPlace.category,
            createdAt: marketPlace.createdAt,
          })
          .from(marketPlace)
          .where(inArray(marketPlace.id, ids));
    }
    if (opts.includeMoment) {
      const ids = [
        ...new Set(baseFeeds.map((f) => f.momentId).filter(Boolean)),
      ];
      if (ids.length > 0) {
        // Load full moment details including owner, isLiked, isWishlisted, isOwner
        queries.moments = db
          .select({
            id: moments.id,
            tenantId: moments.tenantId,
            userId: moments.userId,
            entityId: moments.entityId,
            videoUrl: moments.videoUrl,
            optimizedVideoUrl: moments.optimizedVideoUrl,
            hlsUrl: moments.hlsUrl,
            thumbnailUrl: moments.thumbnailUrl,
            thumbnailOptions: moments.thumbnailOptions,
            caption: moments.caption,
            status: moments.status,
            createdAt: moments.createdAt,
            updatedAt: moments.updatedAt,
            totalReactions: moments.totalReactions,
            totalComments: moments.totalComments,
            totalReshares: moments.totalReshares,
            totalViews: moments.totalViews,
            isAiContent: moments.isAiContent,
            // Owner info via LEFT JOIN
            owner: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              headline: aboutUser.headline,
            },
            isLiked: exists(
              db
                .select()
                .from(momentReactions)
                .where(
                  and(
                    eq(momentReactions.momentId, moments.id),
                    eq(momentReactions.userId, currentUserId),
                  ),
                ),
            ),
            isWishlisted: exists(
              db
                .select()
                .from(momentWishlist)
                .where(
                  and(
                    eq(momentWishlist.momentId, moments.id),
                    eq(momentWishlist.userId, currentUserId),
                  ),
                ),
            ),
            isOwner: sql<boolean>`${moments.userId} = ${currentUserId}`,
          })
          .from(moments)
          .leftJoin(user, eq(moments.userId, user.id))
          .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
          .where(inArray(moments.id, ids));
      }
    }
    if (opts.includePoll) {
      const ids = [...new Set(baseFeeds.map((f) => f.pollId).filter(Boolean))];
      if (ids.length > 0)
        queries.polls = db
          .select({ id: polls.id, title: polls.title })
          .from(polls)
          .where(inArray(polls.id, ids));
    }
    if (opts.includeCelebration) {
      const ids = [
        ...new Set(baseFeeds.map((f) => f.celebrationId).filter(Boolean)),
      ];
      if (ids.length > 0)
        queries.celebrations = db
          .select({
            id: celebration.id,
            celebrationType: celebration.celebrationType,
            title: celebration.title,
            description: celebration.description,
            cover: celebration.cover,
          })
          .from(celebration)
          .where(inArray(celebration.id, ids));
    }
    if (opts.includeOffer) {
      const ids = [...new Set(baseFeeds.map((f) => f.offerId).filter(Boolean))];
      if (ids.length > 0)
        queries.offers = db
          .select({
            id: offers.id,
            title: offers.title,
            description: offers.description,
            location: offers.location,
            company: offers.company,
            timeline: offers.timeline,
          })
          .from(offers)
          .where(inArray(offers.id, ids));
    }
    if (opts.includeCommunityFeed) {
      const feedIds = baseFeeds.map((f) => f.id);
      if (feedIds.length > 0)
        queries.communityFeeds = db
          .select({
            id: communityFeed.id,
            userFeedId: communityFeed.userFeedId,
          })
          .from(communityFeed)
          .where(inArray(communityFeed.userFeedId, feedIds));
    }

    // ── Execute all relation queries in parallel ────────────────────────
    const keys = Object.keys(queries);
    const results = await Promise.all(Object.values(queries));
    const data: Record<string, any[]> = {};
    keys.forEach((key, i) => {
      data[key] = results[i];
    });

    // ── Build lookup maps ───────────────────────────────────────────────
    const userMap = new Map((data.users || []).map((u: any) => [u.id, u]));
    const aboutMap = new Map(
      (data.aboutUsers || []).map((a: any) => [a.userId, a]),
    );
    const groupMap = new Map((data.groups || []).map((g: any) => [g.id, g]));
    const jobMap = new Map((data.jobs || []).map((j: any) => [j.id, j]));
    const mpMap = new Map((data.marketplace || []).map((m: any) => [m.id, m]));
    const momentMap = new Map((data.moments || []).map((m: any) => [m.id, m]));
    const pollMap = new Map((data.polls || []).map((p: any) => [p.id, p]));
    const celebMap = new Map(
      (data.celebrations || []).map((c: any) => [c.id, c]),
    );
    const offerMap = new Map((data.offers || []).map((o: any) => [o.id, o]));
    const cfMap = new Map(
      (data.communityFeeds || []).map((cf: any) => [cf.userFeedId, cf]),
    );

    const mediaByFeedId = new Map<string, string[]>();
    for (const m of data.media || []) {
      const arr = mediaByFeedId.get(m.feedId) || [];
      arr.push(m.url);
      mediaByFeedId.set(m.feedId, arr);
    }
    // ── Merge relations into each feed ──────────────────────────────────
    return baseFeeds.map((feed) => {
      const u = userMap.get(feed.userId);
      const ab = aboutMap.get(feed.userId);
      const momentData =
        opts.includeMoment && feed.momentId
          ? momentMap.get(feed.momentId)
          : null;

      return {
        ...feed,
        user: u
          ? {
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              avatar: u.avatar,
              headline: ab?.headline || null,
            }
          : null,
        media: opts.includeMedia
          ? mediaByFeedId.get(feed.id) || []
          : feed.media || [],
        offer: feed.offerId ? offerMap.get(feed.offerId) || null : null,
        // Consolidated like/wishlist status (accounts for moments if included)
        isLiked: momentData ? !!momentData.isLiked : !!feed.isLiked,
        isWishList: momentData ? !!momentData.isWishlisted : !!feed.isWishList,
        // Sync counts for moments
        totalReactions: momentData
          ? momentData.totalReactions
          : feed.totalReactions,
        totalComment: momentData ? momentData.totalComments : feed.totalComment,
        ...(opts.includeGroup
          ? { group: feed.groupId ? groupMap.get(feed.groupId) || null : null }
          : {}),
        ...(opts.includeJob
          ? { job: feed.jobId ? jobMap.get(feed.jobId) || null : null }
          : {}),
        ...(opts.includeMarketplace
          ? {
              listing: feed.marketPlaceId
                ? mpMap.get(feed.marketPlaceId) || null
                : null,
            }
          : {}),
        ...(opts.includeMoment ? { moment: momentData || null } : {}),
        ...(opts.includePoll
          ? { poll: feed.pollId ? pollMap.get(feed.pollId) || null : null }
          : {}),
        ...(opts.includeCelebration
          ? {
              celebration: feed.celebrationId
                ? celebMap.get(feed.celebrationId) || null
                : null,
            }
          : {}),
        ...(opts.includeCommunityFeed
          ? { communityfeedId: cfMap.get(feed.id)?.id || null }
          : {}),
      };
    });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Get user's own feed with stable cursor-based pagination.
  //
  // Architecture:
  //   1. Pinned feeds  → separate query, always returned on top, never paginated.
  //   2. Normal feeds  → deterministic cursor on (createdAt DESC, id DESC).
  //
  // This eliminates duplicate / missing feed items that occur when
  // ORDER BY only uses createdAt (ties broken non-deterministically).
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
      const rootFields = this.getRootFields(currentUserId);

      // ── Step 1: Root-only query for pinned feeds (no JOINs) ─────────────
      const pinnedBaseFeeds = await db
        .select(rootFields)
        .from(userFeed)
        .where(
          and(
            eq(userFeed.userId, currentUserId),
            eq(userFeed.entity, entity),
            isNull(userFeed.groupId),
            eq(userFeed.isPinned, true),
          ),
        )
        .orderBy(desc(userFeed.pinnedAt));

      // ── Step 2: Build cursor condition for normal feeds ─────────────────
      const normalConditions: any[] = [
        eq(userFeed.userId, currentUserId),
        eq(userFeed.entity, entity),
        isNull(userFeed.groupId),
        eq(userFeed.isPinned, false),
      ];

      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        normalConditions.push(
          or(
            sql`${userFeed.createdAt} < ${cursorDate}`,
            and(
              sql`${userFeed.createdAt} = ${cursorDate}`,
              sql`${userFeed.id} < ${cursorId}`,
            ),
          ),
        );
      }

      // ── Step 3: Root-only query for normal feeds (no JOINs) ─────────────
      const normalBaseFeeds = await db
        .select(rootFields)
        .from(userFeed)
        .where(and(...normalConditions))
        .orderBy(desc(userFeed.createdAt), desc(userFeed.id))
        .limit(limit + 1);

      // ── Step 4: Determine pagination state ──────────────────────────────
      const hasNextPage = normalBaseFeeds.length > limit;
      const normalNodes = hasNextPage
        ? normalBaseFeeds.slice(0, limit)
        : normalBaseFeeds;

      // ── Step 5: Batch hydrate relations for all feeds in parallel ───────
      const pinnedToHydrate = !cursor ? pinnedBaseFeeds : [];
      const allBaseFeeds = [...pinnedToHydrate, ...normalNodes];

      const hydratedAll = await this.hydrateFeeds(
        allBaseFeeds,
        db,
        currentUserId,
        {
          includeGroup: true,
          includeJob: true,
          includeMarketplace: true,
          includeMoment: true,
          includeOffer: true,
          includeMedia: true,
        },
      );

      // Split back into pinned and normal
      const pinnedCount = pinnedToHydrate.length;
      const hydratedPinned = hydratedAll.slice(0, pinnedCount);
      const hydratedNormal = hydratedAll.slice(pinnedCount);

      // ── Step 6: Get total count ─────────────────────────────────────────
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

      // ── Step 7: Process permissions ─────────────────────────────────────
      const pinnedProcessed = this.processFeedsWithPermissions(hydratedPinned);
      const normalProcessed = this.processFeedsWithPermissions(hydratedNormal);

      // ── Step 8: Build edges with composite cursors ──────────────────────
      const pinnedEdges = pinnedProcessed.map((feed: any) => ({
        cursor: `pinned:${feed.id}`,
        node: feed,
      }));

      const normalEdges = normalProcessed.map((feed: any) => ({
        cursor: this.encodeCursor(feed),
        node: feed,
      }));

      const edges = [...pinnedEdges, ...normalEdges];

      const endCursor =
        normalEdges.length > 0
          ? normalEdges[normalEdges.length - 1].cursor
          : null;

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        totalCount,
        hasPinnedPost: pinnedBaseFeeds.length > 0,
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
          moment: {
            id: moments.id,
            tenantId: moments.tenantId,
            userId: moments.userId,
            entityId: moments.entityId,
            videoUrl: moments.videoUrl,
            optimizedVideoUrl: moments.optimizedVideoUrl,
            hlsUrl: moments.hlsUrl,
            thumbnailUrl: moments.thumbnailUrl,
            thumbnailOptions: moments.thumbnailOptions,
            caption: moments.caption,
            status: moments.status,
            createdAt: moments.createdAt,
            updatedAt: moments.updatedAt,
            totalReactions: moments.totalReactions,
            totalComments: moments.totalComments,
            totalReshares: moments.totalReshares,
            totalViews: moments.totalViews,
            isAiContent: moments.isAiContent,
            owner: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              headline: aboutUser.headline,
            },
            isLiked: exists(
              db
                .select()
                .from(momentReactions)
                .where(
                  and(
                    eq(momentReactions.momentId, moments.id),
                    eq(momentReactions.userId, currentUserId),
                  ),
                ),
            ),
            isWishlisted: exists(
              db
                .select()
                .from(momentWishlist)
                .where(
                  and(
                    eq(momentWishlist.momentId, moments.id),
                    eq(momentWishlist.userId, currentUserId),
                  ),
                ),
            ),
            isOwner: sql<boolean>`${moments.userId} = ${currentUserId}`,
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
        .leftJoin(moments, eq(userFeed.momentId, moments.id))
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

  // Get communities feed list with stable cursor-based pagination
  static async getCommunitiesFeedList({
    currentUserId,
    db,
    id,
    cursor,
    limit = 20,
    entity,
  }: FeedQueryParams & { id: string }) {
    try {
      const rootFields = this.getRootFields(currentUserId);

      // ── Step 1: Build conditions ────────────────────────────────────────
      const conditions: any[] = [
        eq(userFeed.groupId, id),
        eq(userFeed.entity, entity),
      ];

      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        conditions.push(
          or(
            sql`${userFeed.createdAt} < ${cursorDate}`,
            and(
              sql`${userFeed.createdAt} = ${cursorDate}`,
              sql`${userFeed.id} < ${cursorId}`,
            ),
          ),
        );
      }

      // ── Step 2: Root-only pagination query (no JOINs) ───────────────────
      const baseFeeds = await db
        .select(rootFields)
        .from(userFeed)
        .where(and(...conditions))
        .orderBy(desc(userFeed.createdAt), desc(userFeed.id))
        .limit(limit + 1);

      const hasNextPage = baseFeeds.length > limit;
      const nodes = hasNextPage ? baseFeeds.slice(0, limit) : baseFeeds;

      // ── Step 3: Batch hydrate relations ─────────────────────────────────
      const hydratedFeeds = await this.hydrateFeeds(nodes, db, currentUserId, {
        includeGroup: true,
        includeOffer: true,
        includeCommunityFeed: true,
      });

      // ── Step 4: Total count ─────────────────────────────────────────────
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFeed)
        .where(and(eq(userFeed.groupId, id), eq(userFeed.entity, entity)));

      const totalCount = Number(countResult?.count || 0);

      // ── Step 5: Process & return ────────────────────────────────────────
      const processedFeeds = this.processFeedsWithPermissions(hydratedFeeds);

      const edges = processedFeeds.map((feed: any) => ({
        cursor: this.encodeCursor(feed),
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

  // Get feed comments with stable cursor-based pagination and permissions
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
      const conditions: any[] = [eq(feedComment.feedId, feedId)];

      // Stable keyset cursor on (createdAt DESC, id DESC) for comments
      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        conditions.push(
          or(
            sql`${feedComment.createdAt} < ${cursorDate}`,
            and(
              sql`${feedComment.createdAt} = ${cursorDate}`,
              sql`${feedComment.id} < ${cursorId}`,
            ),
          ),
        );
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
        .orderBy(desc(feedComment.createdAt), desc(feedComment.id))
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

      // Build edges with composite (createdAt|id) cursors
      const edges = processedComments.map((comment: any) => ({
        cursor: this.encodeCursor(comment),
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

  // Get user feed (all posts from entity) with stable cursor-based pagination
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
      const rootFields = this.getRootFields(currentUserId);

      // ── Step 1: Root-only query for pinned feeds (entity-level with no groups) ─────────────
      const pinnedBaseFeeds = await db
        .select(rootFields)
        .from(userFeed)
        .where(
          and(
            eq(userFeed.entity, entity),
            isNull(userFeed.groupId),
            eq(userFeed.isPinned, true),
          ),
        )
        .orderBy(desc(userFeed.pinnedAt));

      // ── Step 2: Build cursor condition for normal (non-pinned) feeds ─────────────────
      const normalConditions: any[] = [
        eq(userFeed.entity, entity),
        isNull(userFeed.groupId),
        eq(userFeed.isPinned, false),
      ];

      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        normalConditions.push(
          or(
            sql`${userFeed.createdAt} < ${cursorDate}`,
            and(
              sql`${userFeed.createdAt} = ${cursorDate}`,
              sql`${userFeed.id} < ${cursorId}`,
            ),
          ),
        );
      }

      // ── Step 3: Root-only query for normal feeds (no JOINs) ──────────────────────────────────
      const normalBaseFeeds = await db
        .select(rootFields)
        .from(userFeed)
        .where(and(...normalConditions))
        .orderBy(desc(userFeed.createdAt), desc(userFeed.id))
        .limit(limit + 1);

      // ── Step 4: Determine pagination state ──────────────────────────────
      const hasNextPage = normalBaseFeeds.length > limit;
      const normalNodes = hasNextPage
        ? normalBaseFeeds.slice(0, limit)
        : normalBaseFeeds;

      // ── Step 5: Batch hydrate all relations in parallel ─────────────────
      // If we're on the first page, include pinned posts at the top
      const pinnedToHydrate = !cursor ? pinnedBaseFeeds : [];
      const allBaseFeeds = [...pinnedToHydrate, ...normalNodes];

      const hydratedFeeds = await this.hydrateFeeds(
        allBaseFeeds,
        db,
        currentUserId,
        {
          includeGroup: true,
          includeJob: true,
          includeMarketplace: true,
          includeMoment: true,
          includePoll: true,
          includeCelebration: true,
          includeOffer: true,
          includeMedia: true,
        },
      );

      // Split back into pinned and normal
      const pinnedCount = pinnedToHydrate.length;
      const hydratedPinned = hydratedFeeds.slice(0, pinnedCount);
      const hydratedNormal = hydratedFeeds.slice(pinnedCount);

      // ── Step 6: Total count ─────────────────────────────────────────────
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFeed)
        .where(and(eq(userFeed.entity, entity), isNull(userFeed.groupId)));

      const totalCount = Number(countResult?.count || 0);

      // ── Step 7: Process permissions ─────────────────────────────────────
      const pinnedProcessed = this.processFeedsWithPermissions(hydratedPinned);
      const normalProcessed = this.processFeedsWithPermissions(hydratedNormal);

      // ── Step 8: Build edges with cursors ───────────────────────
      const pinnedEdges = pinnedProcessed.map((feed: any) => ({
        cursor: `pinned:${feed.id}`,
        node: feed,
      }));

      const normalEdges = normalProcessed.map((feed: any) => ({
        cursor: this.encodeCursor(feed),
        node: feed,
      }));

      const edges = [...pinnedEdges, ...normalEdges];

      const endCursor =
        normalEdges.length > 0
          ? normalEdges[normalEdges.length - 1].cursor
          : null;

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        totalCount,
        hasPinnedPost: pinnedBaseFeeds.length > 0,
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

  // Get user activity feed with stable cursor-based pagination
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
      const rootFields = this.getRootFields(currentUserId);

      // ── Step 1: Build conditions ────────────────────────────────────────
      const conditions: any[] = [
        eq(userFeed.userId, userId),
        eq(userFeed.entity, entity),
      ];

      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        conditions.push(
          or(
            sql`${userFeed.createdAt} < ${cursorDate}`,
            and(
              sql`${userFeed.createdAt} = ${cursorDate}`,
              sql`${userFeed.id} < ${cursorId}`,
            ),
          ),
        );
      }

      // ── Step 2: Root-only pagination query (no JOINs) ───────────────────
      const baseFeeds = await db
        .select(rootFields)
        .from(userFeed)
        .where(and(...conditions))
        .orderBy(desc(userFeed.createdAt), desc(userFeed.id))
        .limit(limit + 1);

      const hasNextPage = baseFeeds.length > limit;
      const nodes = hasNextPage ? baseFeeds.slice(0, limit) : baseFeeds;

      // ── Step 3: Batch hydrate relations ─────────────────────────────────
      const hydratedFeeds = await this.hydrateFeeds(nodes, db, currentUserId, {
        includeGroup: true,
        includeOffer: true,
      });

      // ── Step 4: Total count ─────────────────────────────────────────────
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFeed)
        .where(and(eq(userFeed.userId, userId), eq(userFeed.entity, entity)));

      const totalCount = Number(countResult?.count || 0);

      // ── Step 5: Process & return ────────────────────────────────────────
      const processedFeeds = this.processFeedsWithPermissions(hydratedFeeds);

      const edges = processedFeeds.map((feed: any) => ({
        cursor: this.encodeCursor(feed),
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

  // Get feed reactions with stable cursor-based pagination
  static async getFeedReactions({
    feedId,
    cursor,
    limit = 20,
    db,
  }: {
    feedId: string;
    cursor?: string;
    limit?: number;
    db: any;
  }) {
    try {
      // Build conditions
      const conditions: any[] = [eq(feedReactions.feedId, feedId)];

      // Stable keyset cursor on (createdAt DESC, id DESC)
      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        conditions.push(
          or(
            sql`${feedReactions.createdAt} < ${cursorDate}`,
            and(
              sql`${feedReactions.createdAt} = ${cursorDate}`,
              sql`${feedReactions.id} < ${cursorId}`,
            ),
          ),
        );
      }

      const result = await db
        .select({
          id: feedReactions.id,
          createdAt: feedReactions.createdAt,
          reactionType: feedReactions.reactionsType,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            about: {
              headline: aboutUser.headline,
            },
          },
        })
        .from(feedReactions)
        .innerJoin(user, eq(feedReactions.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(and(...conditions))
        .orderBy(desc(feedReactions.createdAt), desc(feedReactions.id))
        .limit(limit + 1);

      // Determine if there's a next page
      const hasNextPage = result.length > limit;
      const nodes = hasNextPage ? result.slice(0, limit) : result;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(feedReactions)
        .where(eq(feedReactions.feedId, feedId));

      const totalCount = Number(countResult?.count || 0);

      // Build edges with composite (createdAt|id) cursors
      const edges = nodes.map((reaction: any) => ({
        cursor: this.encodeCursor(reaction),
        node: reaction,
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
      log.error("Error in getFeedReactions", { error, feedId, cursor, limit });
      throw error;
    }
  }
}
