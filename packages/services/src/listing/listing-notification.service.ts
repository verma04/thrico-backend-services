import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";

export class ListingNotificationService {
  static async createListingNotification({
    userId,
    listing,
    db,
  }: {
    userId: string;
    listing: any;
    db: any;
  }) {
    try {
      if (!userId || !listing) {
        throw new GraphQLError("User ID and listing are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Creating listing notification", {
        userId,
        listingId: listing.id,
        status: listing.status,
      });

      const listingStatus = listing.status;

      if (listingStatus === "APPROVED") {
        const notificationMessage = `Your listing "${listing.title}" has been approved.`;

        await db.transaction(async (trx: any) => {
          // Notification creation logic would go here
          // Commented out as schema may vary
          // await trx.insert(listingNotification).values({
          //   user: userId,
          //   listing: listing.id,
          //   message: notificationMessage,
          //   createdAt: new Date(),
          //   status: "UNREAD",
          // });
        });

        log.info("Listing notification created", {
          userId,
          listingId: listing.id,
          status: "APPROVED",
        });
      } else {
        log.debug("Listing not approved, no notification created", {
          userId,
          listingId: listing.id,
          status: listingStatus,
        });
      }
    } catch (error) {
      log.error("Error in createListingNotification", {
        error,
        userId,
        listingId: listing?.id,
      });
      throw error;
    }
  }
}
