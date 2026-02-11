import { log } from "@thrico/logging";
import { NotificationService } from "../notification/notification.service";

export class ListingNotificationService {
  /**
   * Notify user that their listing was approved
   */
  static async notifyListingApproved({
    db,
    userId,
    entityId,
    listing,
  }: {
    db: any;
    userId: string;
    entityId: string;
    listing: any;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        module: "LISTING",
        type: "LISTING_APPROVED",
        content: `Your listing "${listing.title}" has been approved.`,
        shouldSendPush: true,
        pushTitle: "Listing Approved",
        pushBody: `Your listing "${listing.title}" is now live!`,
        listingId: listing.id,
      });

      log.info("Listing approved notification sent", {
        userId,
        listingId: listing.id,
      });
    } catch (error: any) {
      log.error("Failed to send listing approved notification", {
        error: error.message,
        userId,
        listingId: listing?.id,
      });
      throw error;
    }
  }

  /**
   * Notify listing owner of a contact/inquiry
   */
  static async notifyListingContact({
    db,
    userId,
    senderId,
    entityId,
    listingId,
    listingTitle,
    contactName,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    listingId: string;
    listingTitle: string;
    contactName: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "LISTING",
        type: "LISTING_CONTACT",
        content: `${contactName} contacted you about your listing "${listingTitle}".`,
        shouldSendPush: true,
        pushTitle: "New Listing Inquiry",
        pushBody: `${contactName} is interested in "${listingTitle}"`,
        listingId,
      });

      log.info("Listing contact notification sent", { userId, listingId });
    } catch (error: any) {
      log.error("Failed to send listing contact notification", {
        error: error.message,
        userId,
        listingId,
      });
    }
  }

  /**
   * Notify listing owner of a message
   */
  static async notifyListingMessage({
    db,
    userId,
    senderId,
    entityId,
    listingId,
    listingTitle,
    senderName,
    messagePreview,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    listingId: string;
    listingTitle: string;
    senderName: string;
    messagePreview?: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "LISTING",
        type: "LISTING_MESSAGE",
        content: `${senderName} sent you a message about "${listingTitle}"${messagePreview ? `: "${messagePreview.substring(0, 50)}..."` : ""}.`,
        shouldSendPush: true,
        pushTitle: "New Listing Message",
        pushBody: `${senderName}: ${messagePreview?.substring(0, 50) || "New message"}`,
        listingId,
      });

      log.info("Listing message notification sent", { userId, listingId });
    } catch (error: any) {
      log.error("Failed to send listing message notification", {
        error: error.message,
        userId,
        listingId,
      });
    }
  }

  /**
   * Notify listing owner of a like
   */
  static async notifyListingLike({
    db,
    userId,
    senderId,
    entityId,
    listingId,
    listingTitle,
    likerName,
  }: {
    db: any;
    userId: string;
    senderId: string;
    entityId: string;
    listingId: string;
    listingTitle: string;
    likerName: string;
  }) {
    try {
      await NotificationService.createNotification({
        db,
        userId,
        senderId,
        entityId,
        module: "LISTING",
        type: "LISTING_LIKE",
        content: `${likerName} liked your listing "${listingTitle}".`,
        shouldSendPush: true,
        pushTitle: "Listing Liked",
        pushBody: `${likerName} liked "${listingTitle}"`,
        listingId,
      });

      log.info("Listing like notification sent", { userId, listingId });
    } catch (error: any) {
      log.error("Failed to send listing like notification", {
        error: error.message,
        userId,
        listingId,
      });
    }
  }

  /**
   * Get all listing notifications for a user
   */
  static async getListingNotifications({
    db,
    userId,
    cursor,
    limit = 10,
  }: {
    db: any;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    try {
      const { lt, desc, and, eq } = await import("drizzle-orm");
      const { listingNotifications, user, userToEntity, marketPlace } =
        await import("@thrico/database");

      log.debug("Getting listing notifications", { userId, cursor, limit });

      const query = db
        .select({
          id: listingNotifications.id,
          type: listingNotifications.type,
          content: listingNotifications.content,
          isRead: listingNotifications.isRead,
          createdAt: listingNotifications.createdAt,
          sender: {
            id: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          listing: marketPlace,
        })
        .from(listingNotifications)
        .leftJoin(
          userToEntity,
          eq(listingNotifications.senderId, userToEntity.id),
        )
        .leftJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(
          marketPlace,
          eq(listingNotifications.listingId, marketPlace.id),
        )
        .where(
          and(
            eq(listingNotifications.userId, userId),
            cursor
              ? lt(listingNotifications.createdAt, new Date(cursor))
              : undefined,
          ),
        )
        .orderBy(desc(listingNotifications.createdAt))
        .limit(limit);

      const result = await query;

      return {
        result,
        nextCursor:
          result.length === limit ? result[result.length - 1].createdAt : null,
      };
    } catch (error) {
      log.error("Error in getListingNotifications", { error, userId });
      throw error;
    }
  }
}

// Import required for the getter method
import { and, desc, eq } from "drizzle-orm";
