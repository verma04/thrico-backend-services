import { OfferService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const offersResolvers = {
  Query: {
    async getOffers(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId, role } = await checkAuth(context);
        const { categoryId, cursor, limit = 10, search } = input || {};

        const result = await OfferService.getApprovedOffers({
          entityId,
          db,
          cursor,
          limit,
          categoryId,
          search,
          currentUserId: userId,
          role,
        });

        console.log(result?.edges?.[0]?.node);

        return result;
      } catch (error) {
        console.error("Error in getOffers (user):", error);
        throw error;
      }
    },
    async getOfferCategories(_: any, __: any, context: any) {
      try {
        const { entityId, db } = await checkAuth(context);
        return await OfferService.getOfferCategories({
          entityId,
          db,
        });
      } catch (error) {
        console.error("Error in getOfferCategories (user):", error);
        throw error;
      }
    },

    async getOffersByUserId(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId, role } = await checkAuth(context);
        const { cursor, limit = 10 } = input || {};

        const result = await OfferService.getOffersByUserId({
          entityId,
          db,
          cursor,
          limit,
          userId,
          currentUserId: userId,
          role,
        });

        return result;
      } catch (error) {
        console.error("Error in getOffersByUserId (user):", error);
        throw error;
      }
    },

    async getMyOffers(_: any, { input }: any, context: any) {
      try {
        const { entityId, db, userId, role } = await checkAuth(context);
        const { cursor, limit = 10 } = input || {};

        const result = await OfferService.getOffersByUserId({
          entityId,
          db,
          cursor,
          limit,
          userId,
          currentUserId: userId,
          role,
        });

        return result;
      } catch (error) {
        console.error("Error in getMyOffers:", error);
        throw error;
      }
    },

    async getOfferById(_: any, { offerId }: any, context: any) {
      try {
        const { entityId, db, userId, role } = await checkAuth(context);

        const result = await OfferService.getOfferById({
          offerId,
          entityId,
          db,
          currentUserId: userId,
          role,
        });

        return result;
      } catch (error) {
        console.error("Error in getOfferById (user):", error);
        throw error;
      }
    },

    async getOfferStats(_: any, { offerId }: any, context: any) {
      try {
        const { entityId, db } = await checkAuth(context);

        return await OfferService.getOfferStats({
          offerId,
          entityId,
          db,
        });
      } catch (error) {
        console.error("Error in getOfferStats:", error);
        throw error;
      }
    },
  },

  Mutation: {
    async createOffer(_: any, { input }: any, context: any) {
      try {
        const { entityId, userId, db } = await checkAuth(context);

        const newOffer = await OfferService.createOffer({
          input,
          userId,
          entityId,
          db,
        });

        return newOffer;
      } catch (error) {
        console.error("Error in createOffer (user):", error);
        throw error;
      }
    },

    async editOffer(_: any, { offerId, input }: any, context: any) {
      try {
        const { entityId, userId, db } = await checkAuth(context);

        const updatedOffer = await OfferService.updateOffer({
          offerId,
          input,
          userId,
          entityId,
          db,
        });

        return updatedOffer;
      } catch (error) {
        console.error("Error in editOffer:", error);
        throw error;
      }
    },

    async claimOffer(_: any, { offerId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const updatedOffer = await OfferService.claimOffer({
          offerId,
          userId,
          db,
        });

        return updatedOffer;
      } catch (error) {
        console.error("Error in claimOffer (user):", error);
        throw error;
      }
    },

    async trackOfferVisual(_: any, { offerId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        await OfferService.trackOfferVisual({
          offerId,
          userId,
          db,
        });

        return true;
      } catch (error) {
        console.error("Error in trackOfferVisual (user):", error);
        throw error;
      }
    },

    async shareOffer(_: any, { offerId }: any, context: any) {
      try {
        const { entityId, userId, db } = await checkAuth(context);

        const updatedOffer = await OfferService.shareOffer({
          offerId,
          userId,
          entityId,
          db,
        });

        return updatedOffer;
      } catch (error) {
        console.error("Error in shareOffer (user):", error);
        throw error;
      }
    },

    async deleteOffer(_: any, { offerId }: any, context: any) {
      try {
        const { entityId, userId, db } = await checkAuth(context);

        return await OfferService.deleteOffer({
          offerId,
          userId,
          entityId,
          db,
        });
      } catch (error) {
        console.error("Error in deleteOffer:", error);
        throw error;
      }
    },
  },
};
