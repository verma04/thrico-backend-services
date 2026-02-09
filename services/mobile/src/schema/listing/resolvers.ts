// import { ListingService } from "@/services/logic/listing/listing.service";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  ListingContactService,
  ListingReportService,
  ListingService,
} from "@thrico/services";
import { GraphQLError } from "graphql";

// PLACEHOLDER: ListingService is missing from the codebase.
// Using a Proxy to allow compilation. All method calls will throw at runtime.

const marketPlaceResolvers: any = {
  Query: {
    async getAllListing(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search || "";
        return ListingService.getAllListings(db, entityId, userId, {
          cursor,
          limit,
          search,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getFeaturedListings(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search || "";
        return ListingService.getFeaturedListings(db, entityId, userId, {
          cursor,
          limit,
          search,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getTrendingListings(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const search = input?.search || "";
        return ListingService.getTrendingListings(db, entityId, userId, {
          cursor,
          limit,
          search,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getMyListings(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        const status = input?.status || "ALL";
        const search = input?.search || "";

        if (status === "ALL") {
          return ListingService.getMyListings(db, entityId, userId, {
            cursor,
            limit,
            search,
          });
        } else {
          return ListingService.getMyListingsByStatus(
            db,
            entityId,
            userId,
            status,
            { cursor, limit, search },
          );
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getUserListingEnquiries(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        return ListingContactService.getUserListingEnquiries({
          db,
          userId,
          cursor,
          limit,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async hasContactedSeller(_: any, { listingId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const hasContacted = await ListingContactService.hasContactedSeller(
          db,
          listingId,
          userId,
        );
        return { hasContacted };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getSellerReceivedEnquiries(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 10;
        return ListingContactService.getSellerReceivedEnquiries(
          db,
          userId,
          cursor,
          limit,
        );
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getListingConversationMessages(
      _: any,
      { conversationId, input }: any,
      context: any,
    ) {
      try {
        const { userId, db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 50;
        return ListingContactService.getListingConversationMessages(
          db,
          conversationId,
          userId,
          cursor,
          limit,
        );
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getListingStatus(_: any, { listingId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        return ListingService.getListingStatus(db, listingId);
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getListingDetailsById(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const { identifier } = input;

        return ListingService.getListingDetailsById(
          db,
          entityId,
          identifier,
          userId,
        );
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getRelatedListingsByListingId(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const { listingId, limit } = input;

        const listings = await ListingService.getRelatedListingsByListingId(
          db,
          entityId,
          listingId,
          userId,
          limit || 6,
        );

        return { listings };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getListingsByUserId(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const { userId: targetUserId, cursor, limit } = input;

        return ListingService.getListingsByUserId(
          db,
          entityId,
          targetUserId,
          userId,
          { cursor, limit: limit || 10 },
        );
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    // New: Get all enquiries for a specific listing (seller view)
    async getListingEnquiries(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const { listingId, cursor, limit } = input;

        return ListingService.getListingEnquiries(db, listingId, userId, {
          cursor,
          limit: limit || 10,
        });
      } catch (error) {
        console.log(error);
        throw new GraphQLError(
          error instanceof Error
            ? error.message
            : "Failed to fetch listing enquiries",
          { extensions: { code: "INTERNAL_SERVER_ERROR" } },
        );
      }
    },

    // New: Get enquiry statistics for a listing
    async getListingEnquiryStats(_: any, { listingId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        return ListingService.getListingEnquiryStats(db, listingId, userId);
      } catch (error) {
        console.log(error);
        throw new GraphQLError(
          error instanceof Error
            ? error.message
            : "Failed to fetch enquiry statistics",
          { extensions: { code: "INTERNAL_SERVER_ERROR" } },
        );
      }
    },

    // New: Get enquiries grouped by buyer
    // async getListingEnquiriesGroupedByBuyer(
    //   _: any,
    //   { listingId }: any,
    //   context: any
    // ) {
    //   try {
    //     const { userId, db } = await checkAuth(context);

    //     return ListingService.getListingEnquiriesGroupedByBuyer(
    //       db,
    //       listingId,
    //       userId
    //     );
    //   } catch (error) {
    //     console.log(error);
    //     throw new GraphQLError(
    //       error instanceof Error
    //         ? error.message
    //         : "Failed to fetch grouped enquiries",
    //       { extensions: { code: "INTERNAL_SERVER_ERROR" } }
    //     );
    //   }
    // },
    async mapViewAllListings(_: any, { input }: any, context: any) {
      try {
        const { entityId, db } = await checkAuth(context);
        const cursor = input?.cursor;
        const limit = input?.limit || 100;
        return ListingService.mapViewAllListings(db, entityId, {
          cursor,
          limit,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },

  Mutation: {
    async addListing(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        const newListing = await ListingService.createListing(
          db,
          entityId,
          userId,
          input,
        );
        return newListing;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async editListing(_: any, { listingId, input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        const updatedListing = await ListingService.updateListing(
          db,
          entityId,
          userId,
          listingId,
          input,
        );
        return updatedListing;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async reportListing(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        return ListingReportService.reportListing({
          db,
          entityId,
          userId,
          input,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async markListingAsSold(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const { listingId } = input;

        return ListingService.markAsSold(db, listingId, id, true);
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteListing(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return ListingService.deleteListing(db, input.listingId, userId);
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async contactSeller(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        const contactInput = {
          listingId: input.listingId,
          message: input.message,
          buyerId: userId,
        };

        return ListingContactService.contactSeller({
          db,
          entityId,
          input: contactInput,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async sendMessage(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        if (!input.content || input.content.trim().length === 0) {
          throw new GraphQLError("Message content cannot be empty", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        return ListingContactService.sendMessage({
          db,
          conversationId: input.conversationId,
          senderId: userId,
          content: input.content.trim(),
        });
      } catch (error) {
        console.log(error);
        throw new GraphQLError(
          error instanceof Error ? error.message : "Failed to send message",
          { extensions: { code: "INTERNAL_SERVER_ERROR" } },
        );
      }
    },
  },
};

export { marketPlaceResolvers };
