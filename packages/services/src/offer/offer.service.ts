import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { offers, offerCategories } from "@thrico/database";

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
    db: any;
  }) {
    try {
      if (!input || !userId || !entityId) {
        throw new GraphQLError("Input, User ID, and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Creating offer", { userId, entityId, title: input.title });

      const [newOffer] = await db
        .insert(offers)
        .values({
          ...input,
          entityId,
          userId,
          status: "PENDING",
          addedBy: "USER",
          validityStart: input.validityStart
            ? new Date(input.validityStart)
            : null,
          validityEnd: input.validityEnd ? new Date(input.validityEnd) : null,
        })
        .returning();

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
  }: {
    entityId: string;
    db: any;
    page: number;
    limit: number;
    categoryId?: string;
  }) {
    try {
      const offset = (page - 1) * limit;

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

      const results = await db.query.offers.findMany({
        where: and(...whereConditions),
        limit,
        offset,
        orderBy: [desc(offers.createdAt)],
        with: {
          category: true,
        },
      });

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(offers)
        .where(and(...whereConditions));

      return {
        offers: results,
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
            eq(offerCategories.isActive, true)
          )
        )
        .orderBy(asc(offerCategories.name));

      return results;
    } catch (error) {
      log.error("Error in getOfferCategories", { error, entityId });
      throw error;
    }
  }
}
