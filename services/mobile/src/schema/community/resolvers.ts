import {
  groups,
  communitySettings,
  privacyEnum,
  groupMember,
  user,
  events,
  communityActivityLog,
  groupRequest, // Assuming this is exported from @thrico/database
  AppDatabase,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";

import { and, count, desc, eq, or, sql } from "drizzle-orm";
// import moment from "moment"; // moment is not used in the snippet except for one map log line which I can keep or refactor. The snippet uses it. I'll import it.
import moment from "moment";

import {
  CommunityActionsService,
  CommunityQueryService,
  CommunityMemberService,
  CommunityMediaService,
  CommunityRatingService,
  CommunityManagementService,
} from "@thrico/services";
import { BaseCommunityService } from "@thrico/services/dist/community/base.service";

interface AuthContext {
  db: AppDatabase;
  id: string;
  entityId?: string;
  userId?: string;
}

const communitiesResolvers = {
  Query: {
    async getCommunityDetails(_: any, { input }: any, context: AuthContext) {
      try {
        const { db, userId, entityId } = await checkAuth(context);
        const groupId = input.id;

        return await CommunityQueryService.getCommunityDetails({
          groupId,
          currentUserId: userId,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async trackCommunityView(_: any, { input }: any, context: any) {
      try {
        const { db, id, userId } = await checkAuth(context);

        console.log(input);
        await BaseCommunityService.trackCommunityView({
          userId,
          groupId: input.id,
          db,
        });

        return true;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunityAnalytics(_: any, { input }: any, context: AuthContext) {
      try {
        const authContext: AuthContext = await checkAuth(context);
        const { db, id: userId } = authContext;
        const groupId = input.id;

        // Total members
        const totalMembers = await db
          .select({ count: sql`count(*)` })
          .from(groupMember)
          .where(eq(groupMember.groupId, groupId));

        // Active users: members who logged in within last 30 days
        const activeUsers = await db
          .select({ count: sql`count(*)` })
          .from(groupMember)
          .innerJoin(user, eq(groupMember.userId, user.id))
          .where(
            and(
              eq(groupMember.groupId, groupId),
              sql`${user.updatedAt} >= NOW() - INTERVAL '30 days'`
            )
          );

        // Posts this month: count posts in this group created in current month
        // If you have a posts table, import and use here. Otherwise, leave as 0.
        let postsThisMonth = [{ count: 0 }];

        // Events created: count events in this group
        const eventsCreated = await db
          .select({ count: sql`count(*)` })
          .from(events)
          .where(eq(events.group, groupId));

        // Recent activity: last 5 activities
        const recentActivityRows = await db
          .select()
          .from(communityActivityLog)
          .where(eq(communityActivityLog.groupId, groupId))
          .orderBy(desc(communityActivityLog.createdAt))
          .limit(5);

        const recentActivity = recentActivityRows.map((row) => {
          let description = "";
          let type = row.type || "";
          let createdAt = row.createdAt;
          // let userId = row.userId; // unwused
          let status = row.status || "";

          if (
            row.details &&
            typeof row.details === "object" &&
            "description" in row.details
          ) {
            description = (row.details as { description: string }).description;
          } else if (typeof row.details === "string") {
            description = row.details;
          } else {
            description = JSON.stringify(row.details);
          }

          return `${status} - ${description}  on ${moment(createdAt).format(
            "YYYY-MM-DD HH:mm:ss"
          )} (Status: ${type})`;
        });

        return {
          totalMembers: totalMembers[0]?.count || 0,
          activeUsers: activeUsers[0]?.count || 0,
          postsThisMonth: postsThisMonth[0]?.count || 0,
          eventsCreated: eventsCreated[0]?.count || 0,
          recentActivity,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getGroupJoinRequests(_: any, { input }: any, context: AuthContext) {
      try {
        const { db } = await checkAuth(context);
        const groupId = input.id;
        // Use groupRequest (communityMemberRequest table) from schema
        const result = await BaseCommunityService.getGroupJoinRequests({
          groupId,
          db,
        });
        console.log(result);
        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getCommunitiesModeType(_: any, {}: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        // return communityTypeEnum?.enumValues;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunityAboutById(_: any, { input }: any, context: AuthContext) {
      try {
        const { db, entityId } = await checkAuth(context);
        const groupId = input.id;

        // Fetch community details
        const communityDetails = await db.query.groups.findFirst({
          where: and(eq(groups.id, groupId)),
        });
        if (!communityDetails) {
          throw new Error("No Community found");
        }

        // Fetch admin info (assuming admin info is in communitySettings or related table)
        const adminInfo = await db.query.communitySettings.findFirst({
          where: and(eq(communitySettings.groupId, groupId)),
        });

        // Fetch rules (assuming rules are in communitySettings or a rules table)
        const rules = adminInfo?.rules || null;

        const admin = await db.query.groupMember.findMany({
          where: and(
            eq(groupMember.groupId, groupId),
            eq(groupMember.role, "ADMIN")
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
        console.log(admin);
        // Fetch post rating summary
        // const postRatingSummary =
        //   await CommunityService.comm({
        //     groupId,
        //     db,
        //   });

        // Fetch member summary

        return {
          communityDetails: {
            ...communityDetails,
            admin: admin.map((member: any) => ({
              id: member.user.id,
              firstName: member.user.firstName,
              lastName: member.user.lastName,
              avatar: member.user.avatar,
            })),
          },
          adminInfo,
          rules,
          postRatingSummary: {}, // Placeholder
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunitiesPrivacyEnum(_: any, {}: any, context: any) {
      try {
        const { id } = await checkAuth(context);

        return privacyEnum?.enumValues;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getAllCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        const page = input?.page || 1;
        const limit = input?.limit || 10;
        const filters = input?.filters || {};
        const searchTerm = input?.searchTerm;

        return CommunityQueryService.getAllCommunities({
          currentUserId,
          entityId,
          db,
          page,
          limit,

          searchTerm,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunitiesByUserId(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db } = await checkAuth(context);

        const page = input?.page || 1;
        const limit = input?.limit || 10;
        const filters = input?.filters || {};
        const searchTerm = input?.searchTerm;

        return CommunityQueryService.getCommunitiesByUserId({
          userId: input.userId,
          entityId,
          db,
          page,
          limit,
          searchTerm,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getMyOwnedCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        const page = input?.page || 1;
        const limit = input?.limit || 10;
        const filters = input?.filters || {};
        const searchTerm = input?.searchTerm;

        return CommunityQueryService.getMyOwnedCommunities({
          currentUserId,
          entityId,
          db,
          page,
          limit,

          searchTerm,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getFeaturedCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        const page = input?.page || 1;
        const limit = input?.limit || 10;
        const searchTerm = input?.searchTerm;

        return CommunityQueryService.getFeaturedCommunities({
          currentUserId,
          entityId,
          db,
          page,
          limit,
          searchTerm,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getTrendingCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        const page = input?.page || 1;
        const limit = input?.limit || 10;
        const searchTerm = input?.searchTerm;

        return CommunityQueryService.getTrendingCommunities({
          currentUserId,
          entityId,
          db,
          page,
          limit,
          searchTerm,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getMyCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        const page = input?.page || 1;
        const limit = input?.limit || 10;
        const searchTerm = input?.searchTerm;

        return CommunityQueryService.getMyJoinedCommunities({
          currentUserId,
          entityId,
          db,
          page,
          limit,
          searchTerm,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getSavedCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        const page = input?.page || 1;
        const limit = input?.limit || 10;
        const searchTerm = input?.searchTerm;

        return CommunityQueryService.getMySavedCommunities({
          currentUserId,
          entityId,
          db,
          page,
          limit,
          searchTerm,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // ...existing queries...
  },

  Mutation: {
    async createCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        return CommunityManagementService.createCommunity({
          userId: userId,
          entityId,
          db,
          input,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteCommunityFeed(_: any, { input }: any, context: any) {
      const { userId, db } = await checkAuth(context);

      console.log(input);
      try {
        await CommunityActionsService.deleteCommunityFeed({
          feedId: input.id,
          userId,
          db,
        });

        return {
          id: input.id,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editCommunity(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        return CommunityManagementService.editCommunity({
          userId: userId,
          entityId,
          db,
          input,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async joinCommunity(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);

        console.log(input);
        return CommunityActionsService.joinCommunity({
          userId,
          groupId: input.id,
          reason: input.reason,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async wishListCommunity(_: any, { input }: any, context: any) {
      const { db, id, entityId, userId } = await checkAuth(context);

      console.log(input);
      try {
        return CommunityActionsService.toggleCommunityWishlist({
          userId,
          groupId: input.id,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // New community mutations
    async toggleCommunityWishlist(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);

        return CommunityActionsService.toggleCommunityWishlist({
          userId,
          groupId: input.id,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // =============== RATING SYSTEM MUTATIONS ===============

    async addCommunityRating(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);

        return CommunityRatingService.addCommunityRating({
          userId,
          groupId: input.groupId,
          entityId,
          rating: input.rating.toString() as "1" | "2" | "3" | "4" | "5",
          review: input.review,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteCommunityRating(_: any, { input }: any, context: any) {
      try {
        const { db, id, userId } = await checkAuth(context);

        // return CommunityRatingService.deleteCommunityRating({
        //   ratingId: input.id,
        //   userId,
        //   db,
        // });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async voteRatingHelpfulness(_: any, { input }: any, context: any) {
      try {
        const { db, id, userId } = await checkAuth(context);

        // return CommunityService.voteRatingHelpfulness({
        //   ratingId: input.ratingId,
        //   userId,
        //   isHelpful: input.isHelpful,
        //   db,
        // });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async verifyRating(_: any, { input }: any, context: any) {
      try {
        const { db, id } = await checkAuth(context);

        // return CommunityRatingService.verifyRating({
        //   ratingId: input.ratingId,
        //   verifierId: id,
        //   isVerified: input.isVerified,
        //   reason: input.reason,
        //   db,
        // });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // =============== MEDIA SYSTEM MUTATIONS ===============

    async addCommunityMedia(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);

        return CommunityMediaService.addCommunityMedia({
          groupId: input.groupId,
          imageUrl: input.imageUrl,
          title: input.title,
          description: input.description,
          uploadedBy: id,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateCommunityMedia(_: any, { input }: any, context: any) {
      try {
        const { db, id, userId } = await checkAuth(context);

        // return CommunityMemberService.updateCommunityMedia({
        //   mediaId: input.mediaId,
        //   title: input.title,
        //   description: input.description,
        //   displayOrder: input.displayOrder,
        //   userId,
        //   db,
        // });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteCommunityMedia(_: any, { input }: any, context: any) {
      try {
        const { db, id, userId } = await checkAuth(context);

        // return CommunityMemberService.deleteCommunityMedia({
        //   mediaId: input.id,
        //   userId,
        //   db,
        // });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async reorderCommunityMedia(_: any, { input }: any, context: any) {
      try {
        const { db, id, userId } = await checkAuth(context);

        // return CommunityMemberService.reorderCommunityMedia({
        //   groupId: input.groupId,
        //   mediaOrder: input.mediaOrder,
        //   userId,
        //   db,
        // });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // =============== MEMBER MANAGEMENT MUTATIONS ===============

    async updateMemberRole(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);
        const currentUserId = userId;

        return CommunityMemberService.updateMemberRole({
          groupId: input.groupId,
          memberId: input.memberId,
          newRole: input.newRole,
          currentUserId,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async removeMemberFromCommunity(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);
        const currentUserId = userId;

        return CommunityMemberService.removeMemberFromCommunity({
          groupId: input.groupId,
          memberId: input.memberId,
          currentUserId,
          entityId,
          reason: input.reason,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async leaveCommunity(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);
        const currentUserId = userId;

        // Use the same service method with memberId = currentUserId
        return CommunityActionsService.leaveCommunity({
          groupId: input.groupId,
          userId: currentUserId,

          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // =============== MEMBER INVITATION MUTATIONS ===============

    // async inviteMemberToCommunity(_: any, { input }: any, context: any) {
    //   ...
    // },

    // async respondToInvitation(_: any, { input }: any, context: any) {
    //   ...
    // },

    // =============== BULK MEMBER MANAGEMENT ===============

    async bulkUpdateMemberRoles(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);
        const currentUserId = userId;

        // Check if user has admin permissions
        const hasPermission = await BaseCommunityService.hasGroupPermission({
          userId: currentUserId,
          groupId: input.groupId,
          db,
          role: "ADMIN",
        });

        if (!hasPermission) {
          throw new Error("Only admins can perform bulk role updates");
        }

        const results = [];
        for (const update of input.updates) {
          try {
            const result = await CommunityMemberService.updateMemberRole({
              groupId: input.groupId,
              memberId: update.memberId,
              newRole: update.newRole,
              currentUserId,
              entityId,
              db,
            });
            results.push({ memberId: update.memberId, success: true, result });
          } catch (error: any) {
            results.push({
              memberId: update.memberId,
              success: false,
              error: error.message,
            });
          }
        }

        return {
          success: true,
          results,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async bulkRemoveMembers(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);
        const currentUserId = userId;

        // Check if user has admin/manager permissions
        const hasPermission = await BaseCommunityService.hasGroupPermission({
          userId: currentUserId,
          groupId: input.groupId,
          db,
          role: ["ADMIN", "MANAGER"],
        });

        if (!hasPermission) {
          throw new Error("Only admins and managers can remove members");
        }

        const results = [];
        for (const memberId of input.memberIds) {
          try {
            const result =
              await CommunityMemberService.removeMemberFromCommunity({
                groupId: input.groupId,
                memberId,
                currentUserId,
                entityId,
                reason: input.reason || "Bulk removal",
                db,
              });
            results.push({ memberId, success: true, result });
          } catch (error: any) {
            results.push({
              memberId,
              success: false,
              error: error?.message,
            });
          }
        }

        return {
          success: true,
          results,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // =============== MEMBER ACTIVITY TRACKING ===============

    async updateMemberActivity(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);
        const currentUserId = userId;

        // Update member's last activity timestamp
        await db
          .update(groupMember)
          .set({
            lastActivityAt: new Date(),
          })
          .where(
            and(
              eq(groupMember.groupId, input.groupId),
              eq(groupMember.userId, currentUserId)
            )
          );

        return {
          success: true,
          message: "Member activity updated",
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async respondToJoinRequest(_: any, { input }: any, context: AuthContext) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        return await CommunityMemberService.handleJoinRequest({
          groupId: input.groupId,
          requestId: input.requestId,
          action: input.action, // "ACCEPT" | "REJECT"
          currentUserId: userId,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async reportCommunity(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        return await CommunityActionsService.reportCommunity({
          communityId: input.communityId,
          reporterId: userId,
          reason: input.reason,
          description: input.description,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async withdrawJoinRequest(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        return CommunityActionsService.withdrawJoinRequest({
          userId,
          groupId: input.groupId,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    // ...existing mutations...
  },
};

// Example resolver implementations
const communityMemberResolvers: any = {
  Query: {
    async getCommunityMemberStats(_: any, { input }: any, context: any) {
      try {
        const { id: viewerId, entityId, db } = await checkAuth(context);

        return CommunityMemberService.getCommunityMemberStats({
          memberId: input.memberId,
          communityId: input.communityId,
          viewerId,
          entityId,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunityMembersWithStats(_: any, { input }: any, context: any) {
      try {
        const { id: viewerId, entityId, db } = await checkAuth(context);

        return CommunityMemberService.getCommunityMembersWithStats({
          communityId: input.communityId,
          viewerId,
          entityId,
          limit: input.limit || 20,
          offset: input.offset || 0,
          sortBy: input.sortBy || "engagementScore",
          sortOrder: input.sortOrder || "desc",
          role: input.role,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunityLeaderboard(_: any, { input }: any, context: any) {
      try {
        const { id: viewerId, entityId, db } = await checkAuth(context);

        return CommunityMemberService.getCommunityLeaderboard({
          communityId: input.communityId,
          viewerId,
          entityId,
          period: input.period || "all",
          category: input.category || "overall",
          limit: input.limit || 10,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { communitiesResolvers, communityMemberResolvers };
