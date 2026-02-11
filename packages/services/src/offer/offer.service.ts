import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  offers,
  offerCategories,
  AppDatabase,
  userFeed,
} from "@thrico/database";
import { upload } from "../upload";
import { GamificationEventService } from "../gamification/gamification-event.service";
import { CloseFriendNotificationService } from "../network/closefriend-notification.service";

export class OfferService {
  static async createOffer({
    input,
    userId,
    entityId,
    db,
  }: {
    input: any;
    userId: string;
    entityId: string;
    db: AppDatabase;
  }) {
    try {
      if (!input || !userId || !entityId) {
        throw new GraphQLError("Input, User ID, and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      let imageUrl = input.image;
      if (input.image && typeof input.image !== "string") {
        imageUrl = await upload(input.image);
      }

      log.debug("Creating offer", { userId, entityId, title: input.title });

      const [newOffer] = await db
        .insert(offers)
        .values({
          ...input,
          entityId,
          userId,
          status: "APPROVED",
          addedBy: "USER",
          image: imageUrl,
          validityStart: input.validityStart
            ? new Date(input.validityStart)
            : null,
          validityEnd: input.validityEnd ? new Date(input.validityEnd) : null,
        })
        .returning();

      await GamificationEventService.triggerEvent({
        triggerId: "tr-off-create",
        moduleId: "offers",
        userId: userId,
        entityId: entityId,
      });

      await db.insert(userFeed).values({
        entity: entityId,
        offerId: newOffer.id,
        description: newOffer.description,
        source: "offer",
        addedBy: "USER",
        privacy: "PUBLIC",
        userId: newOffer.userId,
      });

      log.info("Offer created successfully", {
        userId,
        offerId: newOffer.id,
        title: input.title,
      });

      // Close Friend Notification
      // CloseFriendNotificationService.publishNotificationTask({
      //   creatorId: userId,
      //   entityId,
      //   type: "OFFER",
      //   contentId: newOffer.id,
      //   title: input.title || "New Offer",
      // }).catch((err: any) => {
      //   log.error("Failed to trigger close friend offer notification", {
      //     userId,
      //     offerId: newOffer.id,
      //     error: err.message,
      //   });
      // });

      return newOffer;
    } catch (error) {
      log.error("Error in createOfferService", { error, userId, entityId });
      throw error;
    }
  }

  public static attachPermissions(
    offer: any,
    currentUserId?: string,
    role?: string,
  ) {
    if (!currentUserId) {
      return {
        ...offer,
        isOwner: false,
        canEdit: false,
        canDelete: false,
        canReport: false,
      };
    }

    return {
      ...offer,
      isOwner: offer.userId === currentUserId,
      canEdit:
        offer.userId === currentUserId ||
        role === "ADMIN" ||
        role === "MANAGER",
      canDelete:
        offer.userId === currentUserId ||
        role === "ADMIN" ||
        role === "MANAGER",
      canReport: offer.userId !== currentUserId,
    };
  }

  static async getApprovedOffers({
    entityId,
    db,
    cursor,
    limit = 10,
    categoryId,
    search,
    currentUserId,
    role,
  }: {
    entityId: string;
    db: any;
    cursor?: string;
    limit?: number;
    categoryId?: string;
    search?: string;
    currentUserId?: string;
    role?: string;
  }) {
    try {
      log.debug("Getting approved offers", {
        entityId,
        cursor,
        limit,
        categoryId,
      });

      const whereConditions = [
        eq(offers.entityId, entityId),
        eq(offers.status, "APPROVED"),
        eq(offers.isActive, true),
      ];

      if (categoryId) {
        whereConditions.push(eq(offers.categoryId, categoryId));
      }

      if (search) {
        whereConditions.push(
          sql`(${offers.title} ILIKE ${`%${search}%`} OR ${offers.description} ILIKE ${`%${search}%`})`,
        );
      }

      if (cursor) {
        whereConditions.push(sql`${offers.createdAt} < ${new Date(cursor)}`);
      }

      const results = await db.query.offers.findMany({
        where: and(...whereConditions),
        limit: limit + 1,
        orderBy: [desc(offers.createdAt)],
        with: {
          category: true,
          creator: true,
        },
      });

      const hasNextPage = results.length > limit;
      const nodes = hasNextPage ? results.slice(0, limit) : results;

      const processedResults = nodes.map((offer: any) => {
        const result = {
          ...offer,
          user: offer.creator,
          addedBy: offer.creator
            ? `${offer.creator.firstName} ${offer.creator.lastName}`
            : "User",
        };
        return this.attachPermissions(result, currentUserId, role);
      });

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(offers)
        .where(
          and(
            eq(offers.entityId, entityId),
            eq(offers.status, "APPROVED"),
            eq(offers.isActive, true),
            categoryId ? eq(offers.categoryId, categoryId) : sql`TRUE`,
          ),
        );

      const edges = processedResults.map((offer: any) => ({
        cursor: offer.createdAt.toISOString(),
        node: offer,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: Number(count),
      };
    } catch (error) {
      log.error("Error in getApprovedOffers", {
        error,
        entityId,
        cursor,
        limit,
      });
      throw error;
    }
  }

  static async claimOffer({
    offerId,
    userId,
    db,
  }: {
    offerId: string;
    userId: string;
    db: any;
  }) {
    try {
      log.debug("Claiming offer", { offerId, userId });

      const [updatedOffer] = await db
        .update(offers)
        .set({
          claimsCount: sql`${offers.claimsCount} + 1`,
        })
        .where(eq(offers.id, offerId))
        .returning();

      if (!updatedOffer) {
        throw new GraphQLError("Offer not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const { entityId } = updatedOffer;

      await GamificationEventService.triggerEvent({
        triggerId: "tr-off-claim",
        moduleId: "offers",
        userId: userId,
        entityId: entityId,
        cooldownSeconds: 1200, // 20 minutes cooldown
        referenceId: offerId,
      });

      log.info("Offer claimed", { offerId, userId });
      return updatedOffer;
    } catch (error) {
      log.error("Error in claimOffer", { error, offerId, userId });
      throw error;
    }
  }

  static async trackOfferVisual({
    offerId,
    userId,
    db,
  }: {
    offerId: string;
    userId: string;
    db: any;
  }) {
    try {
      log.debug("Tracking offer visual", { offerId, userId });

      await db
        .update(offers)
        .set({
          viewsCount: sql`${offers.viewsCount} + 1`,
        })
        .where(eq(offers.id, offerId));

      log.info("Offer view recorded", { offerId, userId });
      return true;
    } catch (error) {
      log.error("Error in trackOfferVisual", { error, offerId, userId });
      throw error;
    }
  }

  static async shareOffer({
    offerId,
    userId,
    entityId,
    db,
  }: {
    offerId: string;
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      log.debug("Sharing offer", { offerId, userId, entityId });

      const [updatedOffer] = await db
        .update(offers)
        .set({
          sharesCount: sql`${offers.sharesCount} + 1`,
        })
        .where(eq(offers.id, offerId))
        .returning();

      if (!updatedOffer) {
        throw new GraphQLError("Offer not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      await GamificationEventService.triggerEvent({
        triggerId: "tr-off-share",
        moduleId: "offers",
        userId: userId,
        entityId: entityId,
        cooldownSeconds: 1200, // 20 minutes cooldown
        referenceId: offerId,
      });

      log.info("Offer shared and gamification event triggered", {
        offerId,
        userId,
      });
      return updatedOffer;
    } catch (error) {
      log.error("Error in shareOffer", { error, offerId, userId });
      throw error;
    }
  }

  static async getOfferCategories({
    entityId,
    db,
  }: {
    entityId: string;
    db: any;
  }) {
    try {
      log.debug("Getting offer categories", { entityId });

      const results = await db
        .select()
        .from(offerCategories)
        .where(
          and(
            eq(offerCategories.entityId, entityId),
            eq(offerCategories.isActive, true),
          ),
        )
        .orderBy(asc(offerCategories.name));

      return results;
    } catch (error) {
      log.error("Error in getOfferCategories", { error, entityId });
      throw error;
    }
  }

  static async getOffersByUserId({
    userId,
    entityId,
    db,
    cursor,
    limit = 10,
    currentUserId,
    role,
  }: {
    userId: string;
    entityId: string;
    db: any;
    cursor?: string;
    limit?: number;
    currentUserId?: string;
    role?: string;
  }) {
    try {
      log.debug("Getting offers by user id", {
        userId,
        entityId,
        cursor,
        limit,
      });

      const whereConditions = [
        eq(offers.entityId, entityId),
        eq(offers.userId, userId),
        eq(offers.isActive, true),
      ];

      if (cursor) {
        whereConditions.push(sql`${offers.createdAt} < ${new Date(cursor)}`);
      }

      const results = await db.query.offers.findMany({
        where: and(...whereConditions),
        limit: limit + 1,
        orderBy: [desc(offers.createdAt)],
        with: {
          category: true,
          creator: true,
        },
      });

      const hasNextPage = results.length > limit;
      const nodes = hasNextPage ? results.slice(0, limit) : results;

      const processedResults = nodes.map((offer: any) => {
        const result = {
          ...offer,
          user: offer.creator,
          addedBy: offer.creator
            ? `${offer.creator.firstName} ${offer.creator.lastName}`
            : "User",
        };
        return this.attachPermissions(result, currentUserId, role);
      });

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(offers)
        .where(
          and(
            eq(offers.entityId, entityId),
            eq(offers.userId, userId),
            eq(offers.isActive, true),
          ),
        );

      const edges = processedResults.map((offer: any) => ({
        cursor: offer.createdAt.toISOString(),
        node: offer,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: Number(count),
      };
    } catch (error) {
      log.error("Error in getOffersByUserId", {
        error,
        userId,
        entityId,
        cursor,
        limit,
      });
      throw error;
    }
  }

  static async getOfferById({
    offerId,
    entityId,
    db,
    currentUserId,
    role,
  }: {
    offerId: string;
    entityId: string;
    db: any;
    currentUserId?: string;
    role?: string;
  }) {
    try {
      log.debug("Getting offer by id", { offerId, entityId });

      const result = await db.query.offers.findFirst({
        where: and(eq(offers.id, offerId), eq(offers.entityId, entityId)),
        with: {
          category: true,
          creator: true,
        },
      });

      if (!result) {
        throw new GraphQLError("Offer not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const resultWithDetails = {
        ...result,
        user: result.creator,
        addedBy: result.creator
          ? `${result.creator.firstName} ${result.creator.lastName}`
          : "User",
      };

      return this.attachPermissions(resultWithDetails, currentUserId, role);
    } catch (error) {
      log.error("Error in getOfferById", { error, offerId, entityId });
      throw error;
    }
  }

  static async updateOffer({
    offerId,
    input,
    userId,
    entityId,
    db,
  }: {
    offerId: string;
    input: any;
    userId: string;
    entityId: string;
    db: AppDatabase;
  }) {
    try {
      log.debug("Updating offer", { offerId, userId, entityId });

      const existingOffer = await db.query.offers.findFirst({
        where: and(eq(offers.id, offerId), eq(offers.entityId, entityId)),
      });

      if (!existingOffer) {
        throw new GraphQLError("Offer not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (existingOffer.userId !== userId) {
        throw new GraphQLError("Not authorized to update this offer", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      let imageUrl = input.image;
      if (input.image && typeof input.image !== "string") {
        imageUrl = await upload(input.image);
      }

      const updateData: any = {
        ...input,
        updatedAt: new Date(),
      };

      if (imageUrl) {
        updateData.image = imageUrl;
      }

      if (input.validityStart) {
        updateData.validityStart = new Date(input.validityStart);
      }
      if (input.validityEnd) {
        updateData.validityEnd = new Date(input.validityEnd);
      }

      const [updatedOffer] = await db
        .update(offers)
        .set(updateData)
        .where(eq(offers.id, offerId))
        .returning();

      log.info("Offer updated successfully", { offerId, userId });
      return updatedOffer;
    } catch (error) {
      log.error("Error in updateOfferService", { error, offerId, userId });
      throw error;
    }
  }

  static async deleteOffer({
    offerId,
    userId,
    entityId,
    db,
  }: {
    offerId: string;
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      log.debug("Deleting offer", { offerId, userId, entityId });

      const existingOffer = await db.query.offers.findFirst({
        where: and(eq(offers.id, offerId), eq(offers.entityId, entityId)),
      });

      if (!existingOffer) {
        throw new GraphQLError("Offer not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (existingOffer.userId !== userId) {
        throw new GraphQLError("Not authorized to delete this offer", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      await db
        .update(offers)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(offers.id, offerId));

      log.info("Offer deleted successfully", { offerId, userId });
      return true;
    } catch (error) {
      log.error("Error in deleteOffer", { error, offerId, userId });
      throw error;
    }
  }

  static async getOfferStats({
    offerId,
    entityId,
    db,
  }: {
    offerId: string;
    entityId: string;
    db: AppDatabase;
  }) {
    try {
      log.debug("Getting offer stats", { offerId, entityId });

      const result = await db.query.offers.findFirst({
        where: and(eq(offers.id, offerId), eq(offers.entityId, entityId)),
        columns: {
          viewsCount: true,
          claimsCount: true,
          sharesCount: true,
        },
      });

      if (!result) {
        throw new GraphQLError("Offer not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return result;
    } catch (error) {
      log.error("Error in getOfferStats", { error, offerId, entityId });
      throw error;
    }
  }
}
