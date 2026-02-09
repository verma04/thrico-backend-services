import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { eq, and, sql, desc, count, inArray, asc } from "drizzle-orm";
import {
  groups,
  groupMember,
  groupRating,
  groupRatingSummary,
  communityActivityLog,
  user,
  AppDatabase,
} from "@thrico/database";
import { CommunityNotificationPublisher } from "./notification-publisher";

export class CommunityRatingService {
  static async updateCommunityRating({
    ratingId,
    userId,
    groupId,
    entityId,
    rating,
    review,
    db,
  }: {
    ratingId: string;
    userId: string;
    groupId: string;
    entityId: string;
    rating: "1" | "2" | "3" | "4" | "5";
    review?: string;
    db: AppDatabase;
  }) {
    try {
      if (!ratingId || !userId || !groupId || !entityId || !rating) {
        throw new GraphQLError("Missing required fields", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const existingRating = await db.query.groupRating.findFirst({
        where: and(
          eq(groupRating.id, ratingId),
          eq(groupRating.groupId, groupId),
          eq(groupRating.userId, userId),
          eq(groupRating.entityId, entityId),
        ),
      });

      if (!existingRating) {
        throw new GraphQLError(
          "Rating not found or you don't have permission to update it",
          {
            extensions: { code: "NOT_FOUND" },
          },
        );
      }

      let ratingRecord;
      await db.transaction(async (tx: any) => {
        [ratingRecord] = await tx
          .update(groupRating)
          .set({
            rating,
            review,
            updatedAt: new Date(),
          })
          .where(eq(groupRating.id, ratingId))
          .returning();

        await tx.insert(communityActivityLog).values({
          groupId,
          userId,
          type: "RATING_EVENT",
          status: "UPDATED",
          details: {
            ratingId: ratingRecord.id,
            rating,
            hasReview: !!review,
          },
        });

        await this.updateRatingSummary({ groupId, db: tx });
      });

      return ratingRecord;
    } catch (error) {
      log.error("Error in updateCommunityRating", error);
      throw error;
    }
  }

  static async getCommunityRatingSummary({
    groupId,
    db,
  }: {
    groupId: string;
    db: any;
  }) {
    try {
      const summary = await db.query.groupRatingSummary.findFirst({
        where: eq(groupRatingSummary.groupId, groupId),
      });

      if (!summary) {
        // Create summary if it doesn't exist
        await this.updateRatingSummary({ groupId, db });
        return await db.query.groupRatingSummary.findFirst({
          where: eq(groupRatingSummary.groupId, groupId),
        });
      }

      return summary;
    } catch (error) {
      log.error("Error in getCommunityRatingSummary", error);
      throw error;
    }
  }
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
          },
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
          eq(groupMember.memberStatusEnum, "ACCEPTED"),
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
            eq(groupRating.entityId, entityId),
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

      // Trigger Notification
      try {
        const ratingUser = await db.query.user.findFirst({
          where: eq(user.id, userId),
          columns: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        });

        if (ratingUser && !isUpdate) {
          CommunityNotificationPublisher.publishRatingReceived({
            userId,
            communityId: groupId,
            community,
            user: ratingUser,
            rating: parseInt(rating),
            db,
            entityId,
          });
        }
      } catch (notifError) {
        log.error("Failed to send rating notification", notifError);
      }

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
    cursor,
    limit = 10,
    sortBy = "newest",
    verifiedOnly = false,
    db,
  }: {
    groupId: string;
    entityId: string;
    currentUserId?: string;
    cursor?: string | null;
    limit?: number;
    sortBy?: "newest" | "oldest" | "highest" | "lowest" | "helpful";
    verifiedOnly?: boolean;
    db: AppDatabase;
  }) {
    try {
      if (!groupId || !entityId) {
        throw new GraphQLError("Group ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting community ratings", {
        groupId,
        cursor,
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
            inArray(groupMember.role, ["ADMIN", "MANAGER"]),
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

      // Cursor-based filtering
      if (cursor) {
        const cursorDate = new Date(cursor);
        if (sortBy === "oldest") {
          whereConditions.push(sql`${groupRating.createdAt} > ${cursorDate}`);
        } else {
          // Default to newest
          whereConditions.push(sql`${groupRating.createdAt} < ${cursorDate}`);
        }
      }

      const [totalCountResult] = await db
        .select({ value: count() })
        .from(groupRating)
        .where(
          and(
            ...whereConditions.filter(
              (c) => !c.toString().includes("createdAt"),
            ),
          ),
        ); // count should be total, not remains

      // Wait, totalCount should be total available without cursor
      const [actualTotalCount] = await db
        .select({ value: count() })
        .from(groupRating)
        .where(
          and(
            eq(groupRating.groupId, groupId),
            eq(groupRating.entityId, entityId),
            ...(verifiedOnly ? [eq(groupRating.isVerified, true)] : []),
          ),
        );

      let orderByClause;
      switch (sortBy) {
        case "oldest":
          orderByClause = [asc(groupRating.createdAt), asc(groupRating.id)];
          break;
        case "highest":
          orderByClause = [
            desc(groupRating.rating),
            desc(groupRating.createdAt),
            desc(groupRating.id),
          ];
          break;
        case "lowest":
          orderByClause = [
            asc(groupRating.rating),
            desc(groupRating.createdAt),
            desc(groupRating.id),
          ];
          break;
        case "helpful":
          orderByClause = [
            desc(groupRating.helpfulCount),
            desc(groupRating.createdAt),
            desc(groupRating.id),
          ];
          break;
        default:
          orderByClause = [desc(groupRating.createdAt), desc(groupRating.id)];
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
            id: groupRating.userId,
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
        .leftJoin(user, eq(user.id, groupRating.userId))
        .where(and(...whereConditions))
        .orderBy(...orderByClause)
        .limit(limit + 1);

      const hasNextPage = ratings.length > limit;
      const nodes = hasNextPage ? ratings.slice(0, limit) : ratings;

      const edges = nodes.map((rating: any) => ({
        cursor:
          rating.createdAt instanceof Date
            ? rating.createdAt.toISOString()
            : new Date(rating.createdAt).toISOString(),
        node: {
          ...rating,
          rating: parseInt(rating.rating), // Ensure rating is integer
        },
      }));

      log.info("Community ratings retrieved", {
        groupId,
        count: nodes.length,
        total: actualTotalCount?.value || 0,
      });

      let canAddRating = false;
      let currentUserRating = null;

      if (currentUserId) {
        const membership = await db.query.groupMember.findFirst({
          where: and(
            eq(groupMember.groupId, groupId),
            eq(groupMember.userId, currentUserId),
            eq(groupMember.memberStatusEnum, "ACCEPTED"),
          ),
        });
        canAddRating = !!membership;

        currentUserRating = await db.query.groupRating.findFirst({
          where: and(
            eq(groupRating.groupId, groupId),
            eq(groupRating.userId, currentUserId),
            eq(groupRating.entityId, entityId),
          ),
        });

        if (currentUserRating) {
          (currentUserRating as any).rating = parseInt(
            currentUserRating.rating,
          );
        }
      }

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: actualTotalCount?.value || 0,
        metadata: {
          isCurrentUserAdmin,
          canAddRating,
          currentUserRating,
          summary: await this.getCommunityRatingSummary({ groupId, db }),
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
        0,
      );
      const verifiedRatingSum = verifiedRatings.reduce(
        (sum: number, r: any) => sum + parseInt(r.rating),
        0,
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
          },
        );
      }

      log.debug("Deleting community rating", { ratingId, userId, groupId });

      const rating = await db.query.groupRating.findFirst({
        where: and(
          eq(groupRating.id, ratingId),
          eq(groupRating.groupId, groupId),
          eq(groupRating.entityId, entityId),
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
            inArray(groupMember.role, ["ADMIN", "MANAGER"]),
          ),
        });

        if (!hasAdminPermission) {
          throw new GraphQLError(
            "You can only delete your own ratings or must be an admin/manager",
            {
              extensions: { code: "FORBIDDEN" },
            },
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
