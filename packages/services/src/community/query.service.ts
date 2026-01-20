import { eq, and, sql, desc, count, asc, inArray } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";
import {
  communitySettings,
  groupMember,
  groupRequest,
  groups,
  communityWishlist,
  user,
  type AppDatabase,
} from "@thrico/database";

export class CommunityQueryService {
  // Get All Communities with Trending & Membership Status and Pagination
  static async getAllCommunities({
    currentUserId,
    entityId,
    db,
    page = 1,
    limit = 10,
    searchTerm,
  }: {
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    page?: number;
    limit?: number;
    searchTerm?: string;
    filters?: {
      privacy?: string;
      communityType?: string;
      memberRange?: { min?: number; max?: number };
    };
  }) {
    try {
      const entityDetails = await db.query.entity.findFirst({
        where: (tcg, { eq }) => eq(tcg.id, entityId),
      });
      console.log(entityDetails);
      const condition = await db.query.trendingConditionsGroups.findFirst({
        where: (tcg, { eq }) => eq(tcg.entity, entityId),
      });

      // Build dynamic where conditions based on filters
      const whereConditions = [
        eq(groups.entity, entityId),
        eq(groups.isApproved, true),
      ];

      // Add search term condition
      if (searchTerm) {
        whereConditions.push(
          sql`(${groups.title} ILIKE ${`%${searchTerm}%`} OR ${
            groups.description
          } ILIKE ${`%${searchTerm}%`} OR ${
            groups.tagline
          } ILIKE ${`%${searchTerm}%`})`
        );
      }

      // Get total count for pagination
      const [totalCount] = await db
        .select({ value: count() })
        .from(groups)
        .where(and(...whereConditions));

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build order by clause
      let orderByClause = [desc(groups.createdAt)];

      const result = await db
        .select({
          id: groups.id,
          group: groups,
          role: sql<string>`(
            CASE 
              WHEN ${groupMember.role} IS NOT NULL THEN ${groupMember.role}
              ELSE 'NOT_MEMBER' 
            END
          )`.as("role"),
          isFeatured: groups.isFeatured,
          trendingScore: sql<number>`(${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0})`,
          rank: sql<number>`RANK() OVER (ORDER BY (${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0}) DESC)`,
          status: sql<string>`
          CASE
            WHEN ${groupRequest.userId} = ${currentUserId} AND ${groupRequest.groupId} = ${groups.id} AND ${groupRequest.memberStatusEnum} = 'PENDING' THEN 'REQUEST_SEND'
            WHEN ${groupMember.userId} = ${currentUserId} AND ${groupMember.groupId} = ${groups.id} THEN 'MEMBER'
            ELSE 'NO_MEMBER'
          END
        `.as("status"),
          isGroupMember: sql<boolean>`${groupMember.userId} IS NOT NULL`.as(
            "isGroupMember"
          ),
          isJoinRequest:
            sql<boolean>`${groupRequest.userId} IS NOT NULL AND ${groupRequest.memberStatusEnum} = 'PENDING'`.as(
              "isJoinRequest"
            ),
          isGroupAdmin: sql<boolean>`${groupMember.role} = 'ADMIN'`.as(
            "isGroupAdmin"
          ),
          isGroupManager:
            sql<boolean>`${groupMember.role} IN ('ADMIN', 'MANAGER')`.as(
              "isGroupManager"
            ),
          groupSettings: communitySettings,
          isWishlist: sql<boolean>`${communityWishlist.userId} IS NOT NULL`.as(
            "isWishlist"
          ),
          creator: {
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
          },
        })
        .from(groups)
        .where(and(...whereConditions))
        .orderBy(...orderByClause)
        .leftJoin(
          groupMember,
          and(
            eq(groupMember.groupId, groups.id),
            eq(groupMember.userId, currentUserId)
          )
        )
        .leftJoin(
          groupRequest,
          and(
            eq(groupRequest.groupId, groups.id),
            eq(groupRequest.userId, currentUserId)
          )
        )
        .leftJoin(
          communityWishlist,
          and(
            eq(communityWishlist.groupId, groups.id),
            eq(communityWishlist.userId, currentUserId)
          )
        )
        .leftJoin(user, eq(user.id, groups.creator))
        .leftJoin(communitySettings, eq(communitySettings.groupId, groups.id))
        .limit(limit)
        .offset(offset);

      // Get members for each community
      const communityIds = result.map((community: any) => community.id);
      const membersData = new Map();

      if (communityIds.length > 0) {
        const allMembers = await db.query.groupMember.findMany({
          where: (gm, { and, eq, inArray }) =>
            and(inArray(gm.groupId, communityIds)),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: (gm, { asc }) => [asc(gm.createdAt)],
        });

        allMembers.forEach((member) => {
          if (!membersData.has(member.groupId)) {
            membersData.set(member.groupId, []);
          }
          if (membersData.get(member.groupId).length < 10) {
            membersData.get(member.groupId).push({
              id: member.user.id,
              fullName: member.user.firstName + " " + member.user.lastName,
              avatar: member.user.avatar,
              role: member.role,
              joinedAt: member.createdAt,
            });
          }
        });
      }

      const topValue = result
        .sort((a, b) => b.rank - a.rank)
        .slice(0, condition?.length);

      const communitiesWithTrending = result.map((community) => ({
        ...community,
        isTrending: topValue.some((t) => t.id === community.id),
        members: membersData.get(community.id) || [],
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount.value / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      console.log(communitiesWithTrending);

      return {
        communities: communitiesWithTrending,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalCount.value,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  // Get Single Community with Comprehensive Details
  static async getCommunityDetails({
    currentUserId,
    entityId,
    db,
    groupId,
  }: {
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    groupId: string;
  }) {
    try {
      // Get community basic info with user relationship
      const community = await db.query.groups.findFirst({
        where: and(eq(groups.entity, entityId), eq(groups.id, groupId)),
        with: {
          creator: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          theme: true,
          ratingSummary: true,
        },
      });

      if (!community) {
        throw new GraphQLError("Community not found");
      }

      // Get user's membership status
      const membership = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, currentUserId)
        ),
      });

      // Get user's join request status
      const joinRequest = await db.query.groupRequest.findFirst({
        where: and(
          eq(groupRequest.groupId, groupId),
          eq(groupRequest.userId, currentUserId),
          eq(groupRequest.memberStatusEnum, "PENDING")
        ),
      });

      const topMembers = await db.query.groupMember.findMany({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.memberStatusEnum, "ACCEPTED")
        ),
        limit: 4,
        orderBy: [asc(groupMember.createdAt)],
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      // Get trending score and rank
      const condition = await db.query.trendingConditionsGroups.findFirst({
        where: (tcg, { eq }) => eq(tcg.entity, entityId),
      });

      const trendingScore =
        (condition?.user ? community!.numberOfUser ?? 0 : 0) +
        (condition?.likes ? community!.numberOfLikes ?? 0 : 0) +
        (condition?.discussion ? community!.numberOfPost ?? 0 : 0) +
        (condition?.views ? community!.numberOfViews ?? 0 : 0);

      // Get all communities for ranking
      const allCommunities = await db
        .select({
          id: groups.id,
          trendingScore: sql<number>`(${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0})`,
        })
        .from(groups)
        .where(and(eq(groups.entity, entityId), eq(groups.isApproved, true)))
        .leftJoin(user, eq(user.id, groups.creator))
        .orderBy(
          desc(
            sql`(${condition?.user ? groups.numberOfUser : 0} + ${
              condition?.likes ? groups.numberOfLikes : 0
            } + ${condition?.discussion ? groups.numberOfPost : 0} + ${
              condition?.views ? groups.numberOfViews : 0
            })`
          )
        );

      const topTrendingIds = allCommunities
        .slice(0, condition?.length || 10)
        .map((c) => c.id);

      // Determine user's role and status
      let userRole = "NOT_MEMBER";
      let membershipStatus = "NO_MEMBER";

      if (membership?.role) {
        userRole = membership?.role;
        membershipStatus = "MEMBER";
      } else if (joinRequest) {
        membershipStatus = "REQUEST_SEND";
      }

      // Get community settings
      const settings = await db.query.communitySettings.findFirst({
        where: eq(communitySettings.groupId, groupId),
      });

      // Get wishlist status
      let isWishlist = false;
      if (currentUserId) {
        const wishlist = await db.query.communityWishlist.findFirst({
          where: and(
            eq(communityWishlist.groupId, groupId),
            eq(communityWishlist.userId, currentUserId),
            eq(communityWishlist.entityId, entityId)
          ),
        });
        isWishlist = !!wishlist;
      }

      // Get rating summary (overrating)
      let overrating = null;
      if (community.ratingSummary) {
        overrating = community.ratingSummary.averageRating;
      }
      console.log(community);
      return {
        id: community.id,
        group: community,
        role: userRole,
        isFeatured: community.isFeatured,
        trendingScore,
        rank: null,
        status: membershipStatus,
        isGroupMember: membershipStatus === "MEMBER",
        isJoinRequest: membershipStatus === "REQUEST_SEND",
        isGroupAdmin: userRole === "ADMIN",
        isGroupManager: userRole === "ADMIN" || userRole === "MANAGER",
        groupSettings: settings,
        isWishlist,
        creator: community.creator,
        isTrending: topTrendingIds.includes(groupId),
        members: topMembers.map((member) => ({
          id: member.user.id,
          fullName: member.user.firstName + " " + member.user.lastName,
          avatar: member.user.avatar,
          role: member.role,
          joinedAt: member.createdAt,
        })),
        overrating,
      };
    } catch (err) {
      console.error("Error in getCommunityDetails", err);

      throw err;
    }
  }

  // Get Communities Owned by Current User
  static async getMyOwnedCommunities({
    currentUserId,
    entityId,
    db,
    page = 1,
    limit = 10,
    searchTerm,
  }: {
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    page?: number;
    limit?: number;
    searchTerm?: string;
  }) {
    try {
      const entityDetails = await db.query.entity.findFirst({
        where: (tcg, { eq }) => eq(tcg.id, entityId),
      });

      const condition = await db.query.trendingConditionsGroups.findFirst({
        where: (tcg, { eq }) => eq(tcg.entity, entityId),
      });

      // Build dynamic where conditions
      const whereConditions = [
        eq(groups.entity, entityId),
        eq(groups.isApproved, true),
        eq(groups.creator, currentUserId), // Filter by creator
      ];

      // Add search term condition
      if (searchTerm) {
        whereConditions.push(
          sql`(${groups.title} ILIKE ${`%${searchTerm}%`} OR ${
            groups.description
          } ILIKE ${`%${searchTerm}%`} OR ${
            groups.tagline
          } ILIKE ${`%${searchTerm}%`})`
        );
      }

      // Get total count for pagination
      const [totalCount] = await db
        .select({ value: count() })
        .from(groups)
        .where(and(...whereConditions));

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build order by clause
      let orderByClause = [desc(groups.createdAt)];

      const result = await db
        .select({
          id: groups.id,
          group: groups,
          role: sql<string>`'ADMIN'`.as("role"), // Owner is always ADMIN
          isFeatured: groups.isFeatured,
          trendingScore: sql<number>`(${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0})`,
          rank: sql<number>`RANK() OVER (ORDER BY (${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0}) DESC)`,
          status: sql<string>`'MEMBER'`.as("status"), // Owner is always a MEMBER
          isGroupMember: sql<boolean>`true`.as("isGroupMember"),
          isJoinRequest: sql<boolean>`false`.as("isJoinRequest"),
          isGroupAdmin: sql<boolean>`true`.as("isGroupAdmin"),
          isGroupManager: sql<boolean>`true`.as("isGroupManager"),
          groupSettings: communitySettings,
          isWishlist: sql<boolean>`${communityWishlist.userId} IS NOT NULL`.as(
            "isWishlist"
          ),
          creator: {
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
          },
        })
        .from(groups)
        .where(and(...whereConditions))
        .orderBy(...orderByClause)
        .leftJoin(
          communityWishlist,
          and(
            eq(communityWishlist.groupId, groups.id),
            eq(communityWishlist.userId, currentUserId)
          )
        )
        .leftJoin(user, eq(user.id, groups.creator))
        .leftJoin(communitySettings, eq(communitySettings.groupId, groups.id))
        .limit(limit)
        .offset(offset);

      // Get members for each community
      const communityIds = result.map((community) => community.id);
      const membersData = new Map();

      if (communityIds.length > 0) {
        const allMembers = await db.query.groupMember.findMany({
          where: (gm, { and, eq, inArray }) =>
            and(inArray(gm.groupId, communityIds)),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: (gm, { asc }) => [asc(gm.createdAt)],
        });

        allMembers.forEach((member) => {
          if (!membersData.has(member.groupId)) {
            membersData.set(member.groupId, []);
          }
          if (membersData.get(member.groupId).length < 10) {
            membersData.get(member.groupId).push({
              id: member.user.id,
              fullName: member.user.firstName + " " + member.user.lastName,
              avatar: member.user.avatar,
              role: member.role,
              joinedAt: member.createdAt,
            });
          }
        });
      }

      const topValue = result
        .sort((a, b) => b.rank - a.rank)
        .slice(0, condition?.length);

      const communitiesWithTrending = result.map((community) => ({
        ...community,
        isTrending: topValue.some((t) => t.id === community.id),
        members: membersData.get(community.id) || [],
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount.value / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        communities: communitiesWithTrending,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalCount.value,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  // Get Featured Communities
  static async getFeaturedCommunities({
    currentUserId,
    entityId,
    db,
    page = 1,
    limit = 10,
    searchTerm,
  }: {
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    page?: number;
    limit?: number;
    searchTerm?: string;
  }) {
    try {
      const entityDetails = await db.query.entity.findFirst({
        where: (tcg, { eq }) => eq(tcg.id, entityId),
      });

      const condition = await db.query.trendingConditionsGroups.findFirst({
        where: (tcg, { eq }) => eq(tcg.entity, entityId),
      });

      // Build dynamic where conditions
      const whereConditions = [
        eq(groups.entity, entityId),
        eq(groups.isApproved, true),
        eq(groups.isFeatured, true), // Only featured communities
      ];

      // Add search term condition
      if (searchTerm) {
        whereConditions.push(
          sql`(${groups.title} ILIKE ${`%${searchTerm}%`} OR ${
            groups.description
          } ILIKE ${`%${searchTerm}%`} OR ${
            groups.tagline
          } ILIKE ${`%${searchTerm}%`})`
        );
      }

      // Get total count for pagination
      const [totalCount] = await db
        .select({ value: count() })
        .from(groups)
        .where(and(...whereConditions));

      // Calculate offset
      const offset = (page - 1) * limit;

      const result = await db
        .select({
          id: groups.id,
          group: groups,
          role: sql<string>`(
            CASE 
              WHEN ${groupMember.role} IS NOT NULL THEN ${groupMember.role}
              ELSE 'NOT_MEMBER' 
            END
          )`.as("role"),
          isFeatured: groups.isFeatured,
          trendingScore: sql<number>`(${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0})`,
          rank: sql<number>`RANK() OVER (ORDER BY (${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0}) DESC)`,
          status: sql<string>`
            CASE
              WHEN ${groupRequest.userId} = ${currentUserId} AND ${groupRequest.groupId} = ${groups.id} AND ${groupRequest.memberStatusEnum} = 'PENDING' THEN 'REQUEST_SEND'
              WHEN ${groupMember.userId} = ${currentUserId} AND ${groupMember.groupId} = ${groups.id} THEN 'MEMBER'
              ELSE 'NO_MEMBER'
            END
          `.as("status"),
          isGroupMember: sql<boolean>`${groupMember.userId} IS NOT NULL`.as(
            "isGroupMember"
          ),
          isJoinRequest:
            sql<boolean>`${groupRequest.userId} IS NOT NULL AND ${groupRequest.memberStatusEnum} = 'PENDING'`.as(
              "isJoinRequest"
            ),
          isGroupAdmin: sql<boolean>`${groupMember.role} = 'ADMIN'`.as(
            "isGroupAdmin"
          ),
          isGroupManager:
            sql<boolean>`${groupMember.role} IN ('ADMIN', 'MANAGER')`.as(
              "isGroupManager"
            ),
          groupSettings: communitySettings,
          isWishlist: sql<boolean>`${communityWishlist.userId} IS NOT NULL`.as(
            "isWishlist"
          ),
          creator: {
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
          },
        })
        .from(groups)
        .where(and(...whereConditions))
        .orderBy(desc(groups.createdAt))
        .leftJoin(
          groupMember,
          and(
            eq(groupMember.groupId, groups.id),
            eq(groupMember.userId, currentUserId)
          )
        )
        .leftJoin(
          groupRequest,
          and(
            eq(groupRequest.groupId, groups.id),
            eq(groupRequest.userId, currentUserId)
          )
        )
        .leftJoin(
          communityWishlist,
          and(
            eq(communityWishlist.groupId, groups.id),
            eq(communityWishlist.userId, currentUserId)
          )
        )
        .leftJoin(user, eq(user.id, groups.creator))
        .leftJoin(communitySettings, eq(communitySettings.groupId, groups.id))
        .limit(limit)
        .offset(offset);

      // Get members for each community
      const communityIds = result.map((community) => community.id);
      const membersData = new Map();

      if (communityIds.length > 0) {
        const allMembers = await db.query.groupMember.findMany({
          where: (gm, { and, eq, inArray }) =>
            and(inArray(gm.groupId, communityIds)),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: (gm, { asc }) => [asc(gm.createdAt)],
        });

        allMembers.forEach((member) => {
          if (!membersData.has(member.groupId)) {
            membersData.set(member.groupId, []);
          }
          if (membersData.get(member.groupId).length < 10) {
            membersData.get(member.groupId).push({
              id: member.user.id,
              fullName: member.user.firstName + " " + member.user.lastName,
              avatar: member.user.avatar,
              role: member.role,
              joinedAt: member.createdAt,
            });
          }
        });
      }

      const communitiesWithMembers = result.map((community) => ({
        ...community,
        isTrending: false,
        members: membersData.get(community.id) || [],
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount.value / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        communities: communitiesWithMembers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalCount.value,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  // Get Trending Communities
  static async getTrendingCommunities({
    currentUserId,
    entityId,
    db,
    page = 1,
    limit = 10,
    searchTerm,
  }: {
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    page?: number;
    limit?: number;
    searchTerm?: string;
  }) {
    try {
      const entityDetails = await db.query.entity.findFirst({
        where: (tcg, { eq }) => eq(tcg.id, entityId),
      });

      const condition = await db.query.trendingConditionsGroups.findFirst({
        where: (tcg, { eq }) => eq(tcg.entity, entityId),
      });

      // Build dynamic where conditions
      const whereConditions = [
        eq(groups.entity, entityId),
        eq(groups.isApproved, true),
      ];

      // Add search term condition
      if (searchTerm) {
        whereConditions.push(
          sql`(${groups.title} ILIKE ${`%${searchTerm}%`} OR ${
            groups.description
          } ILIKE ${`%${searchTerm}%`} OR ${
            groups.tagline
          } ILIKE ${`%${searchTerm}%`})`
        );
      }

      const result = await db
        .select({
          id: groups.id,
          group: groups,
          role: sql<string>`(
            CASE 
              WHEN ${groupMember.role} IS NOT NULL THEN ${groupMember.role}
              ELSE 'NOT_MEMBER' 
            END
          )`.as("role"),
          isFeatured: groups.isFeatured,
          trendingScore: sql<number>`(${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0})`,
          rank: sql<number>`RANK() OVER (ORDER BY (${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0}) DESC)`,
          status: sql<string>`
            CASE
              WHEN ${groupRequest.userId} = ${currentUserId} AND ${groupRequest.groupId} = ${groups.id} AND ${groupRequest.memberStatusEnum} = 'PENDING' THEN 'REQUEST_SEND'
              WHEN ${groupMember.userId} = ${currentUserId} AND ${groupMember.groupId} = ${groups.id} THEN 'MEMBER'
              ELSE 'NO_MEMBER'
            END
          `.as("status"),
          isGroupMember: sql<boolean>`${groupMember.userId} IS NOT NULL`.as(
            "isGroupMember"
          ),
          isJoinRequest:
            sql<boolean>`${groupRequest.userId} IS NOT NULL AND ${groupRequest.memberStatusEnum} = 'PENDING'`.as(
              "isJoinRequest"
            ),
          isGroupAdmin: sql<boolean>`${groupMember.role} = 'ADMIN'`.as(
            "isGroupAdmin"
          ),
          isGroupManager:
            sql<boolean>`${groupMember.role} IN ('ADMIN', 'MANAGER')`.as(
              "isGroupManager"
            ),
          groupSettings: communitySettings,
          isWishlist: sql<boolean>`${communityWishlist.userId} IS NOT NULL`.as(
            "isWishlist"
          ),
          creator: {
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
          },
        })
        .from(groups)
        .where(and(...whereConditions))
        .orderBy(
          desc(
            sql`(${condition?.user ? groups.numberOfUser : 0} + ${
              condition?.likes ? groups.numberOfLikes : 0
            } + ${condition?.discussion ? groups.numberOfPost : 0} + ${
              condition?.views ? groups.numberOfViews : 0
            })`
          )
        )
        .leftJoin(
          groupMember,
          and(
            eq(groupMember.groupId, groups.id),
            eq(groupMember.userId, currentUserId)
          )
        )
        .leftJoin(
          groupRequest,
          and(
            eq(groupRequest.groupId, groups.id),
            eq(groupRequest.userId, currentUserId)
          )
        )
        .leftJoin(
          communityWishlist,
          and(
            eq(communityWishlist.groupId, groups.id),
            eq(communityWishlist.userId, currentUserId)
          )
        )
        .leftJoin(user, eq(user.id, groups.creator))
        .leftJoin(communitySettings, eq(communitySettings.groupId, groups.id));

      // Take only top trending communities based on condition length
      const trendingLength = condition?.length || 10;
      const topTrending = result.slice(0, trendingLength);

      // Apply pagination to the trending results
      const offset = (page - 1) * limit;
      const paginatedResults = topTrending.slice(offset, offset + limit);

      // Get members for each community
      const communityIds = paginatedResults.map((community) => community.id);
      const membersData = new Map();

      if (communityIds.length > 0) {
        const allMembers = await db.query.groupMember.findMany({
          where: (gm, { and, eq, inArray }) =>
            and(inArray(gm.groupId, communityIds)),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: (gm, { asc }) => [asc(gm.createdAt)],
        });

        allMembers.forEach((member) => {
          if (!membersData.has(member.groupId)) {
            membersData.set(member.groupId, []);
          }
          if (membersData.get(member.groupId).length < 10) {
            membersData.get(member.groupId).push({
              id: member.user.id,
              fullName: member.user.firstName + " " + member.user.lastName,
              avatar: member.user.avatar,
              role: member.role,
              joinedAt: member.createdAt,
            });
          }
        });
      }

      const communitiesWithMembers = paginatedResults.map((community) => ({
        ...community,
        isTrending: true,
        members: membersData.get(community.id) || [],
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(topTrending.length / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        communities: communitiesWithMembers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: topTrending.length,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  // Get Communities Joined by Current User
  static async getMyJoinedCommunities({
    currentUserId,
    entityId,
    db,
    page = 1,
    limit = 10,
    searchTerm,
  }: {
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    page?: number;
    limit?: number;
    searchTerm?: string;
  }) {
    try {
      const entityDetails = await db.query.entity.findFirst({
        where: (tcg, { eq }) => eq(tcg.id, entityId),
      });

      const condition = await db.query.trendingConditionsGroups.findFirst({
        where: (tcg, { eq }) => eq(tcg.entity, entityId),
      });

      // Build dynamic where conditions
      const whereConditions = [
        eq(groups.entity, entityId),
        eq(groups.isApproved, true),
        eq(groupMember.userId, currentUserId), // Only communities where user is a member
        eq(groupMember.memberStatusEnum, "ACCEPTED"),
      ];

      // Add search term condition
      if (searchTerm) {
        whereConditions.push(
          sql`(${groups.title} ILIKE ${`%${searchTerm}%`} OR ${
            groups.description
          } ILIKE ${`%${searchTerm}%`} OR ${
            groups.tagline
          } ILIKE ${`%${searchTerm}%`})`
        );
      }

      // Get total count for pagination
      const [totalCount] = await db
        .select({ value: count() })
        .from(groups)
        .innerJoin(groupMember, eq(groupMember.groupId, groups.id))
        .where(and(...whereConditions));

      // Calculate offset
      const offset = (page - 1) * limit;

      const result = await db
        .select({
          id: groups.id,
          group: groups,
          role: groupMember.role,
          isFeatured: groups.isFeatured,
          trendingScore: sql<number>`(${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0})`,
          rank: sql<number>`RANK() OVER (ORDER BY (${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0}) DESC)`,
          status: sql<string>`'MEMBER'`.as("status"),
          isGroupMember: sql<boolean>`true`.as("isGroupMember"),
          isJoinRequest: sql<boolean>`false`.as("isJoinRequest"),
          isGroupAdmin: sql<boolean>`${groupMember.role} = 'ADMIN'`.as(
            "isGroupAdmin"
          ),
          isGroupManager:
            sql<boolean>`${groupMember.role} IN ('ADMIN', 'MANAGER')`.as(
              "isGroupManager"
            ),
          groupSettings: communitySettings,
          isWishlist: sql<boolean>`${communityWishlist.userId} IS NOT NULL`.as(
            "isWishlist"
          ),
          creator: {
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
          },
          joinedAt: groupMember.createdAt,
        })
        .from(groups)
        .innerJoin(groupMember, eq(groupMember.groupId, groups.id))
        .where(and(...whereConditions))
        .orderBy(desc(groupMember.createdAt))
        .leftJoin(
          communityWishlist,
          and(
            eq(communityWishlist.groupId, groups.id),
            eq(communityWishlist.userId, currentUserId)
          )
        )
        .leftJoin(user, eq(user.id, groups.creator))
        .leftJoin(communitySettings, eq(communitySettings.groupId, groups.id))
        .limit(limit)
        .offset(offset);

      // Get members for each community
      const communityIds = result.map((community) => community.id);
      const membersData = new Map();

      if (communityIds.length > 0) {
        const allMembers = await db.query.groupMember.findMany({
          where: (gm, { and, eq, inArray }) =>
            and(inArray(gm.groupId, communityIds)),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: (gm, { asc }) => [asc(gm.createdAt)],
        });

        allMembers.forEach((member) => {
          if (!membersData.has(member.groupId)) {
            membersData.set(member.groupId, []);
          }
          if (membersData.get(member.groupId).length < 10) {
            membersData.get(member.groupId).push({
              id: member.user.id,
              fullName: member.user.firstName + " " + member.user.lastName,
              avatar: member.user.avatar,
              role: member.role,
              joinedAt: member.createdAt,
            });
          }
        });
      }

      const topValue = result
        .sort((a, b) => b.rank - a.rank)
        .slice(0, condition?.length);

      const communitiesWithTrending = result.map((community) => ({
        ...community,
        isTrending: topValue.some((t) => t.id === community.id),
        members: membersData.get(community.id) || [],
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount.value / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        communities: communitiesWithTrending,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalCount.value,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  // Get Saved Communities (Wishlist)
  static async getMySavedCommunities({
    currentUserId,
    entityId,
    db,
    page = 1,
    limit = 10,
    searchTerm,
  }: {
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    page?: number;
    limit?: number;
    searchTerm?: string;
  }) {
    try {
      const entityDetails = await db.query.entity.findFirst({
        where: (tcg, { eq }) => eq(tcg.id, entityId),
      });

      const condition = await db.query.trendingConditionsGroups.findFirst({
        where: (tcg, { eq }) => eq(tcg.entity, entityId),
      });

      // Build dynamic where conditions
      const whereConditions = [
        eq(groups.entity, entityId),
        eq(groups.isApproved, true),
        eq(communityWishlist.userId, currentUserId), // Only wishlisted communities
        eq(communityWishlist.entityId, entityId),
      ];

      // Add search term condition
      if (searchTerm) {
        whereConditions.push(
          sql`(${groups.title} ILIKE ${`%${searchTerm}%`} OR ${
            groups.description
          } ILIKE ${`%${searchTerm}%`} OR ${
            groups.tagline
          } ILIKE ${`%${searchTerm}%`})`
        );
      }

      // Get total count for pagination
      const [totalCount] = await db
        .select({ value: count() })
        .from(groups)
        .innerJoin(communityWishlist, eq(communityWishlist.groupId, groups.id))
        .where(and(...whereConditions));

      // Calculate offset
      const offset = (page - 1) * limit;

      const result = await db
        .select({
          id: groups.id,
          group: groups,
          role: sql<string>`(
            CASE 
              WHEN ${groupMember.role} IS NOT NULL THEN ${groupMember.role}
              ELSE 'NOT_MEMBER' 
            END
          )`.as("role"),
          isFeatured: groups.isFeatured,
          trendingScore: sql<number>`(${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0})`,
          rank: sql<number>`RANK() OVER (ORDER BY (${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0}) DESC)`,
          status: sql<string>`
            CASE
              WHEN ${groupRequest.userId} = ${currentUserId} AND ${groupRequest.groupId} = ${groups.id} AND ${groupRequest.memberStatusEnum} = 'PENDING' THEN 'REQUEST_SEND'
              WHEN ${groupMember.userId} = ${currentUserId} AND ${groupMember.groupId} = ${groups.id} THEN 'MEMBER'
              ELSE 'NO_MEMBER'
            END
          `.as("status"),
          isGroupMember: sql<boolean>`${groupMember.userId} IS NOT NULL`.as(
            "isGroupMember"
          ),
          isJoinRequest:
            sql<boolean>`${groupRequest.userId} IS NOT NULL AND ${groupRequest.memberStatusEnum} = 'PENDING'`.as(
              "isJoinRequest"
            ),
          isGroupAdmin: sql<boolean>`${groupMember.role} = 'ADMIN'`.as(
            "isGroupAdmin"
          ),
          isGroupManager:
            sql<boolean>`${groupMember.role} IN ('ADMIN', 'MANAGER')`.as(
              "isGroupManager"
            ),
          groupSettings: communitySettings,
          isWishlist: sql<boolean>`true`.as("isWishlist"),
          creator: {
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
          },
          savedAt: communityWishlist.createdAt,
        })
        .from(groups)
        .innerJoin(communityWishlist, eq(communityWishlist.groupId, groups.id))
        .where(and(...whereConditions))
        .orderBy(desc(communityWishlist.createdAt))
        .leftJoin(
          groupMember,
          and(
            eq(groupMember.groupId, groups.id),
            eq(groupMember.userId, currentUserId)
          )
        )
        .leftJoin(
          groupRequest,
          and(
            eq(groupRequest.groupId, groups.id),
            eq(groupRequest.userId, currentUserId)
          )
        )
        .leftJoin(user, eq(user.id, groups.creator))
        .leftJoin(communitySettings, eq(communitySettings.groupId, groups.id))
        .limit(limit)
        .offset(offset);

      // Get members for each community
      const communityIds = result.map((community) => community.id);
      const membersData = new Map();

      if (communityIds.length > 0) {
        const allMembers = await db.query.groupMember.findMany({
          where: (gm, { and, eq, inArray }) =>
            and(inArray(gm.groupId, communityIds)),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: (gm, { asc }) => [asc(gm.createdAt)],
        });

        allMembers.forEach((member) => {
          if (!membersData.has(member.groupId)) {
            membersData.set(member.groupId, []);
          }
          if (membersData.get(member.groupId).length < 10) {
            membersData.get(member.groupId).push({
              id: member.user.id,
              fullName: member.user.firstName + " " + member.user.lastName,
              avatar: member.user.avatar,
              role: member.role,
              joinedAt: member.createdAt,
            });
          }
        });
      }

      const topValue = result
        .sort((a, b) => b.rank - a.rank)
        .slice(0, condition?.length);

      const communitiesWithTrending = result.map((community) => ({
        ...community,
        isTrending: topValue.some((t) => t.id === community.id),
        members: membersData.get(community.id) || [],
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount.value / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        communities: communitiesWithTrending,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalCount.value,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  static async getCommunitiesByUserId({
    userId,
    entityId,
    db,
    page = 1,
    limit = 10,
    searchTerm,
  }: {
    userId: string;
    entityId: string;
    db: AppDatabase;
    page?: number;
    limit?: number;
    searchTerm?: string;
  }) {
    try {
      const entityDetails = await db.query.entity.findFirst({
        where: (tcg, { eq }) => eq(tcg.id, entityId),
      });

      const condition = await db.query.trendingConditionsGroups.findFirst({
        where: (tcg, { eq }) => eq(tcg.entity, entityId),
      });

      // Build dynamic where conditions
      const whereConditions = [
        eq(groups.entity, entityId),
        eq(groups.isApproved, true),
        eq(groups.creator, userId), // Filter by creator
      ];

      // Add search term condition
      if (searchTerm) {
        whereConditions.push(
          sql`(${groups.title} ILIKE ${`%${searchTerm}%`} OR ${
            groups.description
          } ILIKE ${`%${searchTerm}%`} OR ${
            groups.tagline
          } ILIKE ${`%${searchTerm}%`})`
        );
      }

      // Get total count for pagination
      const [totalCount] = await db
        .select({ value: count() })
        .from(groups)
        .where(and(...whereConditions));

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build order by clause
      let orderByClause = [desc(groups.createdAt)];

      const result = await db
        .select({
          id: groups.id,
          group: groups,
          role: sql<string>`'ADMIN'`.as("role"), // Owner is always ADMIN
          isFeatured: groups.isFeatured,
          trendingScore: sql<number>`(${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0})`,
          rank: sql<number>`RANK() OVER (ORDER BY (${
            condition?.user ? groups.numberOfUser : 0
          } + ${condition?.likes ? groups.numberOfLikes : 0} + ${
            condition?.discussion ? groups.numberOfPost : 0
          } + ${condition?.views ? groups.numberOfViews : 0}) DESC)`,
          status: sql<string>`'MEMBER'`.as("status"), // Owner is always a MEMBER
          isGroupMember: sql<boolean>`true`.as("isGroupMember"),
          isJoinRequest: sql<boolean>`false`.as("isJoinRequest"),
          isGroupAdmin: sql<boolean>`true`.as("isGroupAdmin"),
          isGroupManager: sql<boolean>`true`.as("isGroupManager"),
          groupSettings: communitySettings,
          isWishlist: sql<boolean>`${communityWishlist.userId} IS NOT NULL`.as(
            "isWishlist"
          ),
          creator: {
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
          },
        })
        .from(groups)
        .where(and(...whereConditions))
        .orderBy(...orderByClause)
        .leftJoin(
          communityWishlist,
          and(
            eq(communityWishlist.groupId, groups.id),
            eq(communityWishlist.userId, userId)
          )
        )
        .leftJoin(user, eq(user.id, groups.creator))
        .leftJoin(communitySettings, eq(communitySettings.groupId, groups.id))
        .limit(limit)
        .offset(offset);

      // Get members for each community
      const communityIds = result.map((community: any) => community.id);
      const membersData = new Map();

      if (communityIds.length > 0) {
        const allMembers = await db.query.groupMember.findMany({
          where: (gm, { and, eq, inArray }) =>
            and(inArray(gm.groupId, communityIds)),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: (gm, { asc }) => [asc(gm.createdAt)],
        });

        allMembers.forEach((member) => {
          if (!membersData.has(member.groupId)) {
            membersData.set(member.groupId, []);
          }
          if (membersData.get(member.groupId).length < 10) {
            membersData.get(member.groupId).push({
              id: member.user.id,
              fullName: member.user.firstName + " " + member.user.lastName,
              avatar: member.user.avatar,
              role: member.role,
              joinedAt: member.createdAt,
            });
          }
        });
      }

      const topValue = result
        .sort((a: any, b: any) => b.rank - a.rank)
        .slice(0, condition?.length);

      const communitiesWithTrending = result.map((community: any) => ({
        ...community,
        isTrending: topValue.some((t: any) => t.id === community.id),
        members: membersData.get(community.id) || [],
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount.value / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        communities: communitiesWithTrending,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalCount.value,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.log(error);

      throw error;
    }
  }
}
