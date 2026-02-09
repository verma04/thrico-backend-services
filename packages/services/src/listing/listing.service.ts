import {
  currency,
  marketPlace,
  marketPlaceMedia,
  user,
  userFeed,
  listingContact,
  listingRating,
  listingReport,
  listingVerification,
  listingMessage,
} from "@thrico/database";

import { and, or, desc, eq, sql } from "drizzle-orm"; // Make sure 'or' is imported

import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";

import { type AppDatabase } from "@thrico/database";
import { ListingNotificationPublisher } from "./listing-notification-publisher";
import { log } from "@thrico/logging";
import { uploadFeedImage } from "../feed/upload.utils";
import { PaginationParams } from "../types";
import { GamificationEventService } from "../gamification/gamification-event.service";

interface ListingLocation {
  name?: string;
  state?: string;
  country?: string;
}

interface CreateListingInput {
  title: string;
  location?: ListingLocation;
  media?: any[];
  [key: string]: any;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface ListingEdge {
  cursor: string;
  node: any;
}

interface ListingResponse {
  edges: ListingEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface UserListingsResponse {
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    email: string;
    cover: string;
    rating: {
      averageRating: number;
      totalRatings: number;
    };
  };
  edges: ListingEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

interface ListingDetailResponse {
  listing: any;
  relatedListings?: any[];
}

interface ListingStatusInfo {
  isSold: boolean;
}

export class ListingService {
  /**
   * Get all listings for an entity with pagination and trending calculation
   */
  private static buildSearchCondition(search: string) {
    if (!search) return undefined;
    return or(
      sql`${marketPlace.title} ILIKE '%' || ${search} || '%'`,
      sql`${marketPlace.description} ILIKE '%' || ${search} || '%'`,
    );
  }

  static async getAllListings(
    db: AppDatabase,
    entityId: string,
    userId?: string,
    { cursor, limit = 10, search = "" }: PaginationParams = {},
  ): Promise<ListingResponse> {
    try {
      // Build conditions
      const conditions = [
        eq(marketPlace.entityId, entityId),
        eq(marketPlace.isExpired, false),
      ];

      if (cursor) {
        conditions.push(sql`${marketPlace.createdAt} < ${new Date(cursor)}`);
      }

      const searchCondition = this.buildSearchCondition(search);
      if (searchCondition) {
        conditions.push(searchCondition);
      }

      // Fetch trending conditions for trending calculation
      const trendingCondition = await this.getTrendingConditions(db, entityId);

      // Get total count
      const total = await this.getListingsCount(
        db,
        entityId,
        undefined,
        search,
      );

      // Fetch listings with details (limit + 1)
      const listings = await this.fetchListingsWithDetails(
        db,
        entityId,
        trendingCondition,
        limit + 1,
        0, // offset is 0 for cursor-based
        userId,
        search,
        cursor,
      );

      // Determine if there's a next page
      const hasNextPage = listings.length > limit;
      const nodes = hasNextPage ? listings.slice(0, limit) : listings;

      // Calculate trending listings
      const listingsWithTrending = this.calculateTrending(
        nodes,
        trendingCondition?.length,
      );

      // Build edges
      const edges = listingsWithTrending.map((listing: any) => ({
        cursor: listing.details.createdAt.toISOString(),
        node: listing,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getAllListings", error as Error);
      throw error;
    }
  }

  /**
   * Get all listings posted by a specific user
   */

  /**
   * Create a new listing
   */
  static async createListing(
    db: AppDatabase,
    entityId: string,
    userId: string,
    input: CreateListingInput,
  ): Promise<any> {
    try {
      // Upload media files
      const uploadedMedia = await this.handleMediaUpload(entityId, input.media);

      // Get entity settings
      const settings = await this.getEntitySettings(db, entityId);
      const autoApprove = settings?.autoApprove ?? false;

      // Generate slug
      const slug = this.generateSlug(input);

      // Create listing in transaction
      const newListing = await db.transaction(async (tx) => {
        return await this.createListingTransaction(
          tx,
          {
            ...input,
            entityId,
            userId,
            slug,
            autoApprove,
          },
          uploadedMedia,
        );
      });

      // if (newListing.status === "APPROVED") {
      ListingNotificationPublisher.publishListingApproved({
        userId,
        listingId: newListing.id,
        listing: newListing,
        db,
        entityId,
      });
      // }

      // Gamification Trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-list-create",
        moduleId: "listing",
        userId,
        entityId,
      });
    } catch (error) {
      log.error("Error in createListing", error as Error);
      throw error;
    }
  }

  /**
   * Update an existing listing
   */
  static async updateListing(
    db: AppDatabase,
    entityId: string,
    userId: string,
    listingId: string,
    input: CreateListingInput,
  ): Promise<any> {
    try {
      // Verify listing ownership
      const existingListing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq, and }) =>
          and(
            eq(marketPlace.id, listingId),
            eq(marketPlace.entityId, entityId),
          ),
        columns: {
          postedBy: true,
        },
      });

      if (!existingListing) {
        throw new Error("Listing not found");
      }

      if (existingListing.postedBy !== userId) {
        throw new Error("You are not authorized to edit this listing");
      }

      // Upload new media files if provided
      let uploadedMedia: any[] = [];
      if (input.media && input.media.length > 0) {
        uploadedMedia = await this.handleMediaUpload(entityId, input.media);
      }

      // Update listing in transaction
      const updatedListing = await db.transaction(async (tx) => {
        return await this.updateListingTransaction(
          tx,
          listingId,
          {
            ...input,
            entityId,
            userId,
          },
          uploadedMedia,
        );
      });

      return updatedListing;
    } catch (error) {
      log.error("Error in updateListing", error as Error);
      throw error;
    }
  }

  /**
   * Get listing by ID or slug and increment view count
   */
  static async getListingById(
    db: AppDatabase,
    entityId: string,
    identifier: string,
    userId?: string,
  ): Promise<ListingDetailResponse> {
    try {
      // Fetch the listing
      const listing = await this.fetchListingByIdentifier(
        db,
        entityId,
        identifier,
      );

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Increment view count
      await this.incrementViewCount(db, listing.id, userId);

      return {
        listing,
      };
    } catch (error) {
      log.error("Error in getListingById", error as Error);
      throw error;
    }
  }

  /**
   * Get detailed listing information by ID or slug
   */
  static async getListingDetailsById(
    db: AppDatabase,
    entityId: string,
    identifier: string,
    userId?: string,
  ): Promise<any> {
    try {
      // Check if identifier is UUID or slug
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          identifier,
        );

      // Fetch listing with all details
      const listing = await db
        .select({
          id: marketPlace.id,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          details: {
            id: marketPlace.id,
            title: marketPlace.title,
            description: marketPlace.description,
            price: marketPlace.price,
            currency: marketPlace.currency,
            condition: marketPlace.condition,
            status: marketPlace.status,
            sku: marketPlace.sku,
            slug: marketPlace.slug,
            category: marketPlace.category,
            location: marketPlace.location,
            interests: marketPlace.interests,
            categories: marketPlace.categories,
            isApproved: marketPlace.isApproved,
            isExpired: marketPlace.isExpired,
            isSold: marketPlace.isSold,
            isFeatured: marketPlace.isFeatured,
            createdAt: marketPlace.createdAt,
            updatedAt: marketPlace.updatedAt,
            postedBy: marketPlace.postedBy,
            media: sql<Array<string>>`ARRAY(
              SELECT ${marketPlaceMedia.url}
              FROM ${marketPlaceMedia}
              WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
              ORDER BY ${marketPlaceMedia.createdAt}
            )`,
          },
          isFeatured: marketPlace.isFeatured,
          isSold: marketPlace.isSold,
          isTrending: sql<boolean>`false`,
          numberOfViews: marketPlace.numberOfViews,
          numberOfContactClick: marketPlace.numberOfContactClick,
          isOwner: userId
            ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
            : sql<boolean>`false`,
          canDelete: userId
            ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
            : sql<boolean>`false`,
          canReport: userId
            ? sql<boolean>`${marketPlace.postedBy} != ${userId}`
            : sql<boolean>`true`,
          sellerRating: {
            averageRating: sql<number>`COALESCE(
              (SELECT AVG(${listingRating.rating})::numeric(10,2)
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
            totalRatings: sql<number>`COALESCE(
              (SELECT COUNT(*)::int
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
            ratingDistribution: sql<any>`COALESCE(
              (SELECT json_object_agg(rating, count)
               FROM (
                 SELECT ${listingRating.rating} as rating, COUNT(*)::int as count
                 FROM ${listingRating}
                 WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}
                 GROUP BY ${listingRating.rating}
               ) ratings),
            '{}'::json
          )`,
          },
          verification: sql<any>`(
            SELECT json_build_object(
              'id', ${listingVerification.id},
              'isVerified', ${listingVerification.isVerified},
              'verifiedBy', ${listingVerification.verifiedBy},
              'isVerifiedAt', ${listingVerification.isVerifiedAt},
              'verificationReason', ${listingVerification.verificationReason}
            )
            FROM ${listingVerification}
            WHERE ${listingVerification.listingId} = ${marketPlace.id}
          )`,
        })
        .from(marketPlace)
        .leftJoin(user, eq(marketPlace.postedBy, user.id))
        .where(
          and(
            eq(marketPlace.entityId, entityId),
            isUuid
              ? eq(marketPlace.id, identifier)
              : eq(marketPlace.slug, identifier),
          ),
        )
        .limit(1);

      if (!listing || listing.length === 0) {
        throw new Error("Listing not found");
      }

      const listingData = listing[0];

      // Increment view count if not owner
      if (userId && listingData.details.postedBy !== userId) {
        await this.incrementViewCount(db, listingData.id, userId);
      }

      return listingData;
    } catch (error) {
      log.error("Error in getListingDetailsById", error as Error);
      throw error;
    }
  }

  /**
   * Increment view count for a listing
   */
  private static async incrementViewCount(
    db: AppDatabase,
    listingId: string,
    userId?: string,
  ): Promise<void> {
    try {
      await db
        .update(marketPlace)
        .set({
          numberOfViews: sql`${marketPlace.numberOfViews} + 1`,
        })
        .where(eq(marketPlace.id, listingId));
    } catch (error) {
      log.error("Error incrementing view count", error as Error);
      // Don't throw - view count is not critical
    }
  }

  /**
   * Delete a listing - Only owner can delete
   */
  static async deleteListing(
    db: AppDatabase,
    listingId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Fetch the listing to verify ownership
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          postedBy: true,
          title: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Check if user is the owner
      if (listing.postedBy !== userId) {
        throw new Error("You are not authorized to delete this listing");
      }

      // Delete listing and related data in transaction
      await db.transaction(async (tx) => {
        // Delete media
        await tx
          .delete(marketPlaceMedia)
          .where(eq(marketPlaceMedia.marketPlace, listingId));

        // Delete contacts
        await tx
          .delete(listingContact)
          .where(eq(listingContact.listingId, listingId));

        // Delete ratings
        await tx
          .delete(listingRating)
          .where(eq(listingRating.listingId, listingId));

        // Delete reports
        await tx
          .delete(listingReport)
          .where(eq(listingReport.listingId, listingId));

        // Delete verification
        await tx
          .delete(listingVerification)
          .where(eq(listingVerification.listingId, listingId));

        // Delete user feed entries related to this listing
        await tx.delete(userFeed).where(eq(userFeed.marketPlaceId, listingId));

        // Delete the listing
        await tx.delete(marketPlace).where(eq(marketPlace.id, listingId));
      });

      return {
        success: true,
        message: "Listing deleted successfully",
      };
    } catch (error) {
      log.error("Error in deleteListing", error as Error);
      throw error;
    }
  }

  /**
   * Soft delete a listing (mark as expired/inactive)
   */
  static async softDeleteListing(
    db: AppDatabase,
    listingId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Fetch the listing to verify ownership
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          postedBy: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Check if user is the owner
      if (listing.postedBy !== userId) {
        throw new Error("You are not authorized to delete this listing");
      }

      // Mark as expired
      await db
        .update(marketPlace)
        .set({
          isExpired: true,
          status: "REJECTED",
          updatedAt: new Date(),
        })
        .where(eq(marketPlace.id, listingId));

      return {
        success: true,
        message: "Listing marked as inactive",
      };
    } catch (error) {
      log.error("Error in softDeleteListing", error as Error);
      throw error;
    }
  }

  /**
   * Admin: Delete a listing (can delete any listing)
   */
  static async adminDeleteListing(
    db: AppDatabase,
    listingId: string,
    adminId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Fetch the listing
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          title: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Delete listing and related data in transaction
      await db.transaction(async (tx) => {
        // Delete media
        await tx
          .delete(marketPlaceMedia)
          .where(eq(marketPlaceMedia.marketPlace, listingId));

        // Delete contacts
        await tx
          .delete(listingContact)
          .where(eq(listingContact.listingId, listingId));

        // Delete ratings
        await tx
          .delete(listingRating)
          .where(eq(listingRating.listingId, listingId));

        // Delete reports
        await tx
          .delete(listingReport)
          .where(eq(listingReport.listingId, listingId));

        // Delete verification
        await tx
          .delete(listingVerification)
          .where(eq(listingVerification.listingId, listingId));

        // Delete user feed entries
        await tx.delete(userFeed).where(eq(userFeed.marketPlaceId, listingId));

        // Delete the listing
        await tx.delete(marketPlace).where(eq(marketPlace.id, listingId));
      });

      return {
        success: true,
        message: "Listing deleted successfully by admin",
      };
    } catch (error) {
      log.error("Error in adminDeleteListing", error as Error);
      throw error;
    }
  }

  /**
   * Mark listing as sold (owner or admin)
   */
  static async markAsSold(
    db: AppDatabase,
    listingId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Fetch the listing
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          postedBy: true,
          isExpired: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Check authorization (owner or admin)
      if (!isAdmin && listing.postedBy !== userId) {
        throw new Error("You are not authorized to mark this listing as sold");
      }

      // Check if already sold/expired
      if (listing.isExpired) {
        throw new Error("Listing is already marked as sold or expired");
      }

      // Mark as sold
      await db
        .update(marketPlace)
        .set({
          isExpired: true,
          isSold: true,

          updatedAt: new Date(),
        })
        .where(eq(marketPlace.id, listingId));

      return {
        success: true,
        message: "Listing marked as sold successfully",
      };
    } catch (error) {
      log.error("Error in markAsSold", error as Error);
      throw error;
    }
  }

  /**
   * Expire a listing (owner or admin)
   */
  static async expireListing(
    db: AppDatabase,
    listingId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Fetch the listing
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          postedBy: true,
          isExpired: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Check authorization (owner or admin)
      if (!isAdmin && listing.postedBy !== userId) {
        throw new Error("You are not authorized to expire this listing");
      }

      // Check if already expired
      if (listing.isExpired) {
        throw new Error("Listing is already expired");
      }

      // Mark as expired
      await db
        .update(marketPlace)
        .set({
          isExpired: true,
          updatedAt: new Date(),
        })
        .where(eq(marketPlace.id, listingId));

      return {
        success: true,
        message: "Listing marked as expired successfully",
      };
    } catch (error) {
      log.error("Error in expireListing", error as Error);
      throw error;
    }
  }

  /**
   * Reactivate an expired listing (owner or admin)
   */
  static async reactivateListing(
    db: AppDatabase,
    listingId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Fetch the listing
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          postedBy: true,
          isExpired: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Check authorization (owner or admin)
      if (!isAdmin && listing.postedBy !== userId) {
        throw new Error("You are not authorized to reactivate this listing");
      }

      // Check if not expired
      if (!listing.isExpired) {
        throw new Error("Listing is already active");
      }

      // Reactivate
      await db
        .update(marketPlace)
        .set({
          isExpired: false,
          status: "APPROVED", // Assuming it was approved before
          updatedAt: new Date(),
        })
        .where(eq(marketPlace.id, listingId));

      return {
        success: true,
        message: "Listing reactivated successfully",
      };
    } catch (error) {
      log.error("Error in reactivateListing", error as Error);
      throw error;
    }
  }

  /**
   * Get all featured listings
   */
  static async getFeaturedListings(
    db: AppDatabase,
    entityId: string,
    userId?: string,
    { cursor, limit = 10, search = "" }: PaginationParams = {},
  ): Promise<ListingResponse> {
    try {
      // Add conditions
      const whereConditions = [
        eq(marketPlace.entityId, entityId),
        eq(marketPlace.isFeatured, true),
        eq(marketPlace.isApproved, true),
        eq(marketPlace.isExpired, false),
      ];

      if (cursor) {
        whereConditions.push(
          sql`${marketPlace.createdAt} < ${new Date(cursor)}`,
        );
      }

      const searchCondition = this.buildSearchCondition(search);
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }

      // Get total count
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(marketPlace)
        .where(and(...whereConditions));

      // Fetch featured listings (limit + 1)
      const listings = await db
        .select({
          id: marketPlace.id,
          user: {
            id: user.id,
            email: user.email,
          },
          isOwner: userId
            ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
            : sql<boolean>`false`,
          canDelete: userId
            ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
            : sql<boolean>`false`,
          canReport: userId
            ? sql<boolean>`${marketPlace.postedBy} != ${userId}`
            : sql<boolean>`false`,
          isSold: marketPlace.isSold,
          details: {
            ...marketPlace,
            media: sql<Array<string>>`ARRAY(
              SELECT ${marketPlaceMedia.url}
              FROM ${marketPlaceMedia}
              WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
            )`,
          },
          isFeatured: marketPlace.isFeatured,
          numberOfViews: marketPlace.numberOfViews,
          numberOfContactClick: marketPlace.numberOfContactClick,
          sellerRating: {
            averageRating: sql<number>`COALESCE(
              (SELECT AVG(${listingRating.rating})::numeric(10,2)
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
            totalRatings: sql<number>`COALESCE(
              (SELECT COUNT(*)::int
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
          },
        })
        .from(marketPlace)
        .leftJoin(user, eq(marketPlace.postedBy, user.id))
        .where(and(...whereConditions))
        .orderBy(desc(marketPlace.createdAt))
        .limit(limit + 1);

      // Determine next page
      const hasNextPage = listings.length > limit;
      const nodes = hasNextPage ? listings.slice(0, limit) : listings;

      const edges = nodes.map((listing: any) => ({
        cursor: listing.details.createdAt.toISOString(),
        node: {
          ...listing,
          isTrending: false,
        },
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getFeaturedListings", error as Error);
      throw error;
    }
  }

  /**
   * Get all trending listings
   */
  static async getTrendingListings(
    db: AppDatabase,
    entityId: string,
    userId?: string,
    { cursor, limit = 10 }: PaginationParams = {},
  ): Promise<ListingResponse> {
    try {
      // Fetch trending conditions
      const condition = await this.getTrendingConditions(db, entityId);
      const trendingLength = condition?.length || 10;

      // Calculate trending score based on views and contact clicks
      const trendingScore = sql<number>`
        (COALESCE(${marketPlace.numberOfViews}, 0) * 1) + 
        (COALESCE(${marketPlace.numberOfContactClick}, 0) * 2)
      `;

      // Build conditions
      const conditions = [
        eq(marketPlace.entityId, entityId),
        eq(marketPlace.isApproved, true),
        eq(marketPlace.isExpired, false),
      ];

      // Trending listings are usually a fixed set sorted by score,
      // but if we want cursor-based pagination here, we might need a different approach.
      // However, the existing code used offset. I'll stick to score-based if possible,
      // but for "cursor based pagination" as requested, I'll use scores.

      if (cursor) {
        if (cursor.includes(":")) {
          const [score, date] = cursor.split(":");
          conditions.push(
            sql`(${trendingScore} < ${Number(score)}) OR (${trendingScore} = ${Number(score)} AND ${marketPlace.createdAt} < ${new Date(date)})`,
          );
        } else {
          conditions.push(sql`${trendingScore} < ${Number(cursor)}`);
        }
      }

      // Get total count of approved listings
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(marketPlace)
        .where(and(...conditions));

      // Fetch trending listings
      const listings = await db
        .select({
          id: marketPlace.id,
          user: {
            id: user.id,
            email: user.email,
          },
          isOwner: userId
            ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
            : sql<boolean>`false`,
          canDelete: userId
            ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
            : sql<boolean>`false`,
          canReport: userId
            ? sql<boolean>`${marketPlace.postedBy} != ${userId}`
            : sql<boolean>`false`,
          isSold: marketPlace.isSold,
          details: {
            ...marketPlace,
            media: sql<Array<string>>`ARRAY(
              SELECT ${marketPlaceMedia.url}
              FROM ${marketPlaceMedia}
              WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
            )`,
          },
          isFeatured: marketPlace.isFeatured,
          numberOfViews: marketPlace.numberOfViews,
          numberOfContactClick: marketPlace.numberOfContactClick,
          sellerRating: {
            averageRating: sql<number>`COALESCE(
              (SELECT AVG(${listingRating.rating})::numeric(10,2)
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
            totalRatings: sql<number>`COALESCE(
              (SELECT COUNT(*)::int
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
          },
          trendingScore,
          createdAt: marketPlace.createdAt,
        })
        .from(marketPlace)
        .leftJoin(user, eq(marketPlace.postedBy, user.id))
        .where(and(...conditions))
        .orderBy(desc(trendingScore), desc(marketPlace.createdAt))
        .limit(limit + 1);

      const hasNextPage = listings.length > limit;
      const nodes = hasNextPage ? listings.slice(0, limit) : listings;

      const edges = nodes.map((listing: any) => ({
        cursor: `${listing.trendingScore}:${listing.createdAt.toISOString()}`,
        node: {
          ...listing,
          isTrending: true,
        },
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getTrendingListings", error as Error);
      throw error;
    }
  }

  /**
   * Get user's own listings (my listings)
   */
  static async getMyListings(
    db: AppDatabase,
    entityId: string,
    userId: string,
    { cursor, limit = 10, search = "" }: PaginationParams = {},
  ): Promise<ListingResponse> {
    try {
      // Build conditions
      const conditions = [
        eq(marketPlace.entityId, entityId),
        eq(marketPlace.postedBy, userId),
      ];

      if (cursor) {
        conditions.push(sql`${marketPlace.createdAt} < ${new Date(cursor)}`);
      }

      const searchCondition = this.buildSearchCondition(search);
      if (searchCondition) {
        conditions.push(searchCondition);
      }

      // Get total count
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(marketPlace)
        .where(and(...conditions));

      // Fetch listings (limit + 1)
      const listings = await db
        .select({
          id: marketPlace.id,
          user: {
            id: user.id,
            email: user.email,
          },
          isOwner: sql<boolean>`true`,
          canDelete: sql<boolean>`true`,
          canReport: sql<boolean>`false`,
          isSold: marketPlace.isSold,
          details: {
            ...marketPlace,
            media: sql<Array<string>>`ARRAY(
              SELECT ${marketPlaceMedia.url}
              FROM ${marketPlaceMedia}
              WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
            )`,
          },
          isFeatured: marketPlace.isFeatured,
          numberOfViews: marketPlace.numberOfViews,
          numberOfContactClick: marketPlace.numberOfContactClick,
          sellerRating: {
            averageRating: sql<number>`COALESCE(
              (SELECT AVG(${listingRating.rating})::numeric(10,2)
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
            totalRatings: sql<number>`COALESCE(
              (SELECT COUNT(*)::int
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
          },
        })
        .from(marketPlace)
        .leftJoin(user, eq(marketPlace.postedBy, user.id))
        .where(and(...conditions))
        .orderBy(desc(marketPlace.createdAt))
        .limit(limit + 1);

      const hasNextPage = listings.length > limit;
      const nodes = hasNextPage ? listings.slice(0, limit) : listings;

      const edges = nodes.map((listing: any) => ({
        cursor: listing.details.createdAt.toISOString(),
        node: {
          ...listing,
          isTrending: false,
        },
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getMyListings", error as Error);
      throw error;
    }
  }

  /**
   * Get user's listings with status filter
   */
  static async getMyListingsByStatus(
    db: AppDatabase,
    entityId: string,
    userId: string,
    status: "ALL" | "ACTIVE" | "SOLD" | "EXPIRED" | "PENDING",
    { cursor, limit = 10 }: PaginationParams = {},
  ): Promise<ListingResponse> {
    try {
      // Build where conditions based on status
      let conditions = [
        eq(marketPlace.entityId, entityId),
        eq(marketPlace.postedBy, userId),
      ];

      if (cursor) {
        conditions.push(sql`${marketPlace.createdAt} < ${new Date(cursor)}`);
      }

      if (status === "ACTIVE") {
        conditions.push(
          eq(marketPlace.isApproved, true),
          eq(marketPlace.isExpired, false),
        );
      } else if (status === "SOLD") {
        conditions.push(eq(marketPlace.isSold, true));
      } else if (status === "EXPIRED") {
        conditions.push(eq(marketPlace.isExpired, true));
      } else if (status === "PENDING") {
        conditions.push(eq(marketPlace.isApproved, false));
      }

      // Get total count
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(marketPlace)
        .where(and(...conditions));

      // Fetch listings (limit + 1)
      const listings = await db
        .select({
          id: marketPlace.id,
          user: {
            id: user.id,
            email: user.email,
          },
          isOwner: sql<boolean>`true`,
          canDelete: sql<boolean>`true`,
          canReport: sql<boolean>`false`,
          isSold: marketPlace.isSold,
          details: {
            ...marketPlace,
            media: sql<Array<string>>`ARRAY(
              SELECT ${marketPlaceMedia.url}
              FROM ${marketPlaceMedia}
              WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
            )`,
          },
          isFeatured: marketPlace.isFeatured,
          numberOfViews: marketPlace.numberOfViews,
          numberOfContactClick: marketPlace.numberOfContactClick,
          sellerRating: {
            averageRating: sql<number>`COALESCE(
              (SELECT AVG(${listingRating.rating})::numeric(10,2)
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
            totalRatings: sql<number>`COALESCE(
              (SELECT COUNT(*)::int
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
          },
        })
        .from(marketPlace)
        .leftJoin(user, eq(marketPlace.postedBy, user.id))
        .where(and(...conditions))
        .orderBy(desc(marketPlace.createdAt))
        .limit(limit + 1);

      const hasNextPage = listings.length > limit;
      const nodes = hasNextPage ? listings.slice(0, limit) : listings;

      const edges = nodes.map((listing: any) => ({
        cursor: listing.details.createdAt.toISOString(),
        node: {
          ...listing,
          isTrending: false,
        },
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getMyListingsByStatus", error as Error);
      throw error;
    }
  }

  // Private helper methods

  private static async getTrendingConditions(
    db: AppDatabase,
    entityId: string,
  ): Promise<any> {
    return await db.query.trendingConditionsListing.findFirst({
      where: (trendingConditionsListing: any, { eq }: any) =>
        eq(trendingConditionsListing.entity, entityId),
    });
  }

  private static async getListingsCount(
    db: AppDatabase,
    entityId: string,
    userId?: string,
    search: string = "",
  ): Promise<number> {
    const conditions = [eq(marketPlace.entityId, entityId)];
    if (userId) {
      conditions.push(eq(marketPlace.postedBy, userId));
    }
    if (search) {
      conditions.push(
        sql`${marketPlace.title} ILIKE '%' || ${search} || '%' OR ${marketPlace.description} ILIKE '%' || ${search} || '%'`,
      );
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(marketPlace)
      .where(and(...conditions));

    return result?.[0]?.count || 0;
  }

  private static async getUserListingsCount(
    db: AppDatabase,
    entityId: string,
    userId: string,
  ): Promise<number> {
    return this.getListingsCount(db, entityId, userId);
  }

  private static async fetchListingsWithDetails(
    db: AppDatabase,
    entityId: string,
    condition: any,
    limit: number,
    offset: number,
    userId?: string,
    search: string = "",
    cursor?: string,
  ): Promise<any[]> {
    const conditions = [
      eq(marketPlace.isExpired, false),
      eq(marketPlace.entityId, entityId),
    ];

    if (cursor) {
      conditions.push(sql`${marketPlace.createdAt} < ${new Date(cursor)}`);
    }
    const searchCondition = this.buildSearchCondition(search);
    if (searchCondition) {
      conditions.push(searchCondition);
    }

    console.log("Conditions for fetching listings:", conditions);

    const trendingScore = sql<number>`
      (COALESCE(${marketPlace.numberOfViews}, 0) * 1) + 
      (COALESCE(${marketPlace.numberOfContactClick}, 0) * 2)
    `;

    return await db
      .select({
        id: marketPlace.id,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
        isOwner: userId
          ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
          : sql<boolean>`false`,
        canDelete: userId
          ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
          : sql<boolean>`false`,
        canReport: userId
          ? sql<boolean>`${marketPlace.postedBy} != ${userId}`
          : sql<boolean>`true`,
        isSold: marketPlace.isSold,
        details: {
          id: marketPlace.id,
          title: marketPlace.title,
          description: marketPlace.description,
          price: marketPlace.price,
          currency: marketPlace.currency,
          condition: marketPlace.condition,
          status: marketPlace.status,
          sku: marketPlace.sku,
          slug: marketPlace.slug,
          category: marketPlace.category,
          location: marketPlace.location,
          interests: marketPlace.interests,
          categories: marketPlace.categories,
          isApproved: marketPlace.isApproved,
          isExpired: marketPlace.isExpired,
          isSold: marketPlace.isSold,
          isFeatured: marketPlace.isFeatured,
          createdAt: marketPlace.createdAt,
          updatedAt: marketPlace.updatedAt,
          postedBy: marketPlace.postedBy,
          media: sql<Array<string>>`ARRAY(
            SELECT ${marketPlaceMedia.url}
            FROM ${marketPlaceMedia}
            WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
            ORDER BY ${marketPlaceMedia.createdAt}
          )`,
        },
        isFeatured: marketPlace.isFeatured,
        numberOfViews: marketPlace.numberOfViews,
        numberOfContactClick: marketPlace.numberOfContactClick,
        sellerRating: {
          averageRating: sql<number>`COALESCE(
            (SELECT AVG(${listingRating.rating})::numeric(10,2)
             FROM ${listingRating}
             WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
            0
          )`,
          totalRatings: sql<number>`COALESCE(
            (SELECT COUNT(*)::int
             FROM ${listingRating}
             WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
            0
          )`,
          ratingDistribution: sql<any>`COALESCE(
            (SELECT json_object_agg(rating, count)
             FROM (
               SELECT ${listingRating.rating} as rating, COUNT(*)::int as count
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}
               GROUP BY ${listingRating.rating}
             ) ratings),
            '{}'::json
          )`,
        },
        trendingScore,
        rank: sql<number>`RANK() OVER (ORDER BY ${trendingScore} DESC)`,
      })
      .from(marketPlace)
      .leftJoin(user, eq(marketPlace.postedBy, user.id))
      .where(and(...conditions))
      .orderBy(desc(marketPlace.createdAt))
      .limit(limit)
      .offset(offset);
  }

  private static calculateTrending(
    listings: any[],
    trendingLength?: number,
  ): any[] {
    if (!trendingLength || listings.length === 0) {
      return listings.map((listing) => ({ ...listing, isTrending: false }));
    }

    const sortedByRank = [...listings].sort((a, b) => a.rank - b.rank);
    const topListings = sortedByRank.slice(0, trendingLength);

    return listings.map((listing) => ({
      ...listing,
      isTrending: topListings.some((top) => top.id === listing.id),
    }));
  }

  private static async handleMediaUpload(
    entityId: string,
    media?: any[],
  ): Promise<any[]> {
    if (!media || media.length === 0) {
      return [];
    }

    try {
      return await uploadFeedImage(entityId, media);
    } catch (error) {
      log.error("Media upload failed", error as Error);
      throw new Error("Failed to upload media");
    }
  }

  private static async getEntitySettings(
    db: AppDatabase,
    entityId: string,
  ): Promise<any> {
    const settings = await db.query.entitySettingsListing.findFirst({
      where: (entitySettingsListing: any, { eq }: any) =>
        eq(entitySettingsListing.entity, entityId),
    });

    if (!settings) {
      throw new Error("Entity settings not found");
    }

    return settings;
  }

  private static generateSlug(input: CreateListingInput): string {
    const slugParts = [
      input.title,
      input.location?.name,
      input.location?.state,
      input.location?.country,
      uuidv4(),
    ].filter(Boolean);

    return slugify(slugParts.join("-"), {
      replacement: "-",
      remove: /[*+~.()'"!:,@]/g,
      lower: true,
      strict: false,
      locale: "vi",
      trim: true,
    });
  }

  private static async createListingTransaction(
    tx: any,
    data: {
      entityId: string;
      userId: string;
      slug: string;
      autoApprove: boolean;
      [key: string]: any;
    },
    uploadedMedia: any[],
  ): Promise<any> {
    // Insert listing
    const [listing] = await tx
      .insert(marketPlace)
      .values({
        ...data,
        addedBy: "USER",
        isApproved: data.autoApprove,
        status: data.autoApprove ? "APPROVED" : "PENDING",
        slug: data.slug,
        entityId: data.entityId,
        postedBy: data.userId,
        currency: "INR",
        lat: data.latitude,
        lng: data.longitude,
      })
      .returning();

    if (!listing) {
      throw new Error("Failed to create listing");
    }

    // Insert media
    if (uploadedMedia.length > 0) {
      const mediaRecords = uploadedMedia.map((media) => ({
        url: media.file,
        marketPlace: listing.id,
      }));
      await tx.insert(marketPlaceMedia).values(mediaRecords);
    }

    // Create user feed entry
    await tx.insert(userFeed).values({
      userId: data.userId,
      entity: data.entityId,
      description: "Listing Added",
      marketPlaceId: listing.id,
      source: "marketPlace",
    });

    return listing;
  }

  private static async updateListingTransaction(
    tx: any,
    listingId: string,
    data: {
      entityId: string;
      userId: string;
      [key: string]: any;
    },
    uploadedMedia: any[],
  ): Promise<any> {
    // Update listing
    const updateData: any = {
      title: data.title,
      description: data.description,
      price: data.price,
      currency: data.currency || "INR",
      condition: data.condition,
      category: data.category,
      sku: data.sku,
      lat: data.latitude,
      lng: data.longitude,
      location: data.location
        ? typeof data.location === "string"
          ? { name: data.location }
          : data.location
        : undefined,
      updatedAt: new Date(),
    };

    const [listing] = await tx
      .update(marketPlace)
      .set(updateData)
      .where(eq(marketPlace.id, listingId))
      .returning();

    if (!listing) {
      throw new Error("Failed to update listing");
    }

    // Update media if provided
    if (uploadedMedia.length > 0) {
      // Delete old media
      await tx
        .delete(marketPlaceMedia)
        .where(eq(marketPlaceMedia.marketPlace, listingId));

      // Insert new media
      const mediaRecords = uploadedMedia.map((media) => ({
        url: media.file || media.url, // Handle both upload response and existing media
        marketPlace: listingId,
      }));
      await tx.insert(marketPlaceMedia).values(mediaRecords);
    }

    return listing;
  }

  private static async fetchListingByIdentifier(
    db: AppDatabase,
    entityId: string,
    identifier: string,
  ): Promise<any> {
    // Try to find by ID first, then by slug
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    const listings = await db
      .select({
        id: marketPlace.id,
        user: {
          id: user.id,
          email: user.email,
        },
        isSold: marketPlace.isSold,
        details: {
          ...marketPlace,
          media: sql<Array<string>>`ARRAY(
            SELECT ${marketPlaceMedia.url}
            FROM ${marketPlaceMedia}
            WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
          )`,
        },
        isFeatured: marketPlace.isFeatured,
        numberOfViews: marketPlace.numberOfViews,
        numberOfContactClick: marketPlace.numberOfContactClick,
        sellerRating: {
          averageRating: sql<number>`COALESCE(
            (SELECT AVG(${listingRating.rating})::numeric(10,2)
             FROM ${listingRating}
             WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
            0
          )`,
          totalRatings: sql<number>`COALESCE(
            (SELECT COUNT(*)::int
             FROM ${listingRating}
             WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
            0
          )`,
        },
      })
      .from(marketPlace)
      .leftJoin(
        marketPlaceMedia,
        eq(marketPlace.id, marketPlaceMedia.marketPlace),
      )
      .leftJoin(user, eq(marketPlace.postedBy, user.id))
      .where(
        and(
          eq(marketPlace.entityId, entityId),
          isUuid
            ? eq(marketPlace.id, identifier)
            : eq(marketPlace.slug, identifier),
        ),
      )
      .limit(1);

    return listings[0];
  }

  private static async trackUserView(
    tx: any,
    listingId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Check if view already exists today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingView = await tx.query.listingViews?.findFirst({
        where: (listingViews: any, { and, eq, gte }: any) =>
          and(
            eq(listingViews.listingId, listingId),
            eq(listingViews.userId, userId),
            gte(listingViews.viewedAt, today),
          ),
      });

      // Only insert if no view exists today
      if (!existingView && tx.insert.listingViews) {
        await tx.insert.listingViews.values({
          listingId,
          userId,
          viewedAt: new Date(),
        });
      }
    } catch (error) {
      // Silently fail if listingViews table doesn't exist
      log.error("Error tracking user view", error as Error);
    }
  }

  static async getListingStatus(
    db: AppDatabase,
    listingId: string,
  ): Promise<ListingStatusInfo> {
    try {
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          isSold: true,
          isExpired: true,
          isApproved: true,
          status: true,
          updatedAt: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      return {
        isSold: listing.isSold,
      };
    } catch (error) {
      log.error("Error in getListingStatus", error as Error);
      throw error;
    }
  }

  /**
   * Get related listings by listing ID (based on category)
   */
  static async getRelatedListingsByListingId(
    db: AppDatabase,
    entityId: string,
    listingId: string,
    userId?: string,
    limit: number = 6,
  ): Promise<any[]> {
    try {
      // First, get the listing to find its category
      const currentListing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq, and }) =>
          and(
            eq(marketPlace.id, listingId),
            eq(marketPlace.entityId, entityId),
          ),
        columns: {
          category: true,
        },
      });

      if (!currentListing) {
        throw new Error("Listing not found");
      }

      // Fetch related listings from the same category
      const relatedListings = await db
        .select({
          id: marketPlace.id,
          user: {
            id: user.id,
            email: user.email,
          },
          details: {
            id: marketPlace.id,
            title: marketPlace.title,
            price: marketPlace.price,
            currency: marketPlace.currency,
            slug: marketPlace.slug,
            category: marketPlace.category,
            condition: marketPlace.condition,
            isSold: marketPlace.isSold,
            createdAt: marketPlace.createdAt,
            media: sql<Array<string>>`ARRAY(
              SELECT ${marketPlaceMedia.url}
              FROM ${marketPlaceMedia}
              WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
              ORDER BY ${marketPlaceMedia.createdAt}
              LIMIT 1
            )`,
          },
          isFeatured: marketPlace.isFeatured,
          isSold: marketPlace.isSold,
          isTrending: sql<boolean>`false`,
          numberOfViews: marketPlace.numberOfViews,
          numberOfContactClick: marketPlace.numberOfContactClick,
          isOwner: userId
            ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
            : sql<boolean>`false`,
          canDelete: userId
            ? sql<boolean>`${marketPlace.postedBy} = ${userId}`
            : sql<boolean>`false`,
          canReport: userId
            ? sql<boolean>`${marketPlace.postedBy} != ${userId}`
            : sql<boolean>`true`,
          sellerRating: {
            averageRating: sql<number>`COALESCE(
              (SELECT AVG(${listingRating.rating})::numeric(10,2)
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
            totalRatings: sql<number>`COALESCE(
              (SELECT COUNT(*)::int
               FROM ${listingRating}
               WHERE ${listingRating.sellerId} = ${marketPlace.postedBy}),
              0
            )`,
          },
        })
        .from(marketPlace)
        .leftJoin(user, eq(marketPlace.postedBy, user.id))
        .where(
          and(
            eq(marketPlace.entityId, entityId),
            eq(marketPlace.category, currentListing.category),
            eq(marketPlace.isApproved, true),
            eq(marketPlace.isExpired, false),
            sql`${marketPlace.id} != ${listingId}`,
          ),
        )
        .orderBy(desc(marketPlace.createdAt))
        .limit(limit);

      return relatedListings;
    } catch (error) {
      log.error("Error in getRelatedListingsByListingId", error as Error);
      throw error;
    }
  }

  /**
   * Get all enquiries (contacts) for a specific listing - Seller view
   */
  static async getListingEnquiries(
    db: AppDatabase,
    listingId: string,
    sellerId: string,
    { cursor, limit = 10 }: PaginationParams = {},
  ): Promise<{
    edges: any[];
    pageInfo: PageInfo;
    totalCount: number;
  }> {
    try {
      // Verify listing ownership
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          postedBy: true,
          title: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      if (listing.postedBy !== sellerId) {
        throw new Error(
          "You are not authorized to view enquiries for this listing",
        );
      }

      // Build conditions
      const conditions = [eq(listingContact.listingId, listingId)];
      if (cursor) {
        conditions.push(sql`${listingContact.createdAt} < ${new Date(cursor)}`);
      }

      // Get total count of enquiries for this listing
      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(listingContact)
        .where(eq(listingContact.listingId, listingId));

      const total = totalResult[0]?.count || 0;

      // Fetch enquiries with buyer and message details (limit + 1)
      const enquiries = await db.query.listingContact.findMany({
        where: (contact, { eq, and }) => and(...conditions),
        with: {
          listing: {
            columns: {
              id: true,
              title: true,
              price: true,
              currency: true,
            },
            with: {
              media: {
                columns: {
                  url: true,
                },
                limit: 1,
              },
            },
          },
          buyer: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          seller: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          message: {
            columns: {
              id: true,
              content: true,
              createdAt: true,
              isRead: true,
            },
          },
          conversation: {
            columns: {
              id: true,
              lastMessageAt: true,
            },
            with: {
              messages: {
                columns: {
                  id: true,
                  content: true,
                  isRead: true,
                  createdAt: true,
                },
                orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                limit: 1,
              },
            },
          },
        },
        orderBy: (contact, { desc }) => [desc(contact.createdAt)],
        limit: limit + 1,
      });

      const hasNextPage = enquiries.length > limit;
      const nodes = hasNextPage ? enquiries.slice(0, limit) : enquiries;

      const edges = nodes.map((enq) => ({
        cursor: enq.createdAt ? enq.createdAt.toISOString() : "",
        node: {
          id: enq.id,
          createdAt: enq.createdAt,
          listing: {
            id: enq.listing.id,
            title: enq.listing.title,
            price: enq.listing.price,
            currency: enq.listing.currency,
            media: enq.listing.media.map((m) => m.url),
          },
          buyer: {
            id: enq.buyer.id,
            email: enq.buyer.email,
            firstName: enq.buyer.firstName || "",
            lastName: enq.buyer.lastName || "",
            avatar: enq.buyer.avatar || "",
          },
          seller: {
            id: enq.seller.id,
            email: enq.seller.email,
            firstName: enq.seller.firstName || "",
            lastName: enq.seller.lastName || "",
            avatar: enq.seller.avatar || "",
          },
          message: enq.message,
          conversation: {
            id: enq.conversation.id,
            lastMessageAt: enq.conversation.lastMessageAt,
            unreadCount: enq.conversation.messages.filter(
              (msg: any) => !msg.isRead,
            ).length,
            lastMessage: enq.conversation.messages[0] || null,
          },
        },
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getListingEnquiries", error as Error);
      throw error;
    }
  }

  /**
   * Get enquiry statistics for a listing
   */
  static async getListingEnquiryStats(
    db: AppDatabase,
    listingId: string,
    sellerId: string,
  ): Promise<{
    totalEnquiries: number;
    unreadEnquiries: number;
    uniqueBuyers: number;
  }> {
    try {
      // Verify listing ownership
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
      });

      if (!listing) {
        throw new Error("Listing not found");
      }
      if (listing.postedBy !== sellerId) {
        throw new Error(
          "You are not authorized to view stats for this listing",
        );
      }

      // Get total enquiries
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(listingContact)
        .where(eq(listingContact.listingId, listingId));

      // Get unique buyers
      const [{ uniqueBuyers }] = await db
        .select({
          uniqueBuyers: sql<number>`count(DISTINCT ${listingContact.contactedBy})::int`,
        })
        .from(listingContact)
        .where(eq(listingContact.listingId, listingId));

      // Get unread messages count
      const conversations = await db.query.listingConversation.findMany({
        where: (conv, { eq }) => eq(conv.listingId, listingId),
        columns: {
          id: true,
        },
      });

      const conversationIds = conversations.map((c) => c.id);

      let unreadCount = 0;
      if (conversationIds.length > 0) {
        const [{ unread }] = await db
          .select({ unread: sql<number>`count(*)::int` })
          .from(listingMessage)
          .where(
            and(
              sql`${listingMessage.conversationId} = ANY(${conversationIds})`,
              eq(listingMessage.isRead, false),
              sql`${listingMessage.senderId} != ${sellerId}`,
            ),
          );
        unreadCount = unread;
      }

      return {
        totalEnquiries: total,
        unreadEnquiries: unreadCount,
        uniqueBuyers,
      };
    } catch (error) {
      log.error("Error in getListingEnquiryStats", error as Error);
      throw error;
    }
  }

  /**
   * Get all enquiries grouped by buyer for a listing
   */
  static async getListingEnquiriesGroupedByBuyer(
    db: AppDatabase,
    listingId: string,
    sellerId: string,
  ): Promise<any[]> {
    try {
      // Verify listing ownership
      const listing = await db.query.marketPlace.findFirst({
        where: (marketPlace, { eq }) => eq(marketPlace.id, listingId),
        columns: {
          id: true,
          postedBy: true,
        },
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      if (listing.postedBy !== sellerId) {
        throw new Error(
          "You are not authorized to view enquiries for this listing",
        );
      }

      // Get all conversations for this listing
      const conversations = await db.query.listingConversation.findMany({
        where: (conv, { eq }) => eq(conv.listingId, listingId),
        with: {
          buyer: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          messages: {
            columns: {
              id: true,
              content: true,
              createdAt: true,
              isRead: true,
              senderId: true,
            },
            orderBy: (messages, { desc }) => [desc(messages.createdAt)],
          },
        },
        orderBy: (conv, { desc }) => [desc(conv.lastMessageAt)],
      });

      return conversations.map((conv) => ({
        conversationId: conv.id,
        buyer: conv.buyer,
        lastMessageAt: conv.lastMessageAt,
        totalMessages: conv.messages.length,
        unreadMessages: conv.messages.filter(
          (msg) => !msg.isRead && msg.senderId !== sellerId,
        ).length,
        lastMessage: conv.messages[0] || null,
      }));
    } catch (error) {
      log.error("Error in getListingEnquiriesGroupedByBuyer", error as Error);
      throw error;
    }
  }

  /**
   * Get user's listings by user ID
   */
  static async getListingsByUserId(
    db: AppDatabase,
    entityId: string,
    targetUserId: string,
    currentUserId?: string,
    { cursor, limit = 10 }: PaginationParams = {},
  ): Promise<UserListingsResponse> {
    try {
      // 1. Fetch seller details and ratings
      const sellerData = await db
        .select({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          cover: user.cover,
          averageRating: sql<number>`COALESCE(
            (SELECT AVG(${listingRating.rating})::numeric(10,2)
             FROM ${listingRating}
             WHERE ${listingRating.sellerId} = ${user.id}),
            0
          )`,
          totalRatings: sql<number>`COALESCE(
            (SELECT COUNT(*)::int
             FROM ${listingRating}
             WHERE ${listingRating.sellerId} = ${user.id}),
            0
          )`,
        })
        .from(user)
        .where(eq(user.id, targetUserId))
        .limit(1);

      if (!sellerData[0]) {
        throw new Error("User not found");
      }

      const seller = {
        id: sellerData[0].id,
        firstName: sellerData[0].firstName,
        lastName: sellerData[0].lastName,
        email: sellerData[0].email,
        avatar: sellerData[0].avatar || "",
        cover: sellerData[0].cover || "",
        rating: {
          averageRating: Number(sellerData[0].averageRating),
          totalRatings: sellerData[0].totalRatings,
        },
      };

      // 2. Build conditions for listings
      const conditions = [
        eq(marketPlace.entityId, entityId),
        eq(marketPlace.postedBy, targetUserId),
        // eq(marketPlace.isApproved, true),
        // eq(marketPlace.isExpired, false),
      ];

      if (cursor) {
        conditions.push(sql`${marketPlace.createdAt} < ${new Date(cursor)}`);
      }

      // 3. Get total count
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(marketPlace)
        .where(and(...conditions));

      // 4. Fetch user's listings (limit + 1)
      const listings = await db
        .select({
          id: marketPlace.id,
          details: {
            id: marketPlace.id,
            title: marketPlace.title,
            description: marketPlace.description,
            price: marketPlace.price,
            currency: marketPlace.currency,
            condition: marketPlace.condition,
            slug: marketPlace.slug,
            category: marketPlace.category,
            createdAt: marketPlace.createdAt,
            media: sql<Array<string>>`ARRAY(
              SELECT ${marketPlaceMedia.url}
              FROM ${marketPlaceMedia}
              WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
              ORDER BY ${marketPlaceMedia.createdAt}
            )`,
          },
          isFeatured: marketPlace.isFeatured,
          isSold: marketPlace.isSold,
          isTrending: sql<boolean>`false`,
          numberOfViews: marketPlace.numberOfViews,
          numberOfContactClick: marketPlace.numberOfContactClick,
          isOwner: currentUserId
            ? sql<boolean>`${marketPlace.postedBy} = ${currentUserId}`
            : sql<boolean>`false`,
          canDelete: currentUserId
            ? sql<boolean>`${marketPlace.postedBy} = ${currentUserId}`
            : sql<boolean>`false`,
          canReport: currentUserId
            ? sql<boolean>`${marketPlace.postedBy} != ${currentUserId}`
            : sql<boolean>`true`,
        })
        .from(marketPlace)
        .where(and(...conditions))
        .orderBy(desc(marketPlace.createdAt))
        .limit(limit + 1);

      const hasNextPage = listings.length > limit;
      const nodes = hasNextPage ? listings.slice(0, limit) : listings;

      const edges = nodes.map((listing: any) => ({
        cursor: listing.details.createdAt.toISOString(),
        node: listing,
      }));

      return {
        seller,
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in getListingsByUserId", error as Error);
      throw error;
    }
  }

  static async mapViewAllListings(
    db: AppDatabase,
    entityId: string,
    { cursor, limit = 100 }: PaginationParams = {},
  ): Promise<{ edges: any[]; pageInfo: PageInfo; totalCount: number }> {
    try {
      // Build conditions
      const conditions = [eq(marketPlace.entityId, entityId)];
      if (cursor) {
        conditions.push(sql`${marketPlace.createdAt} < ${new Date(cursor)}`);
      }

      // Get total count
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(marketPlace)
        .where(eq(marketPlace.entityId, entityId));

      // Fetch listings (limit + 1)
      const listings = await db
        .select({
          id: marketPlace.id,
          title: marketPlace.title,
          price: marketPlace.price,
          location: sql<string>`${marketPlace.location}->>'name'`,
          latitude: sql<number>`NULLIF(${marketPlace.lat}, '')::float`,
          longitude: sql<number>`NULLIF(${marketPlace.lng}, '')::float`,
          createdAt: marketPlace.createdAt,
          media: sql<string[]>`ARRAY(
            SELECT ${marketPlaceMedia.url}
            FROM ${marketPlaceMedia}
            WHERE ${marketPlaceMedia.marketPlace} = ${marketPlace.id}
            ORDER BY ${marketPlaceMedia.createdAt}
          )`,
          isApproved: marketPlace.isApproved,
          isExpired: marketPlace.isExpired,
          isSold: marketPlace.isSold,
        })
        .from(marketPlace)
        .where(and(...conditions))
        .orderBy(desc(marketPlace.createdAt))
        .limit(limit + 1);

      const hasNextPage = listings.length > limit;
      const nodes = hasNextPage ? listings.slice(0, limit) : listings;

      const edges = nodes.map((listing: any) => ({
        cursor: listing.createdAt ? listing.createdAt.toISOString() : "",
        node: listing,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: total,
      };
    } catch (error) {
      log.error("Error in mapViewAllListings", error as Error);
      throw error;
    }
  }
}
