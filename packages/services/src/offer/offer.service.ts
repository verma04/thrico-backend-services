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

      return newOffer;
    } catch (error) {
      log.error("Error in createOfferService", { error, userId, entityId });
      throw error;
    }
  }

  static async getApprovedOffers({
    entityId,
    db,
    page,
    limit,
    categoryId,
    search,
  }: {
    entityId: string;
    db: any;
    page: number;
    limit: number;
    categoryId?: string;
    search?: string;
  }) {
    try {
      const offset = page * limit;

      log.debug("Getting approved offers", {
        entityId,
        page,
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

      const results = await db.query.offers.findMany({
        where: and(...whereConditions),
        limit,
        offset,
        orderBy: [desc(offers.createdAt)],
        with: {
          category: true,
          creator: true,
        },
      });

      const processedResults = results.map((offer: any) => ({
        ...offer,
        user: offer.creator,
        addedBy: offer.creator
          ? `${offer.creator.firstName} ${offer.creator.lastName}`
          : "User",
      }));

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(offers)
        .where(and(...whereConditions));

      return {
        offers: processedResults,
        totalCount: Number(count),
      };
    } catch (error) {
      log.error("Error in getApprovedOffers", { error, entityId, page, limit });
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
    page,
    limit,
  }: {
    userId: string;
    entityId: string;
    db: any;
    page: number;
    limit: number;
  }) {
    try {
      const offset = (page - 1) * limit;

      log.debug("Getting offers by user id", {
        userId,
        entityId,
        page,
        limit,
      });

      const whereConditions = [
        eq(offers.entityId, entityId),
        eq(offers.userId, userId),
        eq(offers.isActive, true),
      ];

      const results = await db.query.offers.findMany({
        where: and(...whereConditions),
        limit,
        offset,
        orderBy: [desc(offers.createdAt)],
        with: {
          category: true,
          creator: true,
        },
      });

      const processedResults = results.map((offer: any) => ({
        ...offer,
        user: offer.creator,
        addedBy: offer.creator
          ? `${offer.creator.firstName} ${offer.creator.lastName}`
          : "User",
      }));

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(offers)
        .where(and(...whereConditions));

      return {
        offers: processedResults,
        totalCount: Number(count),
      };
    } catch (error) {
      log.error("Error in getOffersByUserId", {
        error,
        userId,
        entityId,
        page,
        limit,
      });
      throw error;
    }
  }

  static async getOfferById({
    offerId,
    entityId,
    db,
  }: {
    offerId: string;
    entityId: string;
    db: any;
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

      return {
        ...result,
        user: result.creator,
        addedBy: result.creator
          ? `${result.creator.firstName} ${result.creator.lastName}`
          : "User",
      };
    } catch (error) {
      log.error("Error in getOfferById", { error, offerId, entityId });
      throw error;
    }
  }
}
