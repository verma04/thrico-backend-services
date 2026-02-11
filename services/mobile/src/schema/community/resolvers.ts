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
import { logger } from "@thrico/logging";

interface AuthContext {
  db: AppDatabase;
  id: string;
  entityId?: string;
  userId?: string;
}

const communitiesResolvers: any = {
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
        logger.error(`Error in getCommunityDetails: ${error}`);
        throw error;
      }
    },

    async trackCommunityView(_: any, { input }: any, context: any) {
      try {
        const { db, id, userId } = await checkAuth(context);

        logger.info(`Tracking community view for group ${input.id}`);
        await BaseCommunityService.trackCommunityView({
          userId,
          groupId: input.id,
          db,
        });

        return true;
      } catch (error) {
        logger.error(`Error in trackCommunityView: ${error}`);
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
              sql`${user.updatedAt} >= NOW() - INTERVAL '30 days'`,
            ),
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
            "YYYY-MM-DD HH:mm:ss",
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
        logger.error(`Error in getCommunityAnalytics: ${error}`);
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
        logger.info(
          `Fetched ${result.length} join requests for group ${groupId}`,
        );
        return result;
      } catch (error) {
        logger.error(`Error in getGroupJoinRequests: ${error}`);
        throw error;
      }
    },
    async getCommunitiesModeType(_: any, {}: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        // return communityTypeEnum?.enumValues;
      } catch (error) {
        logger.error(`Error in getCommunitiesModeType: ${error}`);
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
            eq(groupMember.role, "ADMIN"),
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
        logger.info(`Fetched admin info for group ${groupId}`);
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
        logger.error(`Error in getCommunityAboutById: ${error}`);
        throw error;
      }
    },
    async getCommunityReportReasons(_: any, {}: any, context: AuthContext) {
      try {
        context;

        // Return available report reasons
        return Object.values({
          INAPPROPRIATE_CONTENT: "Inappropriate Content",
          SPAM: "Spam",
          HARASSMENT: "Harassment",
          FAKE_COMMUNITY: "Fake Community",
          VIOLENCE: "Violence",
          HATE_SPEECH: "Hate Speech",
          SCAM_FRAUD: "Scam/Fraud",
          COPYRIGHT_VIOLATION: "Copyright Violation",
          MISINFORMATION: "Misinformation",
          OTHER: "Other",
        }).map((label, index) => ({
          value: Object.keys({
            INAPPROPRIATE_CONTENT: "Inappropriate Content",
            SPAM: "Spam",
            HARASSMENT: "Harassment",
            FAKE_COMMUNITY: "Fake Community",
            VIOLENCE: "Violence",
            HATE_SPEECH: "Hate Speech",
            SCAM_FRAUD: "Scam/Fraud",
            COPYRIGHT_VIOLATION: "Copyright Violation",
            MISINFORMATION: "Misinformation",
            OTHER: "Other",
          })[index],
          label,
        }));
      } catch (error) {
        logger.error(`Error in getCommunityReportReasons: ${error}`);
        throw error;
      }
    },

    async getCommunitiesPrivacyEnum(_: any, {}: any, context: any) {
      try {
        const { id } = await checkAuth(context);

        return privacyEnum?.enumValues;
      } catch (error) {
        logger.error(`Error in getCommunitiesPrivacyEnum: ${error}`);
        throw error;
      }
    },

    async getAllCommunities(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const filters = input?.filters || {};
        const searchTerm = input?.searchTerm;

        return CommunityQueryService.getAllCommunities({
          currentUserId,
          entityId,
          db,
          cursor,
          limit,
          searchTerm,
          filters,
        });
      } catch (error) {
        logger.error(`Error in getAllCommunities: ${error}`);
        throw error;
      }
    },

    async getCommunitiesByUserId(_: any, { input }: any, context: any) {
      try {
        const { entityId, db } = await checkAuth(context);

        return CommunityQueryService.getCommunitiesByUserId({
          entityId,
          db,
          ...input,
        });
      } catch (error) {
        logger.error(`Error in getCommunitiesByUserId: ${error}`);
        throw error;
      }
    },

    async getMyOwnedCommunities(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        const community = await CommunityQueryService.getMyOwnedCommunities({
          currentUserId,
          entityId,
          db,
          ...input,
        });

        return community;
      } catch (error) {
        logger.error(`Error in getMyOwnedCommunities: ${error}`);
        throw error;
      }
    },

    async getFeaturedCommunities(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        return CommunityQueryService.getFeaturedCommunities({
          currentUserId,
          entityId,
          db,
          ...input,
        });
      } catch (error) {
        logger.error(`Error in getFeaturedCommunities: ${error}`);
        throw error;
      }
    },

    async getTrendingCommunities(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        return CommunityQueryService.getTrendingCommunities({
          currentUserId,
          entityId,
          db,
          ...input,
        });
      } catch (error) {
        logger.error(`Error in getTrendingCommunities: ${error}`);
        throw error;
      }
    },

    async getMyJoinedCommunities(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        return CommunityQueryService.getMyJoinedCommunities({
          currentUserId,
          entityId,
          db,
          ...input,
        });
      } catch (error) {
        logger.error(`Error in getMyCommunities: ${error}`);
        throw error;
      }
    },

    async getSavedCommunities(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId } = await checkAuth(context);
        const currentUserId = userId;

        return CommunityQueryService.getMySavedCommunities({
          currentUserId,
          entityId,
          db,
          ...input,
        });
      } catch (error) {
        logger.error(`Error in getSavedCommunities: ${error}`);
        throw error;
      }
    },

    async getCommunityRatings(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        return CommunityRatingService.getCommunityRatings({
          groupId: input.communityId,
          entityId,
          currentUserId: userId,
          cursor: input.cursor,
          limit: input.limit || 10,
          sortBy: input.sortBy || "newest",
          verifiedOnly: input.verifiedOnly || false,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunityRatingSummary(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        return CommunityRatingService.getCommunityRatingSummary({
          groupId: input.id,
          db,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getPendingFeedCommunities(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        const { cursor, limit } = input;

        const data = await CommunityActionsService.getCommunityFeeds({
          communityId: input?.id,
          currentUserId: userId,
          status: "PENDING",
          limit,
          cursor,
          entityId: entityId,
          db,
        });

        return data;
      } catch (error) {
        logger.error(`Error in getPendingFeedCommunities: ${error}`);
        throw error;
      }
    },

    async getAllPinnedFeeds(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        const { cursor, limit } = input;

        // return CommunityActionsService.getAllPinnedFeeds({
        //   communityId: input?.id,
        //   currentUserId: userId,
        //   limit,
        //   cursor,
        //   entityId,
        //   db,
        // });
      } catch (error) {
        logger.error(`Error in getAllPinnedFeeds: ${error}`);
        throw error;
      }
    },

    async getAllFlaggedFeeds(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        const { cursor, limit } = input;

        // return CommunityActionsService.getAllFlaggedFeeds({
        //   communityId: input?.id,
        //   currentUserId: userId,
        //   limit,
        //   cursor,
        //   entityId,
        //   db,
        // });
      } catch (error) {
        logger.error(`Error in getAllFlaggedFeeds: ${error}`);
        throw error;
      }
    },

    async getMyJoinedCommunitiesFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId } = await checkAuth(context);
        const { cursor, limit } = input;

        return CommunityActionsService.getMyJoinedCommunitiesFeed({
          userId,
          entityId,
          limit,
          cursor,
          db,
        });
      } catch (error) {
        logger.error(`Error in getMyJoinedCommunitiesFeed: ${error}`);
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
        logger.error(`Error in createCommunities: ${error}`);
        throw error;
      }
    },

    async deleteCommunityFeed(_: any, { input }: any, context: any) {
      const { userId, db } = await checkAuth(context);

      logger.info(`Deleting community feed: ${input.id}`);
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
        logger.error(`Error in deleteCommunityFeed: ${error}`);
        throw error;
      }
    },

    async deleteFeedCommunities(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        return CommunityActionsService.deleteFeedCommunities({
          feedId: input.id,
          userId,
          db,
        });
      } catch (error) {
        logger.error(`Error in deleteFeedCommunities: ${error}`);
        throw error;
      }
    },

    async pinCommunityFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        return CommunityActionsService.togglePinFeed({
          userId,
          feedId: input.feedId,
          groupId: input.communityId,
          db,
          action: "PIN",
        });
      } catch (error) {
        logger.error(`Error in pinCommunityFeed: ${error}`);
        throw error;
      }
    },

    async unpinCommunityFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        return CommunityActionsService.togglePinFeed({
          userId,
          feedId: input.feedId,
          groupId: input.communityId,
          db,
          action: "UNPIN",
        });
      } catch (error) {
        logger.error(`Error in unpinCommunityFeed: ${error}`);
        throw error;
      }
    },

    async approveCommunityFeed(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        return CommunityActionsService.approveCommunityFeed({
          userId,
          feedId: input.feedId,
          communityId: input.communityId,
          db,
        });
      } catch (error) {
        logger.error(`Error in approveCommunityFeed: ${error}`);
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
        logger.error(`Error in editCommunity: ${error}`);
        throw error;
      }
    },

    async joinCommunity(_: any, { input }: any, context: any) {
      try {
        const { id, entityId, db, userId } = await checkAuth(context);

        return CommunityActionsService.joinCommunity({
          userId,
          groupId: input.id,
          reason: input.reason,
          entityId,
          db,
        });
      } catch (error) {
        logger.error(`Error in joinCommunity: ${error}`);
        throw error;
      }
    },

    async wishListCommunity(_: any, { input }: any, context: any) {
      const { db, id, entityId, userId } = await checkAuth(context);

      logger.info(`Toggling community wishlist for group: ${input.id}`);
      try {
        return CommunityActionsService.toggleCommunityWishlist({
          userId,
          groupId: input.id,
          entityId,
          db,
        });
      } catch (error) {
        logger.error(`Error in wishListCommunity: ${error}`);
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
        logger.error(`Error in toggleCommunityWishlist: ${error}`);
        throw error;
      }
    },

    // =============== RATING SYSTEM MUTATIONS ===============

    async addCommunityRating(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);

        return CommunityRatingService.addCommunityRating({
          userId,
          groupId: input.communityId,
          entityId,
          rating: input.rating.toString() as "1" | "2" | "3" | "4" | "5",
          review: input.review,
          db,
        });
      } catch (error) {
        logger.error(`Error in addCommunityRating: ${error}`);
        throw error;
      }
    },

    async updateCommunityRating(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        return CommunityRatingService.updateCommunityRating({
          ratingId: input.id,
          userId,
          groupId: input.communityId,
          entityId,
          rating: input.rating.toString() as "1" | "2" | "3" | "4" | "5",
          review: input.review,
          db,
        });
      } catch (error) {
        logger.error(`Error in updateCommunityRating: ${error}`);
        throw error;
      }
    },

    async deleteCommunityRating(_: any, { input }: any, context: any) {
      try {
        const { db, id, userId, entityId } = await checkAuth(context);

        return CommunityRatingService.deleteCommunityRating({
          ratingId: input.id,
          userId,
          db,
          groupId: input.communityId,
          entityId: entityId,
        });
      } catch (error) {
        logger.error(`Error in deleteCommunityRating: ${error}`);
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
        logger.error(`Error in voteRatingHelpfulness: ${error}`);
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
        logger.error(`Error in verifyRating: ${error}`);
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
        logger.error(`Error in addCommunityMedia: ${error}`);
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
        logger.error(`Error in updateCommunityMedia: ${error}`);
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
        logger.error(`Error in deleteCommunityMedia: ${error}`);
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
        logger.error(`Error in reorderCommunityMedia: ${error}`);
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
        logger.error(`Error in updateMemberRole: ${error}`);
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
        logger.error(`Error in removeMemberFromCommunity: ${error}`);
        throw error;
      }
    },

    async leaveCommunity(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);
        const currentUserId = userId;

        logger.info(`User ${currentUserId} leaving community ${input.groupId}`);
        // Use the same service method with memberId = currentUserId
        return CommunityActionsService.leaveCommunity({
          groupId: input.groupId,
          userId: currentUserId,
          db,
        });
      } catch (error) {
        logger.error(`Error in leaveCommunity: ${error}`);
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
        logger.error(`Error in bulkUpdateMemberRoles: ${error}`);
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
        logger.error(`Error in bulkRemoveMembers: ${error}`);
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
              eq(groupMember.userId, currentUserId),
            ),
          );

        return {
          success: true,
          message: "Member activity updated",
        };
      } catch (error) {
        logger.error(`Error in updateMemberActivity: ${error}`);
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
        logger.error(`Error in respondToJoinRequest: ${error}`);
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
        logger.error(`Error in reportCommunity: ${error}`);
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
        logger.error(`Error in withdrawJoinRequest: ${error}`);
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
        logger.error(`Error in getCommunityMemberStats: ${error}`);
        throw error;
      }
    },
    async getCommunityMembersWithRoles(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId, userId } = await checkAuth(context);
        const currentUserId = userId;

        return CommunityMemberService.getCommunityMembersWithRoles({
          groupId: input.groupId,
          currentUserId,
          entityId,
          db,
          cursor: input.cursor,
          limit: input.limit || 20,
          role: input.role,
          searchTerm: input.searchTerm,
          sortBy: input.sortBy || "newest",
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
        logger.error(`Error in getCommunityMembersWithStats: ${error}`);
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
        logger.error(`Error in getCommunityLeaderboard: ${error}`);
        throw error;
      }
    },

    async getPendingJoinRequests(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        return await CommunityMemberService.getPendingJoinRequests({
          groupId: input.id,
          currentUserId: userId,
          entityId,
          db,
          cursor: input.cursor,
          limit: input.limit || 20,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getPendingJoinRequestsCount(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        return await CommunityMemberService.getPendingJoinRequestsCount({
          groupId: input.id,
          currentUserId: userId,
          entityId,
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
