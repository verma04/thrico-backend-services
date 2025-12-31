import { GraphQLError } from "graphql";
import { eq, and, count, gte, lt } from "drizzle-orm";
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
  customFormSubmissions,
  customForms,
  offers,
} from "@thrico/database";
import { entityClient, subscriptionClient } from "@thrico/grpc";

const dashboardResolvers = {
  Query: {
    async getDashboardStats(
      _: any,
      { timeRange }: { timeRange: string },
      context: any
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
          startDate.setHours(now.getHours() - 24); // Default to 24h
      }

      const timeDiff = now.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - timeDiff);
      const previousEndDate = startDate;

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
            lt(userToEntity.createdAt, startDate)
          )
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
            gte(userToEntity.lastActive, startDate.toISOString())
          )
        );
      const activeUsers = activeUsersResult[0]?.count || 0;

      // 2b. Previous Active Users
      const prevActiveUsersResult = await db
        .select({ count: count() })
        .from(userToEntity)
        .where(
          and(
            eq(userToEntity.entityId, entityId),
            gte(userToEntity.lastActive, previousStartDate.toISOString()),
            lt(userToEntity.lastActive, previousEndDate.toISOString())
          )
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
          and(eq(groups.entity, entityId), gte(groupViews.createdAt, startDate))
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
            gte(groupViews.createdAt, previousStartDate),
            lt(groupViews.createdAt, previousEndDate)
          )
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

    async getModuleActivity(
      _: any,
      { timeRange }: { timeRange: string },
      context: any
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
          startDate.setHours(now.getHours() - 24);
      }

      // Check Subscription / Enabled Modules
      // We can use entityClient.getEntityDetails(entityId) to get enabled modules
      // Or check user.entity.settings?
      // Assuming entityClient returns subscription with modules list.

      let enabledModules: string[] = [];
      try {
        const subscription = await subscriptionClient.checkEntitySubscription(
          entityId
        );
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
              gte(groupMember.createdAt, startDate)
            )
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
              gte(eventsAttendees.createdAt, startDate)
            )
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
              gte(marketPlace.createdAt, startDate)
            )
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
            and(eq(jobs.entityId, entityId), gte(jobs.createdAt, startDate))
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
              gte(mentorShip.createdAt, startDate)
            )
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
              gte(pollResults.createdAt, startDate)
            )
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
              gte(discussionForum.createdAt, startDate)
            )
          );
        results.push({
          name: "Forums",
          userCount: forumUsers[0]?.count || 0,
        });
      }

      // 8. Surveys (Custom Forms)
      if (enabledModules.includes("Surveys")) {
        const surveyUsers = await db
          .select({ count: count(customFormSubmissions.id) })
          .from(customFormSubmissions)
          .innerJoin(
            customForms,
            eq(customFormSubmissions.formId, customForms.id)
          )
          .where(
            and(
              eq(customForms.entityId, entityId),
              gte(customFormSubmissions.createdAt, startDate)
            )
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
            and(eq(offers.entityId, entityId), gte(offers.createdAt, startDate))
          );
        results.push({
          name: "Offers",
          userCount: offerUsers[0]?.count || 0,
        });
      }

      return results;
    },
  },
  Mutation: {},
};

export { dashboardResolvers };
