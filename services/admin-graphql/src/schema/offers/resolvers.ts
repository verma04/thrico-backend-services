import { sql, eq, and, ilike, or } from "drizzle-orm";
import {
  offers,
  offerCategories,
  offerVerification,
  offerAuditLogs,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";

export const offersResolvers = {
  Query: {
    async getOfferStats(_: any, { timeRange }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const stats = await db
          .select({
            totalOffers: sql`count(*)`.mapWith(Number),
            activeOffers:
              sql`count(*) filter (where ${offers.status} = 'APPROVED' and ${offers.isActive} = true)`.mapWith(
                Number,
              ),
            claims: sql`sum(${offers.claimsCount})`.mapWith(Number),
            views: sql`sum(${offers.viewsCount})`.mapWith(Number),
          })
          .from(offers)
          .where(eq(offers.entityId, entity));

        const result = stats[0] || {
          totalOffers: 0,
          activeOffers: 0,
          claims: 0,
          views: 0,
        };

        return {
          ...result,
          totalOffersChange: 0,
          activeOffersChange: 0,
          claimsChange: 0,
          viewsChange: 0,
        };
      } catch (error) {
        console.error("Error in getOfferStats:", error);
        throw error;
      }
    },

    async getOffers(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);
        const { categoryId, status, search, pagination } = input || {};
        const { page = 1, limit = 10 } = pagination || {};
        const offset = (page - 1) * limit;

        const whereConditions = [eq(offers.entityId, entity)];

        if (categoryId) {
          whereConditions.push(eq(offers.categoryId, categoryId));
        }
        if (status) {
          whereConditions.push(eq(offers.status, status));
        }
        if (search) {
          whereConditions.push(
            or(
              ilike(offers.title, `%${search}%`),
              ilike(offers.description, `%${search}%`),
            ) as any,
          );
        }

        const results = await db.query.offers.findMany({
          where: and(...whereConditions),
          limit,
          offset,
          orderBy: (offers: any, { desc }: any) => [desc(offers.createdAt)],
          with: {
            category: true,
            verification: true,
          },
        });

        return results;
      } catch (error) {
        console.error("Error in getOffers:", error);
        throw error;
      }
    },

    async getOfferCategories(_: any, __: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const categories = await db.query.offerCategories.findMany({
          where: eq(offerCategories.entityId, entity),
          with: {
            offers: true,
          },
        });

        return categories.map((cat: any) => ({
          ...cat,
          offersCount: cat.offers.length,
        }));
      } catch (error) {
        console.error("Error in getOfferCategories:", error);
        throw error;
      }
    },
  },

  Mutation: {
    async createOffer(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        console.log({
          ...input,
          entityId: entity,
          validityStart: input.validityStart
            ? new Date(input.validityStart)
            : null,
          validityEnd: input.validityEnd ? new Date(input.validityEnd) : null,
          isApprovedAt: input.isApprovedAt
            ? new Date(input.isApprovedAt)
            : null,
          addedBy: "ENTITY",
        });
        const [newOffer] = await db
          .insert(offers)
          .values({
            ...input,
            status: "APPROVED",
            entityId: entity,
            validityStart: input.validityStart
              ? new Date(input.validityStart)
              : null,
            validityEnd: input.validityEnd ? new Date(input.validityEnd) : null,
            isApprovedAt: input.isApprovedAt
              ? new Date(input.isApprovedAt)
              : null,
            addedBy: "ENTITY",
          })
          .returning();

        return await db.query.offers.findFirst({
          where: eq(offers.id, newOffer.id),
          with: {
            category: true,
            verification: true,
          },
        });
      } catch (error) {
        console.error("Error in createOffer:", error);
        throw error;
      }
    },

    async updateOffer(_: any, { id, input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const updateData = { ...input };
        if (input.validityStart)
          updateData.validityStart = new Date(input.validityStart);
        if (input.validityEnd)
          updateData.validityEnd = new Date(input.validityEnd);
        if (input.isApprovedAt)
          updateData.isApprovedAt = new Date(input.isApprovedAt);

        await db
          .update(offers)
          .set(updateData)
          .where(and(eq(offers.id, id), eq(offers.entityId, entity)));

        return await db.query.offers.findFirst({
          where: eq(offers.id, id),
          with: {
            category: true,
            verification: true,
          },
        });
      } catch (error) {
        console.error("Error in updateOffer:", error);
        throw error;
      }
    },

    async deleteOffer(_: any, { id }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const result = await db
          .delete(offers)
          .where(and(eq(offers.id, id), eq(offers.entityId, entity)))
          .returning();

        return result.length > 0;
      } catch (error) {
        console.error("Error in deleteOffer:", error);
        throw error;
      }
    },

    async createOfferCategory(_: any, { input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const [newCategory] = await db
          .insert(offerCategories)
          .values({
            ...input,
            entityId: entity,
          })
          .returning();

        return {
          ...newCategory,
          offersCount: 0,
        };
      } catch (error) {
        console.error("Error in createOfferCategory:", error);
        throw error;
      }
    },

    async updateOfferCategory(_: any, { id, input }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        const [updatedCategory] = await db
          .update(offerCategories)
          .set(input)
          .where(
            and(
              eq(offerCategories.id, id),
              eq(offerCategories.entityId, entity),
            ),
          )
          .returning();

        if (!updatedCategory) {
          throw new GraphQLError("Offer category not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const offersList = await db.query.offers.findMany({
          where: eq(offers.categoryId, id),
        });

        return {
          ...updatedCategory,
          offersCount: offersList.length,
        };
      } catch (error) {
        console.error("Error in updateOfferCategory:", error);
        throw error;
      }
    },

    async changeOfferStatus(_: any, { input }: any, context: any) {
      const { db, entity, userId } = await checkAuth(context);
      const { id, action, reason } = input;

      try {
        const offer = await db.query.offers.findFirst({
          where: and(eq(offers.id, id), eq(offers.entityId, entity)),
        });

        if (!offer) {
          throw new GraphQLError("Offer not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const statusMap: Record<string, string> = {
          APPROVE: "APPROVED",
          REJECT: "REJECTED",
          DISABLE: "DISABLED",
          PENDING: "PENDING",
        };

        const newStatus = statusMap[action];
        if (!newStatus) {
          throw new GraphQLError(`Invalid action: ${action}`, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const updateData: any = {
          status: newStatus,
        };

        if (newStatus === "APPROVED") {
          updateData.isApprovedAt = new Date();
        }

        await db.transaction(async (tx: any) => {
          await tx.update(offers).set(updateData).where(eq(offers.id, id));

          await tx.insert(offerAuditLogs).values({
            offerId: id,
            status: "STATUS",
            performedBy: userId,
            reason: reason || `Status changed to ${newStatus}`,
            previousState: { status: offer.status },
            newState: { status: newStatus },
            entity,
          });
        });

        return await db.query.offers.findFirst({
          where: eq(offers.id, id),
          with: {
            category: true,
            verification: true,
          },
        });
      } catch (error) {
        console.error("Error in changeOfferStatus:", error);
        throw error;
      }
    },

    async deleteOfferCategory(_: any, { id }: any, context: any) {
      try {
        const { entity, db } = await checkAuth(context);

        // Check if there are offers associated with this category
        const connectedOffers = await db.query.offers.findFirst({
          where: eq(offers.categoryId, id),
        });

        if (connectedOffers) {
          throw new GraphQLError(
            "Cannot delete category with associated offers",
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }

        const result = await db
          .delete(offerCategories)
          .where(
            and(
              eq(offerCategories.id, id),
              eq(offerCategories.entityId, entity),
            ),
          )
          .returning();

        return result.length > 0;
      } catch (error) {
        console.error("Error in deleteOfferCategory:", error);
        throw error;
      }
    },

    async verifyOffer(_: any, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        const { db } = auth;
        const { offerId, isVerified, verificationReason } = input;

        const [verification] = await db
          .insert(offerVerification)
          .values({
            offerId,
            isVerified,
            verificationReason,
            verifiedBy: auth.userId,
            isVerifiedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: offerVerification.offerId,
            set: {
              isVerified,
              verificationReason,
              verifiedBy: auth.userId,
              isVerifiedAt: new Date(),
            },
          })
          .returning();

        return verification;
      } catch (error) {
        console.error("Error in verifyOffer:", error);
        throw error;
      }
    },
  },
};
