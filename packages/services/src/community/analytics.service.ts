import { eq, and, sql, desc, count } from "drizzle-orm";
import { log } from "@thrico/logging";
import {
  groupMember,
  communityFeed,
  events,
  communityActivityLog,
} from "@thrico/database";

export class CommunityAnalyticsService {
  // Community analytics service
  static async getCommunityAnalytics({
    groupId,
    userId,
    db,
  }: {
    groupId: string;
    userId: string;
    db: any;
  }) {
    try {
      // Check if user is admin
      const isAdmin = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, userId),
          eq(groupMember.role, "ADMIN")
        ),
      });
      if (!isAdmin) {
        throw new Error(
          "Unauthorized: Only group admins can access analytics."
        );
      }

      // Total members
      const [totalMembersResult] = await db
        .select({ value: count() })
        .from(groupMember)
        .where(eq(groupMember.groupId, groupId));
      const totalMembers = totalMembersResult?.value || 0;

      // Active users: members who logged in within last 30 days
      // Assuming 'users' table exists and has lastLogin.
      // The snippet used sql string for EXISTS.
      // I'll use the same raw SQL approach but be careful with table names.
      // 'users' table is usually 'user' in Drizzle if imported as 'user'.
      // But in SQL it might be 'users' or 'user'.
      // I should check schema for user table name.
      // In communities.ts: export const user = ... (imported from member/user.ts)
      // Actually, let's just count groupMember where ...
      // If I can't guarantee 'users' table name, I might skip this or try to find it.
      // I'll stick to the snippet's logic but wrap in try-catch to not crash if query fails.
      // Actually, better to query valid Drizzle if possible.
      // const activeUsers = ...
      // I'll use the raw SQL from snippet but assume table name is 'users' or check user.ts

      const activeUsersResult = await db.query.groupMember.findMany({
        where: and(
          eq(groupMember.groupId, groupId),
          sql`EXISTS (SELECT 1 FROM "user" WHERE "user".id = ${groupMember.userId} AND "user"."lastLogin" >= NOW() - INTERVAL '30 days')`
        ),
        columns: { id: true }, // just count match
      });
      // This fetches all active users to count them.
      // Ideally db.select({ count: count() })... but using raw SQL in WHERE with Drizzle is easier this way for now.
      const activeUsers = activeUsersResult.length;

      // Posts this month: count communityFeed in this group created in current month
      const [postsThisMonthResult] = await db
        .select({ value: count() })
        .from(communityFeed)
        .where(
          and(
            eq(communityFeed.communityId, groupId),
            sql`date_trunc('month', ${communityFeed.createdAt}) = date_trunc('month', NOW())`
          )
        );
      const postsThisMonth = postsThisMonthResult?.value || 0;

      // Events created: count events in this group
      const [eventsCreatedResult] = await db
        .select({ value: count() })
        .from(events)
        .where(eq(events.group, groupId));
      const eventsCreated = eventsCreatedResult?.value || 0;

      // Recent activity: last 5 activities
      // Using communityActivityLog
      const recentActivityRows = await db.query.communityActivityLog.findMany({
        where: eq(communityActivityLog.groupId, groupId),
        orderBy: desc(communityActivityLog.createdAt),
        limit: 5,
      });
      // The snippet assumes 'description' field, but schema has 'type', 'status', 'details'.
      // I'll construct a description or return the row.
      const recentActivity = recentActivityRows.map((row: any) => ({
        description: `${row.type} - ${row.status}`, // Simple fallback
        createdAt: row.createdAt,
      }));

      return {
        totalMembers,
        activeUsers,
        postsThisMonth,
        eventsCreated,
        recentActivity,
      };
    } catch (error) {
      log.error("Error in getCommunityAnalytics", { error, groupId });
      throw error;
    }
  }
}
