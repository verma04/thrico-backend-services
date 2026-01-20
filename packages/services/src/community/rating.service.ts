import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { eq, and, sql, desc, count, inArray } from "drizzle-orm";
import {
  groups,
  groupMember,
  groupRating,
  groupRatingSummary,
  communityActivityLog,
  user,
} from "@thrico/database";

export class CommunityRatingService {
  static async addCommunityRating({
    userId,
    groupId,
    entityId,
    rating,
    review,
    db,
  }: {
    userId: string;
    groupId: string;
    entityId: string;
    rating: "1" | "2" | "3" | "4" | "5";
    review?: string;
    db: any;
  }) {
    try {
      if (!userId || !groupId || !entityId || !rating) {
        throw new GraphQLError(
          "User ID, Group ID, Entity ID, and Rating are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Adding community rating", { userId, groupId, rating });

      const community = await db.query.groups.findFirst({
        where: and(eq(groups.id, groupId), eq(groups.entity, entityId)),
      });

      if (!community) {
        throw new GraphQLError("Community not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (!community.enableRatingsAndReviews) {
        throw new GraphQLError("Ratings are not enabled for this community", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const membership = await db.query.groupMember.findFirst({
        where: and(
          eq(groupMember.groupId, groupId),
          eq(groupMember.userId, userId),
          eq(groupMember.memberStatusEnum, "ACCEPTED")
        ),
      });

      if (!membership) {
        throw new GraphQLError("Only community members can rate", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      let ratingRecord;
      let isUpdate = false;

      await db.transaction(async (tx: any) => {
        const existingRating = await tx.query.groupRating.findFirst({
          where: and(
            eq(groupRating.groupId, groupId),
            eq(groupRating.userId, userId),
            eq(groupRating.entityId, entityId)
          ),
        });

        if (existingRating) {
          [ratingRecord] = await tx
            .update(groupRating)
            .set({
              rating,
              review,
              updatedAt: new Date(),
            })
            .where(eq(groupRating.id, existingRating.id))
            .returning();
          isUpdate = true;
        } else {
          [ratingRecord] = await tx
            .insert(groupRating)
            .values({
              userId,
              groupId,
              entityId,
              rating,
              review,
            })
            .returning();
        }

        await tx.insert(communityActivityLog).values({
          groupId,
          userId,
          type: "RATING_EVENT",
          status: isUpdate ? "UPDATED" : "CREATED",
          details: {
            ratingId: ratingRecord.id,
            rating: rating,
            hasReview: !!review,
          },
        });

        await this.updateRatingSummary({ groupId, db: tx });
      });

      //   log.info("Community rating added", {
      //     userId,
      //     groupId,
      //     ratingId: "sdsd"
      //     isUpdate,
      //   });

      return ratingRecord;
    } catch (error) {
      log.error("Error in addCommunityRating", {
        error,
        userId,
        groupId,
        entityId,
        rating,
      });
      throw error;
    }
  }

  static async getCommunityRatings({
    groupId,
    entityId,
    currentUserId,
    page = 1,
    limit = 10,
    sortBy = "newest",
    verifiedOnly = false,
    db,
  }: {
    groupId: string;
    entityId: string;
    currentUserId?: string;
    page?: number;
    limit?: number;
    sortBy?: "newest" | "oldest" | "highest" | "lowest" | "helpful";
    verifiedOnly?: boolean;
    db: any;
  }) {
    try {
      if (!groupId || !entityId) {
        throw new GraphQLError("Group ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting community ratings", {
        groupId,
        page,
        limit,
        sortBy,
        verifiedOnly,
      });

      let isCurrentUserAdmin = false;
      if (currentUserId) {
        const currentUserMembership = await db.query.groupMember.findFirst({
          where: and(
            eq(groupMember.groupId, groupId),
            eq(groupMember.userId, currentUserId),
            eq(groupMember.memberStatusEnum, "ACCEPTED"),
            inArray(groupMember.role, ["ADMIN", "MANAGER"])
          ),
        });
        isCurrentUserAdmin = !!currentUserMembership;
      }

      const whereConditions = [
        eq(groupRating.groupId, groupId),
        eq(groupRating.entityId, entityId),
      ];

      if (verifiedOnly) {
        whereConditions.push(eq(groupRating.isVerified, true));
      }

      const [totalCount] = await db
        .select({ value: count() })
        .from(groupRating)
        .where(and(...whereConditions));

      const offset = (page - 1) * limit;

      let orderByClause;
      switch (sortBy) {
        case "oldest":
          orderByClause = groupRating.createdAt;
          break;
        case "highest":
          orderByClause = desc(groupRating.rating);
          break;
        case "lowest":
          orderByClause = groupRating.rating;
          break;
        case "helpful":
          orderByClause = desc(groupRating.helpfulCount);
          break;
        default:
          orderByClause = desc(groupRating.createdAt);
      }

      const ratings = await db
        .select({
          id: groupRating.id,
          rating: groupRating.rating,
          review: groupRating.review,
          isVerified: groupRating.isVerified,
          verifiedBy: groupRating.verifiedBy,
          verifiedAt: groupRating.verifiedAt,
          helpfulCount: groupRating.helpfulCount,
          unhelpfulCount: groupRating.unhelpfulCount,
          createdAt: groupRating.createdAt,
          updatedAt: groupRating.updatedAt,
          user: {
            id: groupMember.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          isRatingByCurrentUser: currentUserId
            ? sql<boolean>`${groupRating.userId} = ${currentUserId}`
            : sql<boolean>`false`,
          canModerate: sql<boolean>`${isCurrentUserAdmin}`,
        })
        .from(groupRating)
        .leftJoin(groupMember, eq(groupMember.userId, groupRating.userId))
        .leftJoin(user, eq(user.id, groupMember.userId))
        .where(and(...whereConditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(totalCount.value / limit);

      log.info("Community ratings retrieved", {
        groupId,
        count: ratings.length,
        total: totalCount.value,
      });

      return {
        ratings,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalCount.value,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        metadata: {
          isCurrentUserAdmin,
        },
      };
    } catch (error) {
      log.error("Error in getCommunityRatings", { error, groupId, entityId });
      throw error;
    }
  }

  static async updateRatingSummary({
    groupId,
    db,
  }: {
    groupId: string;
    db: any;
  }) {
    try {
      const allRatings = await db
        .select({
          rating: groupRating.rating,
          isVerified: groupRating.isVerified,
        })
        .from(groupRating)
        .where(eq(groupRating.groupId, groupId));

      const verifiedRatings = allRatings.filter((r: any) => r.isVerified);

      const totalRatings = allRatings.length;
      const totalVerifiedRatings = verifiedRatings.length;

      const ratingSum = allRatings.reduce(
        (sum: number, r: any) => sum + parseInt(r.rating),
        0
      );
      const verifiedRatingSum = verifiedRatings.reduce(
        (sum: number, r: any) => sum + parseInt(r.rating),
        0
      );

      const averageRating =
        totalRatings > 0 ? (ratingSum / totalRatings).toFixed(2) : "0.00";
      const averageVerifiedRating =
        totalVerifiedRatings > 0
          ? (verifiedRatingSum / totalVerifiedRatings).toFixed(2)
          : "0.00";

      const distribution: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const verifiedDistribution: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      allRatings.forEach((rating: any) => {
        const r = parseInt(rating.rating);
        distribution[r]++;
        if (rating.isVerified) {
          verifiedDistribution[r]++;
        }
      });

      const existingSummary = await db.query.groupRatingSummary.findFirst({
        where: eq(groupRatingSummary.groupId, groupId),
      });

      const summaryData = {
        groupId,
        totalRatings,
        averageRating,
        totalVerifiedRatings,
        averageVerifiedRating,
        oneStar: distribution[1],
        twoStar: distribution[2],
        threeStar: distribution[3],
        fourStar: distribution[4],
        fiveStar: distribution[5],
        verifiedOneStar: verifiedDistribution[1],
        verifiedTwoStar: verifiedDistribution[2],
        verifiedThreeStar: verifiedDistribution[3],
        verifiedFourStar: verifiedDistribution[4],
        verifiedFiveStar: verifiedDistribution[5],
        lastUpdated: new Date(),
      };

      if (existingSummary) {
        await db
          .update(groupRatingSummary)
          .set(summaryData)
          .where(eq(groupRatingSummary.groupId, groupId));
      } else {
        await db.insert(groupRatingSummary).values(summaryData);
      }

      await db
        .update(groups)
        .set({
          overallRating: averageRating,
          totalRatings,
          verifiedRating: averageVerifiedRating,
          totalVerifiedRatings,
        })
        .where(eq(groups.id, groupId));

      log.debug("Rating summary updated", {
        groupId,
        totalRatings,
        averageRating,
      });

      return summaryData;
    } catch (error) {
      log.error("Error in updateRatingSummary", { error, groupId });
      throw error;
    }
  }

  static async deleteCommunityRating({
    ratingId,
    userId,
    groupId,
    entityId,
    db,
  }: {
    ratingId: string;
    userId: string;
    groupId: string;
    entityId: string;
    db: any;
  }) {
    try {
      if (!ratingId || !userId || !groupId || !entityId) {
        throw new GraphQLError(
          "Rating ID, User ID, Group ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Deleting community rating", { ratingId, userId, groupId });

      const rating = await db.query.groupRating.findFirst({
        where: and(
          eq(groupRating.id, ratingId),
          eq(groupRating.groupId, groupId),
          eq(groupRating.entityId, entityId)
        ),
      });

      if (!rating) {
        throw new GraphQLError("Rating not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const isOwner = rating.userId === userId;

      if (!isOwner) {
        const hasAdminPermission = await db.query.groupMember.findFirst({
          where: and(
            eq(groupMember.groupId, groupId),
            eq(groupMember.userId, userId),
            inArray(groupMember.role, ["ADMIN", "MANAGER"])
          ),
        });

        if (!hasAdminPermission) {
          throw new GraphQLError(
            "You can only delete your own ratings or must be an admin/manager",
            {
              extensions: { code: "FORBIDDEN" },
            }
          );
        }
      }

      await db.transaction(async (tx: any) => {
        await tx.delete(groupRating).where(eq(groupRating.id, ratingId));

        await tx.insert(communityActivityLog).values({
          groupId,
          userId,
          type: "RATING_EVENT",
          status: "DELETED",
          details: {
            ratingId,
            deletedBy: userId,
            isOwnerDeletion: isOwner,
            rating: rating.rating,
            hadReview: !!rating.review,
          },
        });

        await this.updateRatingSummary({ groupId, db: tx });
      });

      log.info("Community rating deleted", { ratingId, userId, groupId });

      return {
        success: true,
        message: "Rating deleted successfully",
      };
    } catch (error) {
      log.error("Error in deleteCommunityRating", {
        error,
        ratingId,
        userId,
        groupId,
      });
      throw error;
    }
  }
}
