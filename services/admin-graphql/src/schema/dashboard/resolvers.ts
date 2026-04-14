import { GraphQLError } from "graphql";
import { eq, and, count, gte, lt, sql } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  groups,
  groupViews,
  userToEntity,
  groupMember,
  events,
  eventsAttendees,
  marketPlace,
  jobs,
  mentorShip,
  pollResults,
  polls,
  discussionForum,
  formResponses,
  customForms,
  offers,
  userFeed,
  contentReports,
  moderationLogs,
  userRiskProfiles,
} from "@thrico/database";
import { entityClient, subscriptionClient } from "@thrico/grpc";

export const getDaterangeFromInput = (
  timeRange?: string,
  dateRange?: { startDate: string; endDate: string },
) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = now;

  if (dateRange) {
    startDate = new Date(dateRange.startDate);
    endDate = new Date(dateRange.endDate);
  } else {
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
      case "THIS_MONTH":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "LAST_MONTH":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        startDate.setHours(now.getHours() - 24); // Default to 24h
    }
  }

  const timeDiff = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - timeDiff);
  const prevEndDate = startDate;

  return { startDate, endDate, prevStartDate, prevEndDate };
};

const dashboardResolvers = {
  Query: {
    async getDashboardStats(
      _: any,
      {
        timeRange,
        dateRange,
      }: {
        timeRange?: string;
        dateRange?: { startDate: string; endDate: string };
      },
      context: any,
    ) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: {
            code: "FORBIDDEN",
            http: { status: 403 },
          },
        });
      }

      const { startDate, endDate, prevStartDate, prevEndDate } =
        getDaterangeFromInput(timeRange, dateRange);

      // 1. Total Users
      const totalUsersResult = await db
        .select({ count: count() })
        .from(userToEntity)
        .where(eq(userToEntity.entityId, entityId));
      const totalUsers = totalUsersResult[0]?.count || 0;

      // 1b. Previous Total Users (Snapshot at start of period)
      const prevTotalUsersResult = await db
        .select({ count: count() })
        .from(userToEntity)
        .where(
          and(
            eq(userToEntity.entityId, entityId),
            lt(userToEntity.createdAt, startDate),
          ),
        );
      const prevTotalUsers = prevTotalUsersResult[0]?.count || 0;
      const totalUsersChange =
        prevTotalUsers > 0
          ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100
          : 0;

      // 2. Active Users
      const activeUsersResult = await db
        .select({ count: count() })
        .from(userToEntity)
        .where(
          and(
            eq(userToEntity.entityId, entityId),
            gte(userToEntity.lastActive, startDate.toISOString()),
            lt(userToEntity.lastActive, endDate.toISOString()),
          ),
        );
      const activeUsers = activeUsersResult[0]?.count || 0;

      // 2b. Previous Active Users
      const prevActiveUsersResult = await db
        .select({ count: count() })
        .from(userToEntity)
        .where(
          and(
            eq(userToEntity.entityId, entityId),
            gte(userToEntity.lastActive, prevStartDate.toISOString()),
            lt(userToEntity.lastActive, prevEndDate.toISOString()),
          ),
        );
      const prevActiveUsers = prevActiveUsersResult[0]?.count || 0;
      const activeUsersChange =
        prevActiveUsers > 0
          ? ((activeUsers - prevActiveUsers) / prevActiveUsers) * 100
          : 0;

      // 3. Page Views (Community Views)
      const pageViewsResult = await db
        .select({ count: count() })
        .from(groupViews)
        .innerJoin(groups, eq(groupViews.group, groups.id))
        .where(
          and(
            eq(groups.entity, entityId),
            gte(groupViews.createdAt, startDate),
            lt(groupViews.createdAt, endDate),
          ),
        );
      const pageViews = pageViewsResult[0]?.count || 0;

      // 3b. Previous Page Views
      const prevPageViewsResult = await db
        .select({ count: count() })
        .from(groupViews)
        .innerJoin(groups, eq(groupViews.group, groups.id))
        .where(
          and(
            eq(groups.entity, entityId),
            gte(groupViews.createdAt, prevStartDate),
            lt(groupViews.createdAt, prevEndDate),
          ),
        );
      const prevPageViews = prevPageViewsResult[0]?.count || 0;
      const pageViewsChange =
        prevPageViews > 0
          ? ((pageViews - prevPageViews) / prevPageViews) * 100
          : 0;

      // 4. Engagement Rate
      const engagementRate =
        totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      const prevEngagementRate =
        prevTotalUsers > 0 ? (prevActiveUsers / prevTotalUsers) * 100 : 0;

      const engagementRateChange =
        prevEngagementRate > 0
          ? ((engagementRate - prevEngagementRate) / prevEngagementRate) * 100
          : 0;

      return {
        totalUsers,
        activeUsers,
        pageViews,
        engagementRate: parseFloat(engagementRate.toFixed(1)),
        totalUsersChange: parseFloat(totalUsersChange.toFixed(1)),
        activeUsersChange: parseFloat(activeUsersChange.toFixed(1)),
        pageViewsChange: parseFloat(pageViewsChange.toFixed(1)),
        engagementRateChange: parseFloat(engagementRateChange.toFixed(1)),
      };
    },

    async getMembersStats(
      _: any,
      {
        timeRange,
        dateRange,
      }: {
        timeRange?: string;
        dateRange?: { startDate: string; endDate: string };
      },
      context: any,
    ) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: {
            code: "FORBIDDEN",
            http: { status: 403 },
          },
        });
      }

      const { startDate, endDate, prevStartDate, prevEndDate } =
        getDaterangeFromInput(timeRange, dateRange);

      const [
        totalMembersResult,
        prevTotalMembersResult,
        activeMembersResult,
        prevActiveMembersResult,
        newMembersResult,
        prevNewMembersResult,
      ] = await Promise.all([
        // Total Members
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(eq(userToEntity.entityId, entityId)),

        // Previous Total Members (at start of period)
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              lt(userToEntity.createdAt, startDate),
            ),
          ),

        // Active Members
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(userToEntity.lastActive, startDate.toISOString()),
              lt(userToEntity.lastActive, endDate.toISOString()),
            ),
          ),

        // Previous Active Members
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(userToEntity.lastActive, prevStartDate.toISOString()),
              lt(userToEntity.lastActive, prevEndDate.toISOString()),
            ),
          ),

        // New Members in Period
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(userToEntity.createdAt, startDate),
              lt(userToEntity.createdAt, endDate),
            ),
          ),

        // Previous New Members
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(userToEntity.createdAt, prevStartDate),
              lt(userToEntity.createdAt, prevEndDate),
            ),
          ),
      ]);

      const totalMembers = Number(totalMembersResult[0]?.count || 0);
      const prevTotalMembers = Number(prevTotalMembersResult[0]?.count || 0);
      const activeMembers = Number(activeMembersResult[0]?.count || 0);
      const prevActiveMembers = Number(prevActiveMembersResult[0]?.count || 0);
      const newMembers = Number(newMembersResult[0]?.count || 0);
      const prevNewMembers = Number(prevNewMembersResult[0]?.count || 0);

      const activeRate =
        totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;
      const prevActiveRate =
        prevTotalMembers > 0 ? (prevActiveMembers / prevTotalMembers) * 100 : 0;

      const calcChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
      };

      return {
        totalMembers,
        activeMembers,
        newMembersThisMonth: newMembers, // Using the current period's new members
        activeRate: parseFloat(activeRate.toFixed(1)),
        totalMembersChange: parseFloat(
          calcChange(totalMembers, prevTotalMembers).toFixed(1),
        ),
        activeMembersChange: parseFloat(
          calcChange(activeMembers, prevActiveMembers).toFixed(1),
        ),
        newMembersChange: parseFloat(
          calcChange(newMembers, prevNewMembers).toFixed(1),
        ),
        activeRateChange: parseFloat(
          calcChange(activeRate, prevActiveRate).toFixed(1),
        ),
      };
    },

    async getGrowthStats(
      _: any,
      {
        timeRange,
        dateRange,
        groupBy,
      }: {
        timeRange?: string;
        dateRange?: { startDate: string; endDate: string };
        groupBy?: string;
      },
      context: any,
    ) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: {
            code: "FORBIDDEN",
            http: { status: 403 },
          },
        });
      }

      const { startDate, endDate, prevStartDate, prevEndDate } =
        getDaterangeFromInput(timeRange, dateRange);

      let groupBySql = sql`DATE(${userToEntity.createdAt})`; // Default: DAY
      let selectSql = sql<string>`DATE(${userToEntity.createdAt})`;

      if (groupBy === "MONTH") {
        groupBySql = sql`DATE_TRUNC('month', ${userToEntity.createdAt})`;
        selectSql = sql<string>`TO_CHAR(DATE_TRUNC('month', ${userToEntity.createdAt}), 'YYYY-MM')`;
      } else if (groupBy === "WEEK") {
        groupBySql = sql`DATE_TRUNC('week', ${userToEntity.createdAt})`;
        selectSql = sql<string>`TO_CHAR(DATE_TRUNC('week', ${userToEntity.createdAt}), 'YYYY-WW')`;
      } else if (groupBy === "HOUR") {
        groupBySql = sql`DATE_TRUNC('hour', ${userToEntity.createdAt})`;
        selectSql = sql<string>`TO_CHAR(DATE_TRUNC('hour', ${userToEntity.createdAt}), 'YYYY-MM-DD HH24:00')`;
      }

      const growthDataEntries = await db
        .select({
          date: selectSql,
          count: count(),
        })
        .from(userToEntity)
        .where(
          and(
            eq(userToEntity.entityId, entityId),
            gte(userToEntity.createdAt, startDate),
            lt(userToEntity.createdAt, endDate),
          ),
        )
        .groupBy(groupBySql)
        .orderBy(groupBySql);

      // Calculate total new members and growth rate
      const totalNewMembers = growthDataEntries.reduce(
        (sum, entry) => sum + Number(entry.count),
        0,
      );

      const [prevNewMembersResult, totalMembersBeforeResult] =
        await Promise.all([
          db
            .select({ count: count() })
            .from(userToEntity)
            .where(
              and(
                eq(userToEntity.entityId, entityId),
                gte(userToEntity.createdAt, prevStartDate),
                lt(userToEntity.createdAt, prevEndDate),
              ),
            ),
          db
            .select({ count: count() })
            .from(userToEntity)
            .where(
              and(
                eq(userToEntity.entityId, entityId),
                lt(userToEntity.createdAt, startDate),
              ),
            ),
        ]);

      const prevNewMembers = Number(prevNewMembersResult[0]?.count || 0);
      const totalMembersBefore = Number(
        totalMembersBeforeResult[0]?.count || 0,
      );

      const growthRate =
        totalMembersBefore > 0
          ? (totalNewMembers / totalMembersBefore) * 100
          : 100;

      return {
        data: growthDataEntries.map((entry) => ({
          date: entry.date,
          count: Number(entry.count),
        })),
        totalNewMembers,
        growthRate: parseFloat(growthRate.toFixed(1)),
      };
    },

    async getModuleActivity(
      _: any,
      {
        timeRange,
        dateRange,
      }: {
        timeRange?: string;
        dateRange?: { startDate: string; endDate: string };
      },
      context: any,
    ) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: {
            code: "FORBIDDEN",
            http: { status: 403 },
          },
        });
      }

      const { startDate, endDate } = getDaterangeFromInput(
        timeRange,
        dateRange,
      );

      // Check Subscription / Enabled Modules
      // We can use entityClient.getEntityDetails(entityId) to get enabled modules
      // Or check user.entity.settings?
      // Assuming entityClient returns subscription with modules list.

      let enabledModules: string[] = [];
      try {
        const subscription =
          await subscriptionClient.checkEntitySubscription(entityId);
        // Assuming details has subscription info or we need to call subscriptionClient?
        // Let's use a safe fallback or fetch multiple if needed.
        // Based on entityResolvers, entityDetails does not return subscription directly usually?
        // But let's assume we can get module usage based on tables regardless of strict subscription check first,
        // or better, try to fetch subscription.
        // For now, let's query all relevant tables and return counts if > 0?
        // Or better, static list of supported modules for now.
        if (subscription && subscription.modules) {
          enabledModules = subscription.modules
            .filter((t: any) => t.enabled)
            .map((t: any) => t.name);
        }
      } catch (e) {
        console.error("Error fetching entity details", e);
      }

      const results = [];

      // 1. Communities
      if (enabledModules.includes("Communities")) {
        const communityUsers = await db
          .select({ count: count(groupMember.userId) })
          .from(groupMember)
          .innerJoin(groups, eq(groupMember.groupId, groups.id))
          .where(
            and(
              eq(groups.entity, entityId),
              gte(groupMember.createdAt, startDate),
              lt(groupMember.createdAt, endDate),
            ),
          );
        results.push({
          name: "Communities",
          userCount: communityUsers[0]?.count || 0,
        });
      }

      // 2. Events
      if (enabledModules.includes("Events")) {
        const eventUsers = await db
          .select({ count: count(eventsAttendees.user) })
          .from(eventsAttendees)
          .innerJoin(events, eq(eventsAttendees.eventId, events.id))
          .where(
            and(
              eq(events.entityId, entityId),
              gte(eventsAttendees.createdAt, startDate),
              lt(eventsAttendees.createdAt, endDate),
            ),
          );
        results.push({
          name: "Events",
          userCount: eventUsers[0]?.count || 0,
        });
      }

      // 3. Listing (Marketplace)
      if (enabledModules.includes("Listing")) {
        const listingUsers = await db
          .select({ count: count(marketPlace.id) })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.entityId, entityId),
              gte(marketPlace.createdAt, startDate),
              lt(marketPlace.createdAt, endDate),
            ),
          );
        results.push({
          name: "Listing",
          userCount: listingUsers[0]?.count || 0,
        });
      }

      // 4. Jobs
      if (enabledModules.includes("Jobs")) {
        const jobUsers = await db
          .select({ count: count(jobs.id) })
          .from(jobs)
          .where(
            and(
              eq(jobs.entityId, entityId),
              gte(jobs.createdAt, startDate),
              lt(jobs.createdAt, endDate),
            ),
          );
        results.push({
          name: "Jobs",
          userCount: jobUsers[0]?.count || 0,
        });
      }

      // 5. Mentorship
      if (enabledModules.includes("Mentorship")) {
        const mentorUsers = await db
          .select({ count: count(mentorShip.id) })
          .from(mentorShip)
          .where(
            and(
              eq(mentorShip.entity, entityId),
              gte(mentorShip.createdAt, startDate),
              lt(mentorShip.createdAt, endDate),
            ),
          );
        results.push({
          name: "Mentorship",
          userCount: mentorUsers[0]?.count || 0,
        });
      }

      // 6. Polls
      if (enabledModules.includes("Polls")) {
        const pollUsers = await db
          .select({ count: count(pollResults.id) })
          .from(pollResults)
          .innerJoin(polls, eq(pollResults.pollId, polls.id))
          .where(
            and(
              eq(polls.entityId, entityId),
              gte(pollResults.createdAt, startDate),
              lt(pollResults.createdAt, endDate),
            ),
          );
        results.push({
          name: "Polls",
          userCount: pollUsers[0]?.count || 0,
        });
      }

      // 7. Forums
      if (enabledModules.includes("Forums")) {
        const forumUsers = await db
          .select({ count: count(discussionForum.id) })
          .from(discussionForum)
          .where(
            and(
              eq(discussionForum.entityId, entityId),
              gte(discussionForum.createdAt, startDate),
              lt(discussionForum.createdAt, endDate),
            ),
          );
        results.push({
          name: "Forums",
          userCount: forumUsers[0]?.count || 0,
        });
      }

      // 8. Surveys (Custom Forms)
      if (enabledModules.includes("Surveys")) {
        const surveyUsers = await db
          .select({ count: count(formResponses.id) })
          .from(formResponses)
          .innerJoin(customForms, eq(formResponses.formId, customForms.id))
          .where(
            and(
              eq(customForms.entityId, entityId),
              gte(formResponses.submittedAt, startDate),
              lt(formResponses.submittedAt, endDate),
            ),
          );
        results.push({
          name: "Surveys",
          userCount: surveyUsers[0]?.count || 0,
        });
      }

      // 9. Offers
      if (enabledModules.includes("Offers")) {
        const offerUsers = await db
          .select({ count: count(offers.id) })
          .from(offers)
          .where(
            and(
              eq(offers.entityId, entityId),
              gte(offers.createdAt, startDate),
              lt(offers.createdAt, endDate),
            ),
          );
        results.push({
          name: "Offers",
          userCount: offerUsers[0]?.count || 0,
        });
      }

      return results;
    },

    async getPlatformModuleActivity(
      _: any,
      {
        timeRange,
        dateRange,
      }: {
        timeRange?: string;
        dateRange?: { startDate: string; endDate: string };
      },
      context: any,
    ) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: {
            code: "FORBIDDEN",
            http: { status: 403 },
          },
        });
      }

      const { startDate, endDate } = getDaterangeFromInput(
        timeRange,
        dateRange,
      );

      let enabledModules: string[] = [];
      try {
        const subscription =
          await subscriptionClient.checkEntitySubscription(entityId);
        if (subscription && subscription.modules) {
          enabledModules = subscription.modules
            .filter((t: any) => t.enabled)
            .map((t: any) => t.name);
        }
      } catch (e) {
        console.error("Error fetching entity details", e);
      }

      const results = [];

      // 1. Feed
      if (enabledModules.includes("Feed")) {
        const feedItems = await db
          .select({ count: count(userFeed.id) })
          .from(userFeed)
          .where(
            and(
              eq(userFeed.entity, entityId),
              gte(userFeed.createdAt, startDate),
              lt(userFeed.createdAt, endDate),
            ),
          );
        results.push({
          name: "Feed",
          itemCount: feedItems[0]?.count || 0,
        });
      }

      // 2. Communities
      if (enabledModules.includes("Communities")) {
        const communityItems = await db
          .select({ count: count(groups.id) })
          .from(groups)
          .where(
            and(
              eq(groups.entity, entityId),
              gte(groups.createdAt, startDate),
              lt(groups.createdAt, endDate),
            ),
          );
        results.push({
          name: "Communities",
          itemCount: communityItems[0]?.count || 0,
        });
      }

      // 3. Events
      if (enabledModules.includes("Events")) {
        const eventItems = await db
          .select({ count: count(events.id) })
          .from(events)
          .where(
            and(
              eq(events.entityId, entityId),
              gte(events.createdAt, startDate),
              lt(events.createdAt, endDate),
            ),
          );
        results.push({
          name: "Events",
          itemCount: eventItems[0]?.count || 0,
        });
      }

      // 4. Listing (Marketplace)
      if (enabledModules.includes("Listing")) {
        const listingItems = await db
          .select({ count: count(marketPlace.id) })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.entityId, entityId),
              gte(marketPlace.createdAt, startDate),
              lt(marketPlace.createdAt, endDate),
            ),
          );
        results.push({
          name: "Listing",
          itemCount: listingItems[0]?.count || 0,
        });
      }

      // 5. Jobs
      if (enabledModules.includes("Jobs")) {
        const jobItems = await db
          .select({ count: count(jobs.id) })
          .from(jobs)
          .where(
            and(
              eq(jobs.entityId, entityId),
              gte(jobs.createdAt, startDate),
              lt(jobs.createdAt, endDate),
            ),
          );
        results.push({
          name: "Jobs",
          itemCount: jobItems[0]?.count || 0,
        });
      }

      // 6. Mentorship
      if (enabledModules.includes("Mentorship")) {
        const mentorItems = await db
          .select({ count: count(mentorShip.id) })
          .from(mentorShip)
          .where(
            and(
              eq(mentorShip.entity, entityId),
              gte(mentorShip.createdAt, startDate),
            ),
          );
        results.push({
          name: "Mentorship",
          itemCount: mentorItems[0]?.count || 0,
        });
      }

      // 7. Polls
      if (enabledModules.includes("Polls")) {
        const pollItems = await db
          .select({ count: count(polls.id) })
          .from(polls)
          .where(
            and(
              eq(polls.entityId, entityId),
              gte(polls.createdAt, startDate),
              lt(polls.createdAt, endDate),
            ),
          );
        results.push({
          name: "Polls",
          itemCount: pollItems[0]?.count || 0,
        });
      }

      // 8. Forums
      if (enabledModules.includes("Forums")) {
        const forumItems = await db
          .select({ count: count(discussionForum.id) })
          .from(discussionForum)
          .where(
            and(
              eq(discussionForum.entityId, entityId),
              gte(discussionForum.createdAt, startDate),
              lt(discussionForum.createdAt, endDate),
            ),
          );
        results.push({
          name: "Forums",
          itemCount: forumItems[0]?.count || 0,
        });
      }

      // 9. Surveys (Custom Forms)
      if (enabledModules.includes("Surveys")) {
        const surveyItems = await db
          .select({ count: count(customForms.id) })
          .from(customForms)
          .where(
            and(
              eq(customForms.entityId, entityId),
              gte(customForms.createdAt, startDate),
              lt(customForms.createdAt, endDate),
            ),
          );
        results.push({
          name: "Surveys",
          itemCount: surveyItems[0]?.count || 0,
        });
      }

      // 10. Offers
      if (enabledModules.includes("Offers")) {
        const offerItems = await db
          .select({ count: count(offers.id) })
          .from(offers)
          .where(
            and(
              eq(offers.entityId, entityId),
              gte(offers.createdAt, startDate),
              lt(offers.createdAt, endDate),
            ),
          );
        results.push({
          name: "Offers",
          itemCount: offerItems[0]?.count || 0,
        });
      }

      // Calculate summary statistics
      const total = results.reduce(
        (sum, module) => sum + Number(module.itemCount),
        0,
      );
      const active = results.filter((module) => module.itemCount > 0).length;
      const inactive = enabledModules.length - active;

      return {
        total,
        active,
        inactive,
        modules: results,
      };
    },

    async getCommunityKPIs(
      _: any,
      {
        timeRange,
        dateRange,
      }: {
        timeRange?: string;
        dateRange?: { startDate: string; endDate: string };
      },
      context: any,
    ) {
      const { db, entityId } = await checkAuth(context);

      if (!entityId) {
        throw new GraphQLError("Permission Denied", {
          extensions: {
            code: "FORBIDDEN",
            http: { status: 403 },
          },
        });
      }

      const { startDate, endDate, prevStartDate, prevEndDate } =
        getDaterangeFromInput(timeRange, dateRange);

      // Parallel data fetching for efficiency
      const [
        totalUsersResult,
        prevTotalUsersResult,
        dauResult,
        prevDauResult,
        mauResult,
        prevMauResult,
        newMembersResult,
        prevNewMembersResult,
        feedBreakdownResult,
        moderationReports,
        moderationSpam,
        moderationAutoRemoved,
        activeGroups,
        activeEvents,
        activeJobs,
        activeListing,
      ] = await Promise.all([
        // Engagement metrics
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(eq(userToEntity.entityId, entityId)),
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              lt(userToEntity.createdAt, startDate),
            ),
          ),

        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(userToEntity.lastActive, startDate.toISOString()),
              lt(userToEntity.lastActive, endDate.toISOString()),
            ),
          ),
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(userToEntity.lastActive, prevStartDate.toISOString()),
              lt(userToEntity.lastActive, prevEndDate.toISOString()),
            ),
          ),

        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(
                userToEntity.lastActive,
                new Date(
                  new Date().setDate(new Date().getDate() - 30),
                ).toISOString(),
              ),
            ),
          ),
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(
                userToEntity.lastActive,
                new Date(
                  new Date().setDate(new Date().getDate() - 60),
                ).toISOString(),
              ),
              lt(
                userToEntity.lastActive,
                new Date(
                  new Date().setDate(new Date().getDate() - 30),
                ).toISOString(),
              ),
            ),
          ),

        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(userToEntity.createdAt, startDate),
              lt(userToEntity.createdAt, endDate),
            ),
          ),
        db
          .select({ count: count() })
          .from(userToEntity)
          .where(
            and(
              eq(userToEntity.entityId, entityId),
              gte(userToEntity.createdAt, prevStartDate),
              lt(userToEntity.createdAt, prevEndDate),
            ),
          ),

        // Content details
        db
          .select({ count: count(), type: userFeed.source })
          .from(userFeed)
          .where(
            and(
              eq(userFeed.entity, entityId),
              gte(userFeed.createdAt, startDate),
              lt(userFeed.createdAt, endDate),
            ),
          )
          .groupBy(userFeed.source),

        // Moderation
        db
          .select({ count: count() })
          .from(contentReports)
          .where(
            and(
              eq(contentReports.entityId, entityId),
              eq(contentReports.status, "PENDING"),
            ),
          ),
        db
          .select({ count: count() })
          .from(userRiskProfiles)
          .where(
            and(
              eq(userRiskProfiles.entityId, entityId),
              gte(userRiskProfiles.riskScore, "0.7"),
            ),
          ),
        db
          .select({ count: count() })
          .from(moderationLogs)
          .where(
            and(
              eq(moderationLogs.entityId, entityId),
              and(
                gte(moderationLogs.createdAt, startDate),
                lt(moderationLogs.createdAt, endDate),
                eq(moderationLogs.decision, "BLOCK"),
              ),
            ),
          ),

        // Modules
        db
          .select({ count: count() })
          .from(groups)
          .where(
            and(eq(groups.entity, entityId), eq(groups.status, "APPROVED")),
          ),
        db
          .select({ count: count() })
          .from(events)
          .where(
            and(
              eq(events.entityId, entityId),
              gte(events.startDate, startDate.toISOString()),
              lt(events.startDate, endDate.toISOString()),
            ),
          ),
        db
          .select({ count: count() })
          .from(jobs)
          .where(and(eq(jobs.entityId, entityId), eq(jobs.status, "APPROVED"))),
        db
          .select({ count: count() })
          .from(marketPlace)
          .where(
            and(
              eq(marketPlace.entityId, entityId),
              eq(marketPlace.status, "APPROVED"),
            ),
          ),
      ]);

      const totalUsers = Number(totalUsersResult[0]?.count || 0);
      const prevTotalUsers = Number(prevTotalUsersResult[0]?.count || 0);

      const dau = Number(dauResult[0]?.count || 0);
      const prevDau = Number(prevDauResult[0]?.count || 0);

      const mau = Number(mauResult[0]?.count || 0);
      const prevMau = Number(prevMauResult[0]?.count || 0);

      const newMembers = Number(newMembersResult[0]?.count || 0);
      const prevNewMembers = Number(prevNewMembersResult[0]?.count || 0);

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      // Helper for mock trends (simulating sparkline data)
      const mockTrend = (base: number) =>
        Array.from({ length: 7 }, () => base * (0.8 + Math.random() * 0.4));

      return {
        dailyActiveUsers: {
          value: dau,
          change: calcChange(dau, prevDau),
          trend: mockTrend(dau),
        },
        monthlyActiveUsers: {
          value: mau,
          change: calcChange(mau, prevMau),
          trend: mockTrend(mau),
        },
        engagementRate: {
          value: totalUsers > 0 ? (dau / totalUsers) * 100 : 0,
          change: 3.2, // mock comparison
          trend: mockTrend(35),
        },
        retentionRate: {
          value: 61.3, // Mocked for now - requires complex cohort analysis
          change: -1.1,
          trend: mockTrend(60),
        },
        newMembers: {
          value: newMembers,
          change: calcChange(newMembers, prevNewMembers),
          trend: mockTrend(newMembers),
        },
        churnRate: {
          value: 5.2, // Mocked
          change: 0.0,
          trend: mockTrend(5),
        },
        healthIndex: {
          value: 73, // Mocked
          change: 4.0,
          trend: mockTrend(70),
        },
        communityNPS: {
          value: 48, // Mocked
          change: 6.0,
          trend: mockTrend(45),
        },

        totalPosts: {
          value: feedBreakdownResult.reduce(
            (acc, curr) => acc + Number(curr.count),
            0,
          ),
          change: 18.0,
          trend: mockTrend(24000),
        },
        contributionFrequency: {
          value: 4.8,
          change: 0.6,
          trend: mockTrend(5),
        },
        interactionReciprocity: {
          value: 42,
          change: 5.0,
          trend: mockTrend(40),
        },
        contentReach: {
          value: 186000,
          change: 31.0,
          trend: mockTrend(180000),
        },

        contentTypeBreakdown: feedBreakdownResult.map((item) => ({
          type: item.type || "Other",
          count: Number(item.count),
          percentage:
            (Number(item.count) /
              feedBreakdownResult.reduce(
                (acc, curr) => acc + Number(curr.count),
                0,
              )) *
            100,
        })),

        moderationStats: [
          {
            type: "Reported content",
            count: Number(moderationReports[0]?.count || 0),
            status: "Urgent",
          },
          {
            type: "Spam accounts",
            count: Number(moderationSpam[0]?.count || 0),
            status: "Review",
          },
          {
            type: "Auto-removed",
            count: Number(moderationAutoRemoved[0]?.count || 0),
            status: "Done",
          },
          { type: "Appeals", count: 2, status: "Open" }, // Mocked
          { type: "False positives", count: 8, status: "Resolved" }, // Mocked
        ],

        modulePerformance: [
          {
            module: "Communities",
            value: activeGroups[0]?.count.toString() || "0",
            subtext: "active groups",
          },
          {
            module: "Events",
            value: activeEvents[0]?.count.toString() || "0",
            subtext: "incoming events",
          },
          {
            module: "Jobs",
            value: activeJobs[0]?.count.toString() || "0",
            subtext: "active listings",
          },
          {
            module: "Shop & Listings",
            value: activeListing[0]?.count.toString() || "0",
            subtext: "active products",
          },
        ],

        memberActivationRate: { value: 41, change: 4.0, trend: mockTrend(40) },
        communityAdvocacyIndex: {
          value: 3.2,
          change: 0.4,
          trend: mockTrend(3),
        },
        superfanRatio: { value: 8.4, change: 1.2, trend: mockTrend(8) },
      };
    },
  },
  Mutation: {},
};

export { dashboardResolvers };
