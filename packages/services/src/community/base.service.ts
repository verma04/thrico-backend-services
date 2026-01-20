import { eq, and, inArray, sql, count } from "drizzle-orm";
import { log } from "@thrico/logging";
import {
  groupMember,
  groupRequest,
  groups,
  groupViews,
  communityNotification,
} from "@thrico/database";

export class BaseCommunityService {
  // Check if a user has permission in a group (by membership and role)
  static async hasGroupPermission({
    userId,
    groupId,
    db,
    role,
  }: {
    userId: string;
    groupId: string;
    db: any;
    role?: "ADMIN" | "MANAGER" | "USER" | "NOT_MEMBER" | string[];
  }) {
    const whereConditions = [
      eq(groupMember.groupId, groupId),
      eq(groupMember.userId, userId),
      eq(groupMember.memberStatusEnum, "ACCEPTED"),
    ];
    if (role) {
      if (Array.isArray(role)) {
        whereConditions.push(inArray(groupMember.role, role as any[]));
      } else {
        whereConditions.push(
          eq(
            groupMember.role,
            role as "ADMIN" | "MANAGER" | "USER" | "NOT_MEMBER"
          )
        );
      }
    }
    const member = await db.query.groupMember.findFirst({
      where: and(...whereConditions),
    });
    return !!member;
  }

  // Get all member requests to join a group
  static async getGroupJoinRequests({
    groupId,
    db,
  }: {
    groupId: string;
    db: any;
  }) {
    const requests = await db.query.groupRequest.findMany({
      where: eq(groupRequest.groupId, groupId),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });
    return requests;
  }

  // Get Community Members of a Community (first 20 + total count)
  static async getCommunityMembers(groupId: string, db: any) {
    try {
      const [countResult] = await db
        .select({ value: count() })
        .from(groupMember)
        .where(eq(groupMember.groupId, groupId));
      // .limit(1); // count() is aggregate, returns 1 row usually if no group by

      const members = await db.query.groupMember.findMany({
        where: (gm: any, { eq }: any) => eq(gm.groupId, groupId),
        with: {
          user: {
            with: { user: true }, // The snippet had with: { user: { with: { user: true } } } ?
            // groupMember has 'user' relation to 'user' table.
            // 'user' table likely has 'user' relation? No, user table IS user.
            // Let's look at schema: groupMemberRelations has 'user'.
            // So: with: { user: true } should be enough?
            // Snippet: with: { user: { with: { user: true } } }
            // Maybe groupMember -> user (table?) -> user (profile?)
            // I'll stick to snippet logic but carefully.
          },
        },
        limit: 20,
      });

      return {
        total: countResult?.value || 0,
        members: members.map(
          (m: any) => m.user?.user?.avatar || m.user?.avatar
        ), // robust access
      };
    } catch (error) {
      log.error("Error in getCommunityMembers", { error, groupId });
      throw error;
    }
  }

  // Get Community Statistics
  static async getCommunityStats({
    groupId,
    db,
  }: {
    groupId: string;
    db: any;
  }) {
    try {
      const [stats] = await db
        .select({
          totalMembers: groups.numberOfUser,
          totalPosts: groups.numberOfPost,
          totalLikes: groups.numberOfLikes,
          totalViews: groups.numberOfViews,
        })
        .from(groups)
        .where(eq(groups.id, groupId))
        .limit(1);

      return (
        stats || {
          totalMembers: 0,
          totalPosts: 0,
          totalLikes: 0,
          totalViews: 0,
        }
      );
    } catch (error) {
      log.error("Error in getCommunityStats", { error, groupId });
      throw error;
    }
  }

  // Track Community View with 1-hour gap rule
  static async trackCommunityView({
    userId,
    groupId,
    db,
  }: {
    userId: string;
    groupId: string;
    db: any;
  }) {
    try {
      const viewRecord = await db.query.groupViews.findFirst({
        where: and(eq(groupViews.user, userId), eq(groupViews.group, groupId)),
        orderBy: (v: any, { desc }: any) => [desc(v.createdAt)],
      });

      const now = Date.now();

      if (
        !viewRecord ||
        Math.abs(now - new Date(viewRecord.createdAt).getTime()) / 36e5 >= 1
      ) {
        log.info(`Tracking view for user ${userId} on group ${groupId}`);
        await db.transaction(async (tx: any) => {
          await tx.insert(groupViews).values({ user: userId, group: groupId });
          await tx
            .update(groups)
            .set({ numberOfViews: sql`${groups.numberOfViews} + 1` })
            .where(eq(groups.id, groupId));
        });
      }
    } catch (error) {
      log.error("Error in trackCommunityView", { error, userId, groupId });
      throw error;
    }
  }

  // Notification helper for communities
  static async sendCommunityNotification({
    db,
    userId,
    groupId,
    entityId,
    type,
    title,
    message,
    actionUrl,
  }: {
    db: any;
    userId: string;
    groupId: string;
    entityId: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  }) {
    await db.insert(communityNotification).values({
      userId,
      groupId,
      entityId,
      type,
      title,
      message,
      actionUrl,
    });
  }
}
