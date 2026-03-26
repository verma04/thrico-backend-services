import { and, eq, gte, lte, sql, count, desc } from "drizzle-orm";
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

        // 1. All-time Filters
        const totalFilters = eq(groups.entity, entity);

        // 2. Date Range Filters
        const dateFilters: any[] = [eq(groups.entity, entity)];
        if (startDate) dateFilters.push(gte(groups.createdAt, startDate));
        if (endDate) dateFilters.push(lte(groups.createdAt, endDate));

        const memberDateFilters: any[] = [eq(groups.entity, entity)];
        if (startDate)
          memberDateFilters.push(gte(groupMember.createdAt, startDate));
        if (endDate)
          memberDateFilters.push(lte(groupMember.createdAt, endDate));

        const postDateFilters: any[] = [eq(communityFeed.entityId, entity)];
        if (startDate)
          postDateFilters.push(gte(communityFeed.createdAt, startDate));
        if (endDate)
          postDateFilters.push(lte(communityFeed.createdAt, endDate));

        // 3. Parallel Queries
        const [
          totalCommunitiesResult,
          totalMembersResult,
          totalPostsResult,
          totalViewsResult,
          newCommunitiesResult,
          newMembersResult,
          newPostsResult,
          statusBreakdown,
        ] = await Promise.all([
          // Total Stats
          db.select({ count: count() }).from(groups).where(totalFilters),
          db
            .select({ count: count() })
            .from(groupMember)
            .innerJoin(groups, eq(groupMember.groupId, groups.id))
            .where(totalFilters),
          db
            .select({ count: count() })
            .from(communityFeed)
            .where(eq(communityFeed.entityId, entity)),
          db
            .select({ count: count() })
            .from(groupViews)
            .innerJoin(groups, eq(groupViews.group, groups.id))
            .where(totalFilters),
          // New Stats
          db
            .select({ count: count() })
            .from(groups)
            .where(and(...dateFilters)),
          db
            .select({ count: count() })
            .from(groupMember)
            .innerJoin(groups, eq(groupMember.groupId, groups.id))
            .where(and(...memberDateFilters)),
          db
            .select({ count: count() })
            .from(communityFeed)
            .where(and(...postDateFilters)),
          // Breakdown
          db
            .select({
              status: groups.status,
              count: count(),
            })
            .from(groups)
            .where(totalFilters)
            .groupBy(groups.status),
        ]);

        return {
          totalCommunities: Number(totalCommunitiesResult[0]?.count || 0),
          totalMembers: Number(totalMembersResult[0]?.count || 0),
          totalPosts: Number(totalPostsResult[0]?.count || 0),
          totalViews: Number(totalViewsResult[0]?.count || 0),
          newCommunities: Number(newCommunitiesResult[0]?.count || 0),
          newMembers: Number(newMembersResult[0]?.count || 0),
          newPosts: Number(newPostsResult[0]?.count || 0),
          statusBreakdown: statusBreakdown.map((item: any) => ({
            status: item.status,
            count: Number(item.count || 0),
          })),
        };
      } catch (error) {
        console.error("Failed to fetch community stats:", error);
        throw error;
      }
    },

    async getCommunitySignupTrend(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const startDate = input?.startDate
          ? new Date(input.startDate)
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const results = await db
          .select({
            date: sql`DATE(${groupMember.createdAt})`.as("date"),
            signups: count(groupMember.id).as("signups"),
          })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupMember.createdAt, startDate),
            ),
          )
          .groupBy(sql`DATE(${groupMember.createdAt})`)
          .orderBy(sql`DATE(${groupMember.createdAt})`);

        return results.map((r: any) => ({
          name: new Date(r.date as string).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          signups: Number(r.signups),
          views: 0, // Placeholder as required by type
        }));
      } catch (error) {
        console.error("error getCommunitySignupTrend: ", error);
        throw error;
      }
    },

    async getTopActiveCommunities(_: any, { limit = 5 }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const results = await db
          .select({
            id: groups.id,
            name: groups.title,
            slug: groups.slug,
            status: groups.status,
            avatar: groups.cover,
            members: count(groupMember.id).as("members"),
          })
          .from(groups)
          .leftJoin(groupMember, eq(groups.id, groupMember.groupId))
          .where(eq(groups.entity, entity))
          .groupBy(groups.id)
          .orderBy(desc(sql`members`))
          .limit(limit);

        return results.map((r: any) => ({
          ...r,
          views: 0, // Placeholder
          lastActivity: "Recent", // Placeholder
        }));
      } catch (error) {
        console.error("error getTopActiveCommunities: ", error);
        throw error;
      }
    },

    async getCommunityActivityTrend(_: any, __: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const results = await db
          .select({
            date: sql`DATE(${communityFeed.createdAt})`.as("date"),
            registered: count(communityFeed.id).as("registered"), // "registered" maps to Posts in our bar chart
          })
          .from(communityFeed)
          .where(
            and(
              eq(communityFeed.entityId, entity),
              gte(communityFeed.createdAt, sevenDaysAgo),
            ),
          )
          .groupBy(sql`DATE(${communityFeed.createdAt})`)
          .orderBy(sql`DATE(${communityFeed.createdAt})`);

        return results.map((r: any) => ({
          name: new Date(r.date as string).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          registered: Number(r.registered),
          checkedIn: 0, // Placeholder for second bar
        }));
      } catch (error) {
        console.error("error getCommunityActivityTrend: ", error);
        throw error;
      }
    },
  },
};

export { dashboardResolvers };
