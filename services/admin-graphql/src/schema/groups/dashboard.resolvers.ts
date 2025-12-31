import { and, eq, gte, lte, sql, count } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  groups,
  groupMember,
  communityFeed,
  groupViews,
} from "@thrico/database";

const dashboardResolvers = {
  Query: {
    async getCommunityStats(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const startDate = input?.startDate ? new Date(input.startDate) : null;
        const endDate = input?.endDate ? new Date(input.endDate) : new Date();

        // 1. Total Stats (All time for the entity)
        const totalCommunitiesResult = await db
          .select({ count: count() })
          .from(groups)
          .where(eq(groups.entity, entity));

        const totalMembersResult = await db
          .select({ count: count() })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(eq(groups.entity, entity));

        const totalPostsResult = await db
          .select({ count: count() })
          .from(communityFeed)
          .where(eq(communityFeed.entityId, entity));

        const totalViewsResult = await db
          .select({ count: count() })
          .from(groupViews)
          .innerJoin(groups, eq(groupViews.group, groups.id))
          .where(eq(groups.entity, entity));

        // 2. New Stats (Within date range)
        const dateFilters: any[] = [];
        if (startDate) dateFilters.push(gte(groups.createdAt, startDate));
        if (endDate) dateFilters.push(lte(groups.createdAt, endDate));

        const newCommunitiesResult = await db
          .select({ count: count() })
          .from(groups)
          .where(and(eq(groups.entity, entity), ...dateFilters));

        const memberDateFilters: any[] = [];
        if (startDate)
          memberDateFilters.push(gte(groupMember.createdAt, startDate));
        if (endDate)
          memberDateFilters.push(lte(groupMember.createdAt, endDate));

        const newMembersResult = await db
          .select({ count: count() })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(and(eq(groups.entity, entity), ...memberDateFilters));

        const postDateFilters: any[] = [];
        if (startDate)
          postDateFilters.push(gte(communityFeed.createdAt, startDate));
        if (endDate)
          postDateFilters.push(lte(communityFeed.createdAt, endDate));

        const newPostsResult = await db
          .select({ count: count() })
          .from(communityFeed)
          .where(and(eq(communityFeed.entityId, entity), ...postDateFilters));

        // 3. Status Breakdown
        const statusBreakdown = await db
          .select({
            status: groups.status,
            count: count(),
          })
          .from(groups)
          .where(eq(groups.entity, entity))
          .groupBy(groups.status);

        return {
          totalCommunities: totalCommunitiesResult[0]?.count || 0,
          totalMembers: totalMembersResult[0]?.count || 0,
          totalPosts: totalPostsResult[0]?.count || 0,
          totalViews: totalViewsResult[0]?.count || 0,
          newCommunities: newCommunitiesResult[0]?.count || 0,
          newMembers: newMembersResult[0]?.count || 0,
          newPosts: newPostsResult[0]?.count || 0,
          statusBreakdown: statusBreakdown.map((item: any) => ({
            status: item.status,
            count: item.count,
          })),
        };
      } catch (error) {
        console.error("Failed to fetch community stats:", error);
        throw error;
      }
    },
  },
};

export { dashboardResolvers };
