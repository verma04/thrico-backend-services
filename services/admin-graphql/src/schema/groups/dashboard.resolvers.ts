import { and, eq, gte, lte, lt, sql, count, desc } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  groups,
  groupMember,
  communityFeed,
  groupViews,
  user,
} from "@thrico/database";
import { getDaterangeFromInput } from "../dashboard/resolvers";

const dashboardResolvers = {
  Query: {
    async getCommunityStats(
      _: any,
      {
        timeRange,
        dateRange,
      }: { timeRange?: string; dateRange?: { startDate: string; endDate: string } },
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);
        const { startDate, endDate } = getDaterangeFromInput(timeRange, dateRange);

        // 1. All-time Filters
        const totalFilters = and(eq(groups.entity, entity), lt(groups.createdAt, endDate));

        // 2. Date Range Filters
        const dateFilters = [
          eq(groups.entity, entity),
          gte(groups.createdAt, startDate),
          lt(groups.createdAt, endDate),
        ];

        const memberDateFilters = [
          eq(groups.entity, entity),
          gte(groupMember.createdAt, startDate),
          lt(groupMember.createdAt, endDate),
        ];

        const postDateFilters = [
          eq(communityFeed.entityId, entity),
          gte(communityFeed.createdAt, startDate),
          lt(communityFeed.createdAt, endDate),
        ];

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
            .where(
              and(eq(communityFeed.entityId, entity), lt(communityFeed.createdAt, endDate)),
            ),
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

    async getCommunitySignupTrend(
      _: any,
      {
        timeRange,
        dateRange,
      }: { timeRange?: string; dateRange?: { startDate: string; endDate: string } },
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);
        const { startDate, endDate } = getDaterangeFromInput(timeRange, dateRange);

        const dateExpr = sql`DATE(${groupMember.createdAt})`;
        const results = await db
          .select({
            date: dateExpr.as("date"),
            signups: count(groupMember.id).as("signups"),
          })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupMember.createdAt, startDate),
              lt(groupMember.createdAt, endDate),
            ),
          )
          .groupBy(dateExpr)
          .orderBy(dateExpr);

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

    async getTopActiveCommunities(
      _: any,
      {
        limit = 5,
        timeRange,
        dateRange,
      }: {
        limit?: number;
        timeRange?: string;
        dateRange?: { startDate: string; endDate: string };
      },
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);
        const { endDate } = getDaterangeFromInput(timeRange, dateRange);

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
          .where(and(eq(groups.entity, entity), lt(groups.createdAt, endDate)))
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

    async getCommunityActivityTrend(
      _: any,
      {
        timeRange,
        dateRange,
      }: { timeRange?: string; dateRange?: { startDate: string; endDate: string } },
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);
        const { startDate, endDate } = getDaterangeFromInput(timeRange, dateRange);

        const dateExpr = sql`DATE(${communityFeed.createdAt})`;
        const results = await db
          .select({
            date: dateExpr.as("date"),
            registered: count(communityFeed.id).as("registered"), // "registered" maps to Posts in our bar chart
          })
          .from(communityFeed)
          .where(
            and(
              eq(communityFeed.entityId, entity),
              gte(communityFeed.createdAt, startDate),
              lt(communityFeed.createdAt, endDate),
            ),
          )
          .groupBy(dateExpr)
          .orderBy(dateExpr);

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
      {
        timeRange,
        dateRange,
      }: { timeRange?: string; dateRange?: { startDate: string; endDate: string } },
      context: any,
    ) {
      try {
        const { entity, db } = await checkAuth(context);

        const { startDate, endDate, prevStartDate, prevEndDate } =
          getDaterangeFromInput(timeRange, dateRange);

        // 1. Total Communities
        const totalCommunitiesResult = await db
          .select({ count: count() })
          .from(groups)
          .where(and(eq(groups.entity, entity), lt(groups.createdAt, endDate)));
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
          .where(
            and(
              eq(groups.entity, entity),
              eq(groups.status, "APPROVED"),
              lt(groups.createdAt, endDate),
            ),
          );
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
          .where(and(eq(groups.entity, entity), lt(groupMember.createdAt, endDate)));
        const totalEnrollments = Number(totalEnrollmentsResult[0]?.count || 0);

        const currEnrollmentsResult = await db
          .select({ count: count() })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupMember.createdAt, startDate),
              lt(groupMember.createdAt, endDate),
            ),
          );
        const currentEnrollments = Number(currEnrollmentsResult[0]?.count || 0);

        const prevEnrollmentsResult = await db
          .select({ count: count() })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupMember.createdAt, prevStartDate),
              lt(groupMember.createdAt, prevEndDate),
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
          .where(and(eq(groups.entity, entity), lt(groupViews.createdAt, endDate)));
        const totalViews = Number(totalViewsResult[0]?.count || 0);

        const currentViews = await db
          .select({ count: count() })
          .from(groupViews)
          .innerJoin(groups, eq(groupViews.group, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupViews.createdAt, startDate),
              lt(groupViews.createdAt, endDate),
            ),
          );
        const currentViewsCount = Number(currentViews[0]?.count || 0);

        const prevViewsResult = await db
          .select({ count: count() })
          .from(groupViews)
          .innerJoin(groups, eq(groupViews.group, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupViews.createdAt, prevStartDate),
              lt(groupViews.createdAt, prevEndDate),
            ),
          );
        const prevViews = Number(prevViewsResult[0]?.count || 0);
        const viewsChange =
          prevViews > 0 ? ((currentViewsCount - prevViews) / prevViews) * 100 : 0;

        // 5. Enrollment Trend
        let groupingInterval = "day";
        if (timeRange === "LAST_90_DAYS") groupingInterval = "week";

        const truncatedDate = sql`date_trunc(${sql.raw(`'${groupingInterval}'`)}, ${groupMember.createdAt})`;

        const enrollmentTrendResult = await db
          .select({
            label: sql`to_char(${truncatedDate}, 'YYYY-MM-DD')`.as("label"),
            count: count(),
          })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(
              eq(groups.entity, entity),
              gte(groupMember.createdAt, startDate),
              lt(groupMember.createdAt, endDate),
            ),
          )
          .groupBy(truncatedDate)
          .orderBy(truncatedDate);

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
          .where(and(eq(groups.entity, entity), lt(groups.createdAt, endDate)))
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
          .where(
            and(
              eq(groups.entity, entity),
              eq(groups.status, "APPROVED"),
              lt(groups.createdAt, endDate),
            ),
          )
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
          .where(and(eq(groups.entity, entity), lt(groups.createdAt, endDate)))
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
