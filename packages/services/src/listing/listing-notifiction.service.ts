// Adjust the import path as needed
import { type AppDatabase } from "@thrico/database";

export class ListingNotificationService {
  // Create a new listing notification with transaction
  static async createListingNotification({
    userId,
    listing,
    db,
  }: {
    userId: string;
    listing: any;
    db: AppDatabase;
  }) {
    const listingStatus = listing.status;
    if (listingStatus === "APPROVED") {
      const notificationMessage = `Your listing "${listing.title}" has been approved.`;

      // Use a transaction to insert the notification
      await db.transaction(async (trx) => {
        // await trx.insert(listingNotification).values({
        //   user: userId,
        //   listing: listing.id,
        //   message: notificationMessage,
        //   createdAt: new Date(),
        //   status: "UNREAD", // Adjust as per your schema
        // });
      });
    }
  }
}
