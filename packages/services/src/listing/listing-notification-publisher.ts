import { RabbitMQService } from "../utils/rabbitmq.service";
import { log } from "@thrico/logging";
import { NotificationService } from "../notification/notification.service";

export interface ListingEventPayload {
  eventName: "LISTING_APPROVED" | "LISTING_INQUIRY" | "LISTING_MESSAGE";
  userId: string;
  listingId: string;
  listing: any;
  sender?: any;
  timestamp: string;
  details?: any;
}

export class ListingNotificationPublisher {
  private static QUEUE_NAME = "LISTING_EVENTS";

  static async publishListingApproved({
    userId,
    listingId,
    listing,
    db,
    entityId,
  }: {
    userId: string;
    listingId: string;
    listing: any;
    db: any;
    entityId: string;
  }) {
    try {
      const imageUrl = listing.media?.[0]?.url
        ? listing.media?.[0]?.url
        : "default_listing.png";

      // 1. Create in-app notification and trigger push
      await NotificationService.createNotification({
        db,
        userId,
        entityId,
        notificationType: "LISTING_APPROVED",
        content: `Your listing "${listing.title}" has been approved.`,
        shouldSendPush: true,
        pushTitle: "Listing Approved",
        pushBody: `Your listing "${listing.title}" has been approved.`,
        imageUrl,
        listingId,
      });

      // 2. Publish to LISTING_EVENTS for other subscribers
      const payload: ListingEventPayload = {
        eventName: "LISTING_APPROVED",
        userId,
        listingId,
        listing,
        timestamp: new Date().toISOString(),
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error("[ListingNotification] Failed to process listing approval", {
        error: error.message,
        listingId,
        userId,
      });
    }
  }

  static async publishListingInquiry({
    sellerId,
    buyerId,
    listingId,
    listing,
    buyer,
    db,
    entityId,
  }: {
    sellerId: string;
    buyerId: string;
    listingId: string;
    listing: any;
    buyer: any;
    db: any;
    entityId: string;
  }) {
    try {
      const imageUrl = listing.media?.[0]?.url
        ? listing.media?.[0]?.url
        : "default_listing.png";

      const buyerName = buyer
        ? `${buyer.firstName || "Someone"} ${buyer.lastName || ""}`.trim()
        : "Someone";

      // 1. Notify Seller
      await NotificationService.createNotification({
        db,
        userId: sellerId,
        senderId: buyerId,
        entityId,
        notificationType: "LISTING_CONTACT",
        content: `${buyerName} is interested in your listing "${listing.title}".`,
        shouldSendPush: true,
        pushTitle: "New Inquiry",
        pushBody: `${buyerName} is interested in your listing "${listing.title}".`,
        imageUrl,
        listingId,
      });

      // 2. Publish to LISTING_EVENTS
      const payload: ListingEventPayload = {
        eventName: "LISTING_INQUIRY",
        userId: sellerId,
        listingId,
        listing,
        sender: buyer,
        timestamp: new Date().toISOString(),
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error("[ListingNotification] Failed to process listing inquiry", {
        error: error.message,
        listingId,
        sellerId,
        buyerId,
      });
    }
  }

  static async publishListingMessage({
    recipientId,
    senderId,
    listingId,
    listing,
    sender,
    message,
    db,
    entityId,
  }: {
    recipientId: string;
    senderId: string;
    listingId: string;
    listing: any;
    sender: any;
    message: string;
    db: any;
    entityId: string;
  }) {
    try {
      const imageUrl = listing.media?.[0]?.url
        ? listing.media?.[0]?.url
        : "default_listing.png";

      const senderName = sender
        ? `${sender.firstName || "Someone"} ${sender.lastName || ""}`.trim()
        : "Someone";

      // 1. Notify Recipient
      await NotificationService.createNotification({
        db,
        userId: recipientId,
        senderId,
        entityId,
        notificationType: "LISTING_MESSAGE",
        content: `${senderName}: ${message}`,
        shouldSendPush: true,
        pushTitle: `New message for "${listing.title}"`,
        pushBody: `${senderName}: ${message}`,
        imageUrl,
        listingId,
      });

      // 2. Publish to LISTING_EVENTS
      const payload: ListingEventPayload = {
        eventName: "LISTING_MESSAGE",
        userId: recipientId,
        listingId,
        listing,
        sender,
        timestamp: new Date().toISOString(),
        details: { message },
      };
      await this.publish(payload);
    } catch (error: any) {
      log.error("[ListingNotification] Failed to process listing message", {
        error: error.message,
        listingId,
        recipientId,
        senderId,
      });
    }
  }

  private static async publish(payload: ListingEventPayload) {
    try {
      await RabbitMQService.publishToQueue(this.QUEUE_NAME, payload);
      log.info(`[ListingNotification] Published ${payload.eventName}`, {
        listingId: payload.listingId,
        userId: payload.userId,
      });
    } catch (error: any) {
      log.error(
        `[ListingNotification] Failed to publish ${payload.eventName}`,
        {
          error: error.message,
          listingId: payload.listingId,
        },
      );
    }
  }
}
