import { and, eq, gte, lte, lt, sql, count, desc } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  groups,
  groupMember,
  communityFeed,
  groupViews,
  user,
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
    async getCommunitiesStats(
      _: any,
      { timeRange }: { timeRange: string },
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);

        const now = new Date();
        let startDate = new Date();

        switch (timeRange) {
          case "LAST_24_HOURS":
            startDate.setHours(now.getHours() - 24);
            break;
          case "LAST_7_DAYS":
            startDate.setDate(now.getDate() - 7);
            break;
          case "LAST_30_DAYS":
            startDate.setDate(now.getDate() - 30);
            break;
          case "LAST_90_DAYS":
            startDate.setDate(now.getDate() - 90);
            break;
          default:
            startDate.setDate(now.getDate() - 30);
        }

        const timeDiff = now.getTime() - startDate.getTime();
        const previousStartDate = new Date(startDate.getTime() - timeDiff);
        const previousEndDate = startDate;

        // 1. Total Communities
        const totalCommunitiesResult = await db
          .select({ count: count() })
          .from(groups)
          .where(eq(groups.entity, entity));
        const totalCommunities = Number(totalCommunitiesResult[0]?.count || 0);

        const prevTotalCommunitiesResult = await db
          .select({ count: count() })
          .from(groups)
          .where(
            and(eq(groups.entity, entity), lt(groups.createdAt, startDate)),
          );
        const prevTotalCommunities = Number(
          prevTotalCommunitiesResult[0]?.count || 0,
        );
        const totalCommunitiesChange =
          prevTotalCommunities > 0
            ? ((totalCommunities - prevTotalCommunities) /
                prevTotalCommunities) *
              100
            : 0;

        // 2. Active Communities (Status = APPROVED)
        const activeCommunitiesResult = await db
          .select({ count: count() })
          .from(groups)
          .where(and(eq(groups.entity, entity), eq(groups.status, "APPROVED")));
        const activeCommunities = Number(
          activeCommunitiesResult[0]?.count || 0,
        );

        const prevActiveCommunitiesResult = await db
          .select({ count: count() })
          .from(groups)
          .where(
            and(
              eq(groups.entity, entity),
              eq(groups.status, "APPROVED"),
              lt(groups.createdAt, startDate),
            ),
          );
        const prevActiveCommunities = Number(
          prevActiveCommunitiesResult[0]?.count || 0,
        );
        const activeCommunitiesChange =
          prevActiveCommunities > 0
            ? ((activeCommunities - prevActiveCommunities) /
                prevActiveCommunities) *
              100
            : 0;

        // 3. Total Enrollments (Group Members)
        const totalEnrollmentsResult = await db
          .select({ count: count() })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(eq(groups.entity, entity));
        const totalEnrollments = Number(totalEnrollmentsResult[0]?.count || 0);

        const currEnrollmentsResult = await db
          .select({ count: count() })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(eq(groups.entity, entity), gte(groupMember.createdAt, startDate)),
          );
        const currentEnrollments = Number(currEnrollmentsResult[0]?.count || 0);

        const prevEnrollmentsResult = await db
          .select({ count: count() })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupMember.createdAt, previousStartDate),
              lt(groupMember.createdAt, previousEndDate),
            ),
          );
        const prevEnrollments = Number(prevEnrollmentsResult[0]?.count || 0);
        const enrollmentsChange =
          prevEnrollments > 0
            ? ((currentEnrollments - prevEnrollments) / prevEnrollments) * 100
            : 0;

        // 4. Total Views
        const totalViewsResult = await db
          .select({ count: count() })
          .from(groupViews)
          .innerJoin(groups, eq(groupViews.group, groups.id))
          .where(eq(groups.entity, entity));
        const totalViews = Number(totalViewsResult[0]?.count || 0);

        const currViewsResult = await db
          .select({ count: count() })
          .from(groupViews)
          .innerJoin(groups, eq(groupViews.group, groups.id))
          .where(
            and(eq(groups.entity, entity), gte(groupViews.createdAt, startDate)),
          );
        const currentViews = Number(currViewsResult[0]?.count || 0);

        const prevViewsResult = await db
          .select({ count: count() })
          .from(groupViews)
          .innerJoin(groups, eq(groupViews.group, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupViews.createdAt, previousStartDate),
              lt(groupViews.createdAt, previousEndDate),
            ),
          );
        const prevViews = Number(prevViewsResult[0]?.count || 0);
        const viewsChange =
          prevViews > 0 ? ((currentViews - prevViews) / prevViews) * 100 : 0;

        // 5. Enrollment Trend
        let groupingInterval = "day";
        if (timeRange === "LAST_90_DAYS") groupingInterval = "week";

        const enrollmentTrendResult = await db
          .select({
            label: sql`to_char(date_trunc(${groupingInterval}, ${groupMember.createdAt}), 'YYYY-MM-DD')`.as("label"),
            count: count(),
          })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(eq(groups.entity, entity), gte(groupMember.createdAt, startDate)),
          )
          .groupBy(sql`date_trunc(${groupingInterval}, ${groupMember.createdAt})`)
          .orderBy(sql`date_trunc(${groupingInterval}, ${groupMember.createdAt})`);

        const enrollmentTrend = enrollmentTrendResult.map((row: any) => ({
          label: String(row.label),
          count: Number(row.count),
        }));

        // 6. Status Distribution
        const statusDistributionResult = await db
          .select({
            name: groups.status,
            value: count(),
          })
          .from(groups)
          .where(eq(groups.entity, entity))
          .groupBy(groups.status);

        const statusDistribution = statusDistributionResult.map((row: any) => ({
          name: String(row.name),
          value: Number(row.value),
        }));

        // 7. Top Communities
        const topCommunitiesResult = await db
          .select({
            name: groups.title,
            members: groups.numberOfUser,
            posts: groups.numberOfPost,
            views: groups.numberOfViews,
          })
          .from(groups)
          .where(and(eq(groups.entity, entity), eq(groups.status, "APPROVED")))
          .orderBy(desc(groups.numberOfUser))
          .limit(5);

        const topCommunities = topCommunitiesResult.map((row: any) => ({
          name: row.name || "Untitled Community",
          members: Number(row.members || 0),
          posts: Number(row.posts || 0),
          views: Number(row.views || 0),
        }));

        // 8. Top Creators
        const topCreatorsResult = await db
          .select({
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            communitiesCreated: count(groups.id),
          })
          .from(groups)
          .innerJoin(user, eq(groups.creator, user.id))
          .where(eq(groups.entity, entity))
          .groupBy(user.id, user.firstName, user.lastName, user.avatar)
          .orderBy(desc(count(groups.id)))
          .limit(5);

        const topCreators = topCreatorsResult.map((row: any) => ({
          name: `${row.firstName} ${row.lastName}`.trim() || "Unknown User",
          avatar: row.avatar,
          communitiesCreated: Number(row.communitiesCreated),
        }));

        return {
          totalCommunities,
          activeCommunities,
          totalEnrollments,
          totalViews,
          totalCommunitiesChange: parseFloat(totalCommunitiesChange.toFixed(2)),
          activeCommunitiesChange: parseFloat(
            activeCommunitiesChange.toFixed(2),
          ),
          enrollmentsChange: parseFloat(enrollmentsChange.toFixed(2)),
          viewsChange: parseFloat(viewsChange.toFixed(2)),
          enrollmentTrend,
          statusDistribution,
          topCommunities,
          topCreators,
        };
      } catch (error) {
        console.error("Failed to fetch community statistics:", error);
        throw error;
      }
    },
  },
};

export { dashboardResolvers };
