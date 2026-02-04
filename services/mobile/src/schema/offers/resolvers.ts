import { OfferService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const offersResolvers = {
  Query: {
    async getOffers(_: any, { input }: any, context: any) {
      try {
        const { entityId, db } = await checkAuth(context);
        const { categoryId, offset = 1, limit = 10, search } = input || {};

        const result = await OfferService.getApprovedOffers({
          entityId,
          db,
          page: offset,
          limit,
          categoryId,
          search,
        });

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
        const { entityId, db } = await checkAuth(context);
        const { categoryId, page = 1, limit = 10 } = input || {};
        const { id } = await checkAuth(context);

        const result = await OfferService.getOffersByUserId({
          entityId,
          db,
          page,
          limit,
          userId: id,
        });

        return result;
      } catch (error) {
        console.error("Error in getOffersByUserId (user):", error);
        throw error;
      }
    },
    async getOfferById(_: any, { offerId }: any, context: any) {
      try {
        const { entityId, db } = await checkAuth(context);

        const result = await OfferService.getOfferById({
          offerId,
          entityId,
          db,
        });

        return result;
      } catch (error) {
        console.error("Error in getOfferById (user):", error);
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
  },
};
