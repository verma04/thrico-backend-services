import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, sql, avg, count, desc } from "drizzle-orm";

export class ListingRatingService {
  static async createRating({
    db,
    input,
  }: {
    db: any;
    input: {
      listingId: string;
      sellerId: string;
      ratedBy: string;
      rating: number;
      review?: string;
    };
  }) {
    try {
      if (
        !input.listingId ||
        !input.sellerId ||
        !input.ratedBy ||
        !input.rating
      ) {
        throw new GraphQLError(
          "Listing ID, Seller ID, Rated By, and Rating are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      if (input.rating < 1 || input.rating > 5) {
        throw new GraphQLError("Rating must be between 1 and 5.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (input.sellerId === input.ratedBy) {
        throw new GraphQLError("You cannot rate yourself.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Creating rating", {
        listingId: input.listingId,
        sellerId: input.sellerId,
        ratedBy: input.ratedBy,
      });

      await this.validateListingAndSeller(db, input.listingId, input.sellerId);

      const existingRating = await this.findExistingRating(
        db,
        input.listingId,
        input.ratedBy
      );

      if (existingRating) {
        throw new GraphQLError(
          "You have already rated this seller for this listing. Use update instead.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      const [rating] = await db
        .insert(db.schema.listingRating)
        .values({
          listingId: input.listingId,
          sellerId: input.sellerId,
          ratedBy: input.ratedBy,
          rating: input.rating,
          review: input.review,
        })
        .returning();

      log.info("Rating created successfully", {
        ratingId: rating.id,
        listingId: input.listingId,
      });

      return {
        success: true,
        ratingId: rating.id,
        message: "Rating submitted successfully",
      };
    } catch (error) {
      log.error("Error in createRating", {
        error,
        listingId: input?.listingId,
      });
      throw error;
    }
  }

  static async updateRating({
    db,
    input,
  }: {
    db: any;
    input: {
      ratingId: string;
      rating: number;
      review?: string;
    };
  }) {
    try {
      if (!input.ratingId || !input.rating) {
        throw new GraphQLError("Rating ID and Rating are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (input.rating < 1 || input.rating > 5) {
        throw new GraphQLError("Rating must be between 1 and 5.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating rating", {
        ratingId: input.ratingId,
        rating: input.rating,
      });

      const [updatedRating] = await db
        .update(db.schema.listingRating)
        .set({
          rating: input.rating,
          review: input.review,
          updatedAt: new Date(),
        })
        .where(eq(db.schema.listingRating.id, input.ratingId))
        .returning();

      if (!updatedRating) {
        throw new GraphQLError("Rating not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("Rating updated successfully", { ratingId: updatedRating.id });

      return {
        success: true,
        ratingId: updatedRating.id,
        message: "Rating updated successfully",
      };
    } catch (error) {
      log.error("Error in updateRating", { error, ratingId: input?.ratingId });
      throw error;
    }
  }

  static async getSellerRatings({
    db,
    sellerId,
    page = 1,
    limit = 10,
  }: {
    db: any;
    sellerId: string;
    page?: number;
    limit?: number;
  }) {
    try {
      if (!sellerId) {
        throw new GraphQLError("Seller ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting seller ratings", { sellerId, page, limit });

      const offset = (page - 1) * limit;

      const ratings = await db
        .select({
          id: db.schema.listingRating.id,
          rating: db.schema.listingRating.rating,
          review: db.schema.listingRating.review,
          createdAt: db.schema.listingRating.createdAt,
          listing: {
            id: db.schema.marketPlace.id,
            title: db.schema.marketPlace.title,
          },
          ratedBy: {
            id: db.schema.user.id,
            email: db.schema.user.email,
          },
        })
        .from(db.schema.listingRating)
        .leftJoin(
          db.schema.marketPlace,
          eq(db.schema.listingRating.listingId, db.schema.marketPlace.id)
        )
        .leftJoin(
          db.schema.user,
          eq(db.schema.listingRating.ratedBy, db.schema.user.id)
        )
        .where(eq(db.schema.listingRating.sellerId, sellerId))
        .orderBy(desc(db.schema.listingRating.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(db.schema.listingRating)
        .where(eq(db.schema.listingRating.sellerId, sellerId));

      log.info("Seller ratings retrieved", {
        sellerId,
        count: ratings.length,
        total,
      });

      return {
        ratings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          limit,
        },
      };
    } catch (error) {
      log.error("Error in getSellerRatings", { error, sellerId });
      throw error;
    }
  }

  static async getSellerRatingStats({
    db,
    sellerId,
  }: {
    db: any;
    sellerId: string;
  }) {
    try {
      if (!sellerId) {
        throw new GraphQLError("Seller ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting seller rating stats", { sellerId });

      const [stats] = await db
        .select({
          averageRating: avg(db.schema.listingRating.rating),
          totalRatings: count(),
        })
        .from(db.schema.listingRating)
        .where(eq(db.schema.listingRating.sellerId, sellerId));

      const distribution = await db
        .select({
          rating: db.schema.listingRating.rating,
          count: count(),
        })
        .from(db.schema.listingRating)
        .where(eq(db.schema.listingRating.sellerId, sellerId))
        .groupBy(db.schema.listingRating.rating);

      const ratingDistribution: any = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      distribution.forEach((item: any) => {
        if (item.rating >= 1 && item.rating <= 5) {
          ratingDistribution[item.rating] = item.count;
        }
      });

      log.info("Seller rating stats retrieved", {
        sellerId,
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
      });

      return {
        averageRating: parseFloat(stats.averageRating || "0"),
        totalRatings: stats.totalRatings || 0,
        ratingDistribution,
      };
    } catch (error) {
      log.error("Error in getSellerRatingStats", { error, sellerId });
      throw error;
    }
  }

  static async deleteRating({
    db,
    ratingId,
    userId,
  }: {
    db: any;
    ratingId: string;
    userId: string;
  }) {
    try {
      if (!ratingId || !userId) {
        throw new GraphQLError("Rating ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Deleting rating", { ratingId, userId });

      const [deleted] = await db
        .delete(db.schema.listingRating)
        .where(
          and(
            eq(db.schema.listingRating.id, ratingId),
            eq(db.schema.listingRating.ratedBy, userId)
          )
        )
        .returning();

      if (!deleted) {
        throw new GraphQLError("Rating not found or unauthorized.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("Rating deleted successfully", { ratingId, userId });

      return {
        success: true,
        message: "Rating deleted successfully",
      };
    } catch (error) {
      log.error("Error in deleteRating", { error, ratingId, userId });
      throw error;
    }
  }

  private static async validateListingAndSeller(
    db: any,
    listingId: string,
    sellerId: string
  ) {
    const listing = await db.query.marketPlace.findFirst({
      where: (marketPlace: any, { eq }: any) => eq(marketPlace.id, listingId),
      columns: {
        id: true,
        postedBy: true,
      },
    });

    if (!listing) {
      throw new GraphQLError("Listing not found.", {
        extensions: { code: "NOT_FOUND" },
      });
    }

    if (listing.postedBy !== sellerId) {
      throw new GraphQLError("Seller mismatch.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
  }

  private static async findExistingRating(
    db: any,
    listingId: string,
    ratedBy: string
  ) {
    return await db.query.listingRating.findFirst({
      where: (listingRating: any, { and, eq }: any) =>
        and(
          eq(listingRating.listingId, listingId),
          eq(listingRating.ratedBy, ratedBy)
        ),
    });
  }
}
