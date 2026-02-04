import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { eq, and, sql, desc, count, inArray, asc } from "drizzle-orm";
import {
  AppDatabase,
  communityActivityLog,
  communityFeed,
  communityFeedInteraction,
  communityFeedReport,
  communityLogs,
  groupMember,
  groupRequest,
  groups,
  user,
  userFeed,
} from "@thrico/database";
import { CommunityActionsService } from "./actions.service";
import { BaseCommunityService } from "./base.service";
interface CommunityMemberStats {
  totalPosts: number;
  approvedPosts: number;
  pendingPosts: number;
  rejectedPosts: number;
  pinnedPosts: number;
  reportedPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  joinedAt: Date;
  lastActive: Date | null;
  membershipDuration: number; // in days
  rank: number; // based on activity
  badges: string[];
  postsByType: Record<string, number>;
  engagementScore: number;
}
export class CommunityMemberService {
  static async getCommunityMembersWithRoles({
    groupId,
    currentUserId,
    entityId,
    db,
    page = 1,
    limit = 20,
    role,
    searchTerm,
    sortBy = "newest",
  }: {
    groupId: string;
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    page?: number;
    limit?: number;
    role?: "ADMIN" | "MANAGER" | "MODERATOR" | "USER";
    searchTerm?: string;
    sortBy?: "newest" | "oldest" | "alphabetical" | "role";
  }) {
    try {
      if (!groupId || !currentUserId || !entityId) {
        throw new GraphQLError(
          "Group ID, User ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Getting community members with roles", {
        groupId,
        currentUserId,
        page,
        limit,
        role,
      });

      const community = await db.query.groups.findFirst({
        where: and(eq(groups.id, groupId), eq(groups.entity, entityId)),
      });

      if (!community) {
        throw new GraphQLError("Community not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const currentUserMembership = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, currentUserId),
          eq(groupMember.memberStatusEnum, "ACCEPTED"),
        ),
      });

      if (!currentUserMembership) {
        throw new GraphQLError("Only community members can view member list", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const isCurrentUserAdmin = ["ADMIN", "MANAGER"].includes(
        currentUserMembership.role ?? "",
      );

      const whereConditions = [
        eq(groupMember.groupId, groupId),
        eq(groupMember.memberStatusEnum, "ACCEPTED"),
      ];

      if (role) {
        if (["ADMIN", "MANAGER", "USER", "NOT_MEMBER"].includes(role)) {
          whereConditions.push(eq(groupMember.role, role as any));
        }
      }

      const [totalCount] = await db
        .select({ value: count() })
        .from(groupMember)
        .where(and(...whereConditions));

      let searchConditions = [...whereConditions];

      if (searchTerm) {
        searchConditions.push(
          sql`(${user.firstName} ILIKE ${`%${searchTerm}%`} OR ${
            user.lastName
          } ILIKE ${`%${searchTerm}%`})`,
        );
      }

      const offset = (page - 1) * limit;

      const members = await db
        .select({
          id: groupMember.id,
          userId: groupMember.userId,
          role: groupMember.role,
          joinedAt: groupMember.createdAt,
          user: {
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
          },
          isCurrentUser: sql<boolean>`${groupMember.userId} = ${currentUserId}`,
          canEdit: sql<boolean>`${
            isCurrentUserAdmin ||
            (currentUserMembership.role === "MANAGER" &&
              sql`${groupMember.role} NOT IN ('ADMIN')`) ||
            (currentUserMembership.role === "MODERATOR" &&
              sql`${groupMember.role} = 'USER'`)
          }`,
          canRemove: sql<boolean>`${
            isCurrentUserAdmin ||
            (currentUserMembership.role === "MANAGER" &&
              sql`${groupMember.role} NOT IN ('ADMIN')`)
          }`,
        })
        .from(groupMember)
        .innerJoin(user, eq(user.id, groupMember.userId))
        .where(and(...searchConditions))
        .limit(limit)
        .offset(offset);

      const roleStats = await db
        .select({
          role: groupMember.role,
          count: count(),
        })
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, groupId),
            eq(groupMember.memberStatusEnum, "ACCEPTED"),
          ),
        )
        .groupBy(groupMember.role);

      const roleStatistics: any = {
        ADMIN: 0,
        MANAGER: 0,
        MODERATOR: 0,
        USER: 0,
        total: totalCount.value,
      };

      roleStats.forEach((stat: any) => {
        roleStatistics[stat.role] = stat.count;
      });

      const totalPages = Math.ceil(totalCount.value / limit);

      log.info("Community members retrieved", {
        groupId,
        count: members.length,
        total: totalCount.value,
      });

      return {
        members,
        roleStatistics,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalCount.value,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        permissions: {
          isCurrentUserAdmin,
          currentUserRole: currentUserMembership.role,
          canInviteMembers: isCurrentUserAdmin || community.allowMemberInvites,
          canManageRoles: isCurrentUserAdmin,
          canRemoveMembers:
            isCurrentUserAdmin || currentUserMembership.role === "MANAGER",
        },
      };
    } catch (error) {
      log.error("Error in getCommunityMembersWithRoles", {
        error,
        groupId,
        currentUserId,
        entityId,
      });
      throw error;
    }
  }

  static async updateMemberRole({
    groupId,
    memberId,
    newRole,
    currentUserId,
    entityId,
    db,
  }: {
    groupId: string;
    memberId: string;
    newRole: "ADMIN" | "MANAGER" | "MODERATOR" | "USER";
    currentUserId: string;
    entityId: string;
    db: any;
  }) {
    try {
      if (!groupId || !memberId || !newRole || !currentUserId || !entityId) {
        throw new GraphQLError("All parameters are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating member role", {
        groupId,
        memberId,
        newRole,
        currentUserId,
      });

      const community = await db.query.groups.findFirst({
        where: and(eq(groups.id, groupId), eq(groups.entity, entityId)),
      });

      if (!community) {
        throw new GraphQLError("Community not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const currentUserMembership = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, currentUserId),
          eq(groupMember.memberStatusEnum, "ACCEPTED"),
        ),
      });

      if (!currentUserMembership) {
        throw new GraphQLError("You are not a member of this community", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const targetMember = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, memberId),
          eq(groupMember.memberStatusEnum, "ACCEPTED"),
        ),
        with: {
          user: {
            columns: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      if (!targetMember) {
        throw new GraphQLError("Target member not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const currentUserRole = currentUserMembership.role;
      const targetCurrentRole = targetMember.role;

      if (currentUserRole !== "ADMIN" && currentUserRole !== "MANAGER") {
        throw new GraphQLError("Only admins and managers can change roles", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (newRole === "ADMIN" && currentUserRole !== "ADMIN") {
        throw new GraphQLError(
          "Only admins can promote members to admin role",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      if (
        targetCurrentRole === "ADMIN" &&
        currentUserId !== memberId &&
        currentUserRole !== "ADMIN"
      ) {
        throw new GraphQLError("Only admins can modify admin roles", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (
        currentUserRole === "MANAGER" &&
        !["MODERATOR", "USER"].includes(targetCurrentRole) &&
        currentUserId !== memberId
      ) {
        throw new GraphQLError(
          "Managers can only modify moderator and user roles",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      if (
        currentUserId === memberId &&
        currentUserRole === "ADMIN" &&
        newRole !== "ADMIN"
      ) {
        const adminCount = await db
          .select({ count: count() })
          .from(groupMember)
          .where(
            and(
              eq(groupMember.groupId, groupId),
              eq(groupMember.role, "ADMIN"),
              eq(groupMember.memberStatusEnum, "ACCEPTED"),
            ),
          );

        if (adminCount[0].count <= 1) {
          throw new GraphQLError(
            "Cannot demote yourself when you're the only admin",
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }
      }

      const [updatedMember] = await db
        .update(groupMember)
        .set({
          role: newRole,
          updatedAt: new Date(),
        })
        .where(eq(groupMember.id, targetMember.id))
        .returning();

      await db.insert(communityActivityLog).values({
        groupId,
        userId: currentUserId,
        type: "MEMBER_EVENT",
        status: "UPDATED",
        details: {
          targetUserId: memberId,
          targetUserName: targetMember.user.fullName,
          previousRole: targetCurrentRole,
          newRole: newRole,
          updatedBy: currentUserId,
        },
      });

      log.info("Member role updated", {
        groupId,
        memberId,
        newRole,
        previousRole: targetCurrentRole,
      });

      return {
        success: true,
        member: {
          id: updatedMember.id,
          userId: updatedMember.userId,
          role: updatedMember.role,
          updatedAt: updatedMember.updatedAt,
          user: targetMember.user,
        },
      };
    } catch (error) {
      log.error("Error in updateMemberRole", {
        error,
        groupId,
        memberId,
        newRole,
        currentUserId,
      });
      throw error;
    }
  }

  static async removeMemberFromCommunity({
    groupId,
    memberId,
    currentUserId,
    entityId,
    reason,
    db,
  }: {
    groupId: string;
    memberId: string;
    currentUserId: string;
    entityId: string;
    reason?: string;
    db: any;
  }) {
    try {
      if (!groupId || !memberId || !currentUserId || !entityId) {
        throw new GraphQLError("All required parameters must be provided.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Removing member from community", {
        groupId,
        memberId,
        currentUserId,
        reason,
      });

      const community = await db.query.groups.findFirst({
        where: and(eq(groups.id, groupId), eq(groups.entity, entityId)),
      });

      if (!community) {
        throw new GraphQLError("Community not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const currentUserMembership = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, currentUserId),
          eq(groupMember.memberStatusEnum, "ACCEPTED"),
        ),
      });

      if (!currentUserMembership) {
        throw new GraphQLError("You are not a member of this community", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const targetMember = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, memberId),
          eq(groupMember.memberStatusEnum, "ACCEPTED"),
        ),
        with: {
          user: {
            columns: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      if (!targetMember) {
        throw new GraphQLError("Target member not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const currentUserRole = currentUserMembership.role;
      const targetCurrentRole = targetMember.role;

      if (!["ADMIN", "MANAGER", "MODERATOR"].includes(currentUserRole)) {
        throw new GraphQLError(
          "Only admins, managers, and moderators can remove members",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      if (currentUserRole === "MODERATOR" && targetCurrentRole !== "USER") {
        throw new GraphQLError("Moderators can only remove regular users", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (currentUserRole === "MANAGER" && targetCurrentRole === "ADMIN") {
        throw new GraphQLError("Managers cannot remove admins", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (currentUserId === memberId && currentUserRole === "ADMIN") {
        const adminCount = await db
          .select({ count: count() })
          .from(groupMember)
          .where(
            and(
              eq(groupMember.groupId, groupId),
              eq(groupMember.role, "ADMIN"),
              eq(groupMember.memberStatusEnum, "ACCEPTED"),
            ),
          );

        if (adminCount[0].count <= 1) {
          throw new GraphQLError(
            "Cannot leave community when you're the only admin",
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }
      }

      await db.transaction(async (tx: any) => {
        await tx.delete(groupMember).where(eq(groupMember.id, targetMember.id));

        await tx
          .update(groups)
          .set({
            numberOfUser: sql`${groups.numberOfUser} - 1`,
            updatedAt: new Date(),
          })
          .where(eq(groups.id, groupId));

        await tx.insert(communityActivityLog).values({
          groupId,
          userId: currentUserId,
          type: "MEMBER_EVENT",
          status: currentUserId === memberId ? "LEFT" : "REMOVED",
          details: {
            targetUserId: memberId,
            targetUserName: targetMember.user.fullName,
            targetRole: targetCurrentRole,
            removedBy: currentUserId,
            reason: reason || null,
          },
        });
      });

      log.info("Member removed from community", {
        groupId,
        memberId,
        removedBy: currentUserId,
        selfRemoval: currentUserId === memberId,
      });

      return {
        success: true,
        message:
          currentUserId === memberId
            ? "Successfully left the community"
            : "Member removed successfully",
        removedMember: {
          id: targetMember.id,
          userId: targetMember.userId,
          user: targetMember.user,
        },
      };
    } catch (error) {
      log.error("Error in removeMemberFromCommunity", {
        error,
        groupId,
        memberId,
        currentUserId,
      });
      throw error;
    }
  }

  static async handleJoinRequest({
    groupId,
    requestId,
    action,
    currentUserId,
    entityId,
    db,
  }: {
    groupId: string;
    requestId: string;
    action: "ACCEPT" | "REJECT";
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
  }) {
    try {
      if (!groupId || !requestId || !action || !currentUserId || !entityId) {
        throw new GraphQLError("All parameters are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Handling join request", {
        groupId,
        requestId,
        action,
        currentUserId,
      });

      const community = await db.query.groups.findFirst({
        where: and(eq(groups.id, groupId), eq(groups.entity, entityId)),
      });

      if (!community) {
        throw new GraphQLError("Community not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const hasPermission = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, currentUserId),
          inArray(groupMember.role, ["ADMIN", "MANAGER"]),
        ),
      });

      if (!hasPermission) {
        throw new GraphQLError(
          "Only admins, managers, and moderators can handle join requests",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      const joinRequest = await db.query.groupRequest.findFirst({
        where: and(
          eq(groupRequest.id, requestId),
          eq(groupRequest.groupId, groupId),
          eq(groupRequest.memberStatusEnum, "PENDING"),
        ),
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

      if (!joinRequest) {
        throw new GraphQLError("Join request not found or already processed", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      await db.transaction(async (tx: any) => {
        if (action === "ACCEPT") {
          await tx.insert(groupMember).values({
            groupId,
            userId: joinRequest.userId,
            role: "USER",
            memberStatusEnum: "ACCEPTED",
          });

          await tx
            .update(groups)
            .set({
              numberOfUser: sql`${groups.numberOfUser} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(groups.id, groupId));

          await tx
            .update(groupRequest)
            .set({
              memberStatusEnum: "ACCEPTED",
              updatedAt: new Date(),
            })
            .where(eq(groupRequest.id, requestId));
        } else {
          await tx.delete(groupRequest).where(eq(groupRequest.id, requestId));
        }
      });

      log.info("Join request handled", {
        groupId,
        requestId,
        action,
        handledBy: currentUserId,
      });

      return {
        success: true,
        action,
        request: {
          id: joinRequest.id,
          userId: joinRequest.userId,
          user: joinRequest.user,
          status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
        },
      };
    } catch (error) {
      log.error("Error in handleJoinRequest", {
        error,
        groupId,
        requestId,
        action,
        currentUserId,
      });
      throw error;
    }
  }

  static async getPendingJoinRequests({
    groupId,
    currentUserId,
    entityId,
    db,
    cursor,
    limit = 20,
  }: {
    groupId: string;
    currentUserId: string;
    entityId: string;
    db: AppDatabase;
    cursor?: string | null;
    limit?: number;
  }) {
    try {
      if (!groupId || !currentUserId || !entityId) {
        throw new GraphQLError(
          "Group ID, User ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Getting pending join requests", {
        groupId,
        currentUserId,
        cursor,
        limit,
      });

      const community = await db.query.groups.findFirst({
        where: and(eq(groups.id, groupId), eq(groups.entity, entityId)),
      });

      if (!community) {
        throw new GraphQLError("Community not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const hasPermission = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, currentUserId),
          inArray(groupMember.role, ["ADMIN", "MANAGER"]),
        ),
      });

      if (!hasPermission) {
        throw new GraphQLError(
          "Only admins, managers, and moderators can view join requests",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      const whereConditions = [
        eq(groupRequest.groupId, groupId),
        eq(groupRequest.memberStatusEnum, "PENDING"),
      ];

      if (cursor) {
        whereConditions.push(
          sql`${groupRequest.createdAt} < ${new Date(cursor)}`,
        );
      }

      const [totalCountResult] = await db
        .select({ value: count() })
        .from(groupRequest)
        .where(
          and(
            eq(groupRequest.groupId, groupId),
            eq(groupRequest.memberStatusEnum, "PENDING"),
          ),
        );

      const requests = await db.query.groupRequest.findMany({
        where: and(...whereConditions),
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
            },
          },
        },
        orderBy: [desc(groupRequest.createdAt)],
        limit: limit + 1,
      });

      const hasNextPage = requests.length > limit;
      const nodes = hasNextPage ? requests.slice(0, limit) : requests;

      const processedRequests = nodes.map((request: any) => ({
        id: request.id,
        userId: request.userId,
        notes: request.notes,
        requestedAt: request.createdAt,
        user: {
          ...request.user,
          fullName: `${request.user.firstName} ${request.user.lastName}`,
        },
      }));

      const edges = processedRequests.map((request: any) => ({
        cursor: request.requestedAt.toISOString(),
        node: request,
      }));

      log.info("Pending join requests retrieved", {
        groupId,
        count: nodes.length,
        total: totalCountResult?.value || 0,
      });

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: totalCountResult?.value || 0,
      };
    } catch (error) {
      log.error("Error in getPendingJoinRequests", {
        error,
        groupId,
        currentUserId,
        entityId,
      });
      throw error;
    }
  }

  // Get Pending Join Requests Count
  static async getPendingJoinRequestsCount({
    groupId,
    currentUserId,
    entityId,
    db,
  }: {
    groupId: string;
    currentUserId: string;
    entityId: string;
    db: any;
  }) {
    try {
      // Check if community exists
      const community = await db.query.groups.findFirst({
        where: and(eq(groups.id, groupId), eq(groups.entity, entityId)),
      });

      if (!community) {
        throw new GraphQLError("Community not found");
      }

      // Check if current user has permission to view requests
      const hasPermission = await BaseCommunityService.hasGroupPermission({
        userId: currentUserId,
        groupId,
        db,
        role: ["ADMIN", "MANAGER"],
      });

      if (!hasPermission) {
        // Log unauthorized access to join request count

        throw new GraphQLError(
          "Only admins and managers can view join request count",
        );
      }

      // Get count of pending requests
      const [result] = await db
        .select({ count: count() })
        .from(groupRequest)
        .where(
          and(
            eq(groupRequest.groupId, groupId),
            eq(groupRequest.memberStatusEnum, "PENDING"),
          ),
        );

      // Log successful access to join request count

      return {
        count: result.count,
        groupId,
      };
    } catch (error) {
      // Log error if not already logged

      // logError("Error in getPendingJoinRequestsCount", error, {
      //   groupId,
      //   currentUserId,
      //   entityId,
      // });
      throw error;
    }
  }

  // Bulk Actions for Members
  static async bulkMemberActions({
    groupId,
    memberIds,
    action,
    currentUserId,
    entityId,
    db,
    newRole,
    reason,
  }: {
    groupId: string;
    memberIds: string[];
    action: "REMOVE" | "UPDATE_ROLE";
    currentUserId: string;
    entityId: string;
    db: any;
    newRole?: "ADMIN" | "MANAGER" | "MODERATOR" | "USER";
    reason?: string;
  }) {
    try {
      // Check if community exists
      const community = await db.query.groups.findFirst({
        where: and(eq(groups.id, groupId), eq(groups.entity, entityId)),
      });

      if (!community) {
        throw new GraphQLError("Community not found");
      }

      // Check if current user has permission
      const hasPermission = await BaseCommunityService.hasGroupPermission({
        userId: currentUserId,
        groupId,
        db,
        role: ["ADMIN", "MANAGER"],
      });

      if (!hasPermission) {
        // Log unauthorized bulk action attempt
        await db.insert(communityLogs).values({
          communityId: groupId,
          performedBy: currentUserId,
          action: action === "REMOVE" ? "DELETE" : "UPDATE",
          status: "REJECTED",
          reason: "Unauthorized bulk member action attempt",
          entity: entityId,
          newState: {
            action: "bulk_member_actions",
            bulkAction: action,
            memberIds,
            newRole,
            reason,
          },
        });

        throw new GraphQLError(
          "Only admins and managers can perform bulk actions",
        );
      }

      // Log bulk action start
      await db.insert(communityLogs).values({
        communityId: groupId,
        performedBy: currentUserId,
        action: action === "REMOVE" ? "DELETE" : "UPDATE",
        status: "APPROVED",
        reason: `Bulk member action started: ${action}`,
        entity: entityId,
        newState: {
          action: "bulk_member_actions_start",
          bulkAction: action,
          memberIds,
          newRole,
          reason,
          memberCount: memberIds.length,
        },
      });

      const results = [];
      const errors = [];

      for (const memberId of memberIds) {
        try {
          if (action === "REMOVE") {
            const result = await this.removeMemberFromCommunity({
              groupId,
              memberId,
              currentUserId,
              entityId,
              reason,
              db,
            });
            results.push({ memberId, success: true, result });
          } else if (action === "UPDATE_ROLE" && newRole) {
            const result = await this.updateMemberRole({
              groupId,
              memberId,
              newRole,
              currentUserId,
              entityId,
              db,
            });
            results.push({ memberId, success: true, result });
          }
        } catch (error: any) {
          errors.push({ memberId, error: error.message });
        }
      }

      // Log bulk action completion
      await db.insert(communityLogs).values({
        communityId: groupId,
        performedBy: currentUserId,
        action: action === "REMOVE" ? "DELETE" : "UPDATE",
        status: "APPROVED",
        reason: `Bulk member action completed: ${action}`,
        entity: entityId,
        newState: {
          action: "bulk_member_actions_complete",
          bulkAction: action,
          totalProcessed: memberIds.length,
          successful: results.length,
          failed: errors.length,
          results: results.map((r) => ({
            memberId: r.memberId,
            success: r.success,
          })),
          errors: errors.map((e) => ({ memberId: e.memberId, error: e.error })),
        },
      });

      return {
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors,
      };
    } catch (error: any) {
      // Log error if not already logged
      if (
        !error?.message?.includes("Community not found") &&
        !error?.message?.includes("Only admins")
      ) {
        await db.insert(communityLogs).values({
          communityId: groupId,
          performedBy: currentUserId,
          action: action === "REMOVE" ? "DELETE" : "UPDATE",
          status: "REJECTED",
          reason: `Error in bulk member actions: ${error.message}`,
          entity: entityId,
          newState: {
            action: "bulk_member_actions_error",
            bulkAction: action,
            memberIds,
            newRole,
            reason,
            error: error.message,
          },
        });
      }

      log.error("Error in bulkMemberActions", {
        error,
        groupId,
        memberIds,
        action,
        currentUserId,
        entityId,
      });
      throw error;
    }
  }

  // ...existing code...

  // Add to existing CommunityActionsService class

  static async getCommunityMemberStats({
    memberId,
    communityId,
    viewerId,
    entityId,
    db,
  }: {
    memberId: string;
    communityId: string;
    viewerId?: string;
    entityId: string;
    db: any;
  }) {
    try {
      CommunityActionsService.validateInput({
        userId: memberId,
        groupId: communityId,
        entityId,
      });

      // Check if community exists
      const community = await db.query.groups.findFirst({
        where: eq(groups.id, communityId),
      });

      if (!community) {
        throw new GraphQLError("Community not found");
      }

      // Check if target user is a member
      const targetMembership = await CommunityActionsService.getUserMembership(
        db,
        memberId,
        communityId,
      );
      if (!targetMembership) {
        throw new GraphQLError("User is not a member of this community");
      }

      // Check if viewer has permission to see detailed stats
      const viewerMembership = viewerId
        ? await CommunityActionsService.getUserMembership(
            db,
            viewerId,
            communityId,
          )
        : null;

      const canViewPrivateStats =
        viewerId === memberId ||
        (viewerMembership &&
          ["ADMIN", "MANAGER"].includes(viewerMembership?.role || ""));

      // Get user's community feeds with detailed metrics
      const userFeeds = await db
        .select({
          feedId: userFeed.id,
          feedType: sql<string>`
          CASE 
            WHEN ${userFeed.jobId} IS NOT NULL THEN 'job'
            WHEN ${userFeed.offerId} IS NOT NULL THEN 'offer'
            WHEN ${userFeed.pollId} IS NOT NULL THEN 'poll'
            WHEN ${userFeed.marketPlaceId} IS NOT NULL THEN 'marketplace'
            WHEN ${userFeed.eventId} IS NOT NULL THEN 'event'
            ELSE 'post'
          END
        `,
          status: communityFeed.status,
          isPinned: communityFeed.isPinned,
          createdAt: userFeed.createdAt,

          totalLikes: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM ${communityFeedInteraction} 
          WHERE ${communityFeedInteraction.feedId} = ${communityFeed.id} 
          AND ${communityFeedInteraction.type} = 'LIKE'
        ), 0)`,
          totalComments: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM ${communityFeedInteraction} 
          WHERE ${communityFeedInteraction.feedId} = ${communityFeed.id} 
          AND ${communityFeedInteraction.type} = 'COMMENT'
        ), 0)`,
          totalShares: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM ${communityFeedInteraction} 
          WHERE ${communityFeedInteraction.feedId} = ${communityFeed.id} 
          AND ${communityFeedInteraction.type} = 'SHARE'
        ), 0)`,
          isReported: sql<boolean>`EXISTS(
          SELECT 1 FROM ${communityFeedReport}
          WHERE ${communityFeedReport.feedId} = ${communityFeed.id}
        )`,
        })
        .from(userFeed)
        .innerJoin(communityFeed, eq(communityFeed.userFeedId, userFeed.id))
        .where(
          and(
            eq(userFeed.userId, memberId),
            eq(userFeed.groupId, communityId),
            eq(userFeed.entity, entityId),
          ),
        );

      // Calculate basic stats
      const totalPosts = userFeeds.length;
      const approvedPosts = userFeeds.filter(
        (f: any) => f.status === "APPROVED",
      ).length;
      const pendingPosts = canViewPrivateStats
        ? userFeeds.filter((f: any) => f.status === "PENDING").length
        : 0;
      const rejectedPosts = canViewPrivateStats
        ? userFeeds.filter((f: any) => f.status === "REJECTED").length
        : 0;
      const pinnedPosts = userFeeds.filter((f: any) => f.isPinned).length;
      const reportedPosts = canViewPrivateStats
        ? userFeeds.filter((f: any) => f.isReported).length
        : 0;

      // Calculate engagement metrics
      const totalLikes = userFeeds.reduce(
        (sum: any, f: any) => sum + f.totalLikes,
        0,
      );
      const totalComments = userFeeds.reduce(
        (sum: any, f: any) => sum + f.totalComments,
        0,
      );
      const totalShares = userFeeds.reduce(
        (sum: any, f: any) => sum + f.totalShares,
        0,
      );
      const totalViews = 0;

      // Calculate posts by type
      const postsByType = userFeeds.reduce(
        (acc: any, feed: any) => {
          acc[feed.feedType] = (acc[feed.feedType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Calculate membership duration
      const joinedAt = targetMembership.createdAt || new Date();
      const membershipDuration = Math.floor(
        (Date.now() - joinedAt?.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Get last activity (last post or interaction)
      const lastActivityResult = await db
        .select({
          lastActivity: sql<Date>`GREATEST(
          COALESCE(MAX(${userFeed.createdAt}), '1970-01-01'::timestamp),
          COALESCE(MAX(${communityFeedInteraction.createdAt}), '1970-01-01'::timestamp)
        )`,
        })
        .from(userFeed)
        .leftJoin(
          communityFeedInteraction,
          eq(communityFeedInteraction.userId, memberId),
        )
        .where(
          and(eq(userFeed.userId, memberId), eq(userFeed.groupId, communityId)),
        );

      const lastActive = lastActivityResult[0]?.lastActivity || null;

      // Calculate engagement score (weighted formula)
      const engagementScore = this.calculateEngagementScore({
        totalPosts: approvedPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        membershipDuration,
        pinnedPosts,
      });

      // Get member badges
      const badges = await this.getMemberBadges({
        db,
        memberId,
        communityId,
        stats: {
          totalPosts: approvedPosts,
          totalLikes,
          totalComments,
          membershipDuration,
          pinnedPosts,
          engagementScore,
        },
        role: targetMembership.role || "",
      });

      const stats: CommunityMemberStats = {
        totalPosts,
        approvedPosts,
        pendingPosts,
        rejectedPosts,
        pinnedPosts,
        reportedPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        joinedAt,
        lastActive,
        membershipDuration,
        rank: 0,
        badges,
        postsByType,
        engagementScore,
      };

      return {
        memberId,
        communityId,
        stats,
        canViewPrivateStats,
        role: targetMembership.role,
      };
    } catch (error) {
      log.error("Error in getCommunityMemberStats", {
        error,
        memberId,
        communityId,
      });
      throw error;
    }
  }

  static async getCommunityMembersWithStats({
    communityId,
    viewerId,
    entityId,
    limit = 20,
    offset = 0,
    sortBy = "engagementScore", // 'engagementScore', 'totalPosts', 'joinedAt', 'lastActive'
    sortOrder = "desc",
    role,
    db,
  }: {
    communityId: string;
    viewerId?: string;
    entityId: string;
    limit?: number;
    offset?: number;
    sortBy?: "engagementScore" | "totalPosts" | "joinedAt" | "lastActive";
    sortOrder?: "asc" | "desc";
    role?: string;
    db: any;
  }) {
    try {
      CommunityActionsService.validateInput({
        groupId: communityId,
        entityId,
        limit,
      });

      // Check if viewer has permission
      const viewerMembership = viewerId
        ? await CommunityActionsService.getUserMembership(
            db,
            viewerId,
            communityId,
          )
        : null;

      if (!viewerMembership) {
        throw new GraphQLError(
          "You must be a member to view community member stats",
        );
      }

      // Build conditions
      const conditions = [eq(groupMember.groupId, communityId)];
      if (role) {
        conditions.push(
          eq(
            groupMember.role,
            role as "USER" | "ADMIN" | "MANAGER" | "NOT_MEMBER",
          ),
        );
      }

      // Get community members with basic info
      const members = await db.query.groupMember.findMany({
        where: and(...conditions),
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
        limit,
        offset,
      });

      // Get detailed stats for each member
      const membersWithStats = await Promise.all(
        members.map(async (member: any) => {
          try {
            const memberStats = await this.getCommunityMemberStats({
              memberId: member.userId,
              communityId,
              viewerId,
              entityId,
              db,
            });

            return {
              id: member.id,
              userId: member.userId,
              role: member.role,
              joinedAt: member.createdAt,
              user: member.user,
              stats: memberStats.stats,
              canViewPrivateStats: memberStats.canViewPrivateStats,
            };
          } catch (error) {
            // If individual member stats fail, return basic info
            log.error("Error getting individual member stats", {
              error,
              memberId: member.userId,
              communityId,
            });

            return {
              id: member.id,
              userId: member.userId,
              role: member.role,
              joinedAt: member.createdAt,
              user: member.user,
              stats: null,
              canViewPrivateStats: false,
            };
          }
        }),
      );

      // Sort members based on criteria
      const sortedMembers = this.sortMembersByStats(
        membersWithStats,
        sortBy,
        sortOrder,
      );

      // Get total count
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(groupMember)
        .where(and(...conditions));

      return {
        members: sortedMembers,
        pagination: {
          total: totalCount[0]?.count || 0,
          limit,
          offset,
          hasMore: (totalCount[0]?.count || 0) > offset + limit,
        },
      };
    } catch (error) {
      log.error("Error in getCommunityMembersWithStats", {
        error,
        communityId,
      });
      throw error;
    }
  }

  static async getCommunityLeaderboard({
    communityId,
    viewerId,
    entityId,
    period = "all", // 'week', 'month', 'quarter', 'year', 'all'
    category = "overall", // 'overall', 'posts', 'engagement', 'likes', 'comments'
    limit = 10,
    db,
  }: {
    communityId: string;
    viewerId?: string;
    entityId: string;
    period?: "week" | "month" | "quarter" | "year" | "all";
    category?: "overall" | "posts" | "engagement" | "likes" | "comments";
    limit?: number;
    db: any;
  }) {
    try {
      CommunityActionsService.validateInput({
        groupId: communityId,
        entityId,
        limit,
      });

      // Check if viewer has permission
      const viewerMembership = viewerId
        ? await CommunityActionsService.getUserMembership(
            db,
            viewerId,
            communityId,
          )
        : null;

      if (!viewerMembership) {
        throw new GraphQLError(
          "You must be a member to view community leaderboard",
        );
      }

      // Calculate date filter based on period
      const dateFilter = this.getDateFilterForPeriod(period);

      // Get member rankings based on category
      const leaderboard = await this.getLeaderboardByCategory({
        communityId,
        entityId,
        category,
        dateFilter,
        limit,
        db,
      });

      return {
        communityId,
        period,
        category,
        leaderboard,
        viewerRank:
          leaderboard.findIndex((l: any) => l.userId === viewerId) + 1 || null,
      };
    } catch (error) {
      log.error("Error in getCommunityLeaderboard", {
        error,
        communityId,
        category,
        period,
      });
      throw error;
    }
  }

  // Helper methods

  private static calculateEngagementScore({
    totalPosts,
    totalLikes,
    totalComments,
    totalShares,
    totalViews,
    membershipDuration,
    pinnedPosts,
  }: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    membershipDuration: number;
    pinnedPosts: number;
  }): number {
    const weights = {
      posts: 10,
      likes: 2,
      comments: 5,
      shares: 8,
      views: 0.1,
      pinned: 20,
    };

    const rawScore =
      totalPosts * weights.posts +
      totalLikes * weights.likes +
      totalComments * weights.comments +
      totalShares * weights.shares +
      totalViews * weights.views +
      pinnedPosts * weights.pinned;

    // Normalize by membership duration (minimum 1 day to avoid division by zero)
    const durationFactor = Math.max(membershipDuration, 1);
    const normalizedScore = rawScore / Math.log(durationFactor + 1);

    return Math.round(normalizedScore * 100) / 100;
  }

  private static async getMemberBadges({
    db,
    memberId,
    communityId,
    stats,
    role,
  }: {
    db: any;
    memberId: string;
    communityId: string;
    stats: {
      totalPosts: number;
      totalLikes: number;
      totalComments: number;
      membershipDuration: number;
      pinnedPosts: number;
      engagementScore: number;
    };
    role: string;
  }): Promise<string[]> {
    const badges: string[] = [];

    // Role-based badges
    if (role === "ADMIN") badges.push("Community Admin");
    if (role === "MANAGER") badges.push("Community Manager");

    // Post-based badges
    if (stats.totalPosts >= 100) badges.push("Prolific Poster");
    else if (stats.totalPosts >= 50) badges.push("Active Contributor");
    else if (stats.totalPosts >= 10) badges.push("Regular Poster");
    else if (stats.totalPosts >= 1) badges.push("First Post");

    // Engagement badges
    if (stats.totalLikes >= 1000) badges.push("Community Star");
    else if (stats.totalLikes >= 500) badges.push("Popular Member");
    else if (stats.totalLikes >= 100) badges.push("Well Liked");

    if (stats.totalComments >= 500) badges.push("Great Conversationalist");
    else if (stats.totalComments >= 100) badges.push("Active Commenter");

    // Duration badges
    if (stats.membershipDuration >= 365) badges.push("Veteran Member");
    else if (stats.membershipDuration >= 180) badges.push("Long-time Member");
    else if (stats.membershipDuration >= 30) badges.push("Established Member");
    else if (stats.membershipDuration >= 7) badges.push("New Member");

    // Special badges
    if (stats.pinnedPosts > 0) badges.push("Featured Content Creator");

    if (stats.engagementScore >= 1000) badges.push("Community Champion");
    else if (stats.engagementScore >= 500) badges.push("Highly Engaged");

    return badges;
  }

  private static sortMembersByStats(
    members: any[],
    sortBy: string,
    sortOrder: "asc" | "desc",
  ) {
    return members.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "engagementScore":
          aValue = a.stats?.engagementScore || 0;
          bValue = b.stats?.engagementScore || 0;
          break;
        case "totalPosts":
          aValue = a.stats?.totalPosts || 0;
          bValue = b.stats?.totalPosts || 0;
          break;
        case "joinedAt":
          aValue = new Date(a.joinedAt).getTime();
          bValue = new Date(b.joinedAt).getTime();
          break;
        case "lastActive":
          aValue = a.stats?.lastActive
            ? new Date(a.stats.lastActive).getTime()
            : 0;
          bValue = b.stats?.lastActive
            ? new Date(b.stats.lastActive).getTime()
            : 0;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortOrder === "desc") {
        return bValue - aValue;
      }
      return aValue - bValue;
    });
  }

  private static getDateFilterForPeriod(period: string) {
    const now = new Date();

    switch (period) {
      case "week":
        return sql`${userFeed.createdAt} >= ${new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        )}`;
      case "month":
        return sql`${userFeed.createdAt} >= ${new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        )}`;
      case "quarter":
        return sql`${userFeed.createdAt} >= ${new Date(
          now.getTime() - 90 * 24 * 60 * 60 * 1000,
        )}`;
      case "year":
        return sql`${userFeed.createdAt} >= ${new Date(
          now.getTime() - 365 * 24 * 60 * 60 * 1000,
        )}`;
      default:
        return sql`true`; // No date filter for 'all'
    }
  }

  private static async getLeaderboardByCategory({
    communityId,
    entityId,
    category,
    dateFilter,
    limit,
    db,
  }: {
    communityId: string;
    entityId: string;
    category: string;
    dateFilter: any;
    limit: number;
    db: any;
  }) {
    let scoreExpression;

    switch (category) {
      case "posts":
        scoreExpression = sql`COUNT(DISTINCT CASE WHEN ${communityFeed.status} = 'APPROVED' THEN ${userFeed.id} END)`;
        break;
      case "likes":
        scoreExpression = sql`COUNT(DISTINCT CASE WHEN ${communityFeedInteraction.type} = 'LIKE' THEN ${communityFeedInteraction.id} END)`;
        break;
      case "comments":
        scoreExpression = sql`COUNT(DISTINCT CASE WHEN ${communityFeedInteraction.type} = 'COMMENT' THEN ${communityFeedInteraction.id} END)`;
        break;
      case "engagement":
        scoreExpression = sql`
        COUNT(DISTINCT CASE WHEN ${communityFeedInteraction.type} = 'LIKE' THEN ${communityFeedInteraction.id} END) * 2 +
        COUNT(DISTINCT CASE WHEN ${communityFeedInteraction.type} = 'COMMENT' THEN ${communityFeedInteraction.id} END) * 5 +
        COUNT(DISTINCT CASE WHEN ${communityFeedInteraction.type} = 'SHARE' THEN ${communityFeedInteraction.id} END) * 8
      `;
        break;
      default: // overall
        scoreExpression = sql`
        COUNT(DISTINCT CASE WHEN ${communityFeed.status} = 'APPROVED' THEN ${userFeed.id} END) * 10 +
        COUNT(DISTINCT CASE WHEN ${communityFeedInteraction.type} = 'LIKE' THEN ${communityFeedInteraction.id} END) * 2 +
        COUNT(DISTINCT CASE WHEN ${communityFeedInteraction.type} = 'COMMENT' THEN ${communityFeedInteraction.id} END) * 5 +
        COUNT(DISTINCT CASE WHEN ${communityFeedInteraction.type} = 'SHARE' THEN ${communityFeedInteraction.id} END) * 8
      `;
    }

    return db
      .select({
        userId: groupMember.userId,
        role: groupMember.role,
        score: scoreExpression,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
      })
      .from(groupMember)
      .leftJoin(user, eq(groupMember.userId, user.id))
      .leftJoin(
        userFeed,
        and(
          eq(userFeed.userId, groupMember.userId),
          eq(userFeed.groupId, communityId),
        ),
      )
      .leftJoin(communityFeed, eq(communityFeed.userFeedId, userFeed.id))
      .leftJoin(
        communityFeedInteraction,
        eq(communityFeedInteraction.feedId, communityFeed.id),
      )
      .where(and(eq(groupMember.groupId, communityId), dateFilter))
      .groupBy(
        groupMember.userId,
        groupMember.role,
        user.id,
        user.firstName,
        user.lastName,
        user.avatar,
      )
      .orderBy(desc(scoreExpression))
      .limit(limit);
  }
}
