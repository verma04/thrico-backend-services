import { and, eq, inArray } from "drizzle-orm";
import {
  getDb,
  closeFriends,
  user,
  userToEntity,
  feedNotifications,
  communityNotifications,
  jobNotifications,
  listingNotifications,
} from "@thrico/database";
import { log } from "@thrico/logging";
import { NotificationService } from "@thrico/services";

export interface CloseFriendNotificationTask {
  creatorId: string;
  entityId: string;
  type: string;
  contentId: string;
  title: string;
  timestamp: string;
  module: "FEED" | "COMMUNITY" | "JOB" | "LISTING";
}

interface Subscriber {
  subscriberId: string | null;
}

export class CloseFriendNotificationProcessor {
  static async process(task: CloseFriendNotificationTask) {
    const db = getDb();

    const { creatorId, entityId, type, contentId, title, module } = task;

    console.log("Processing close friend notification task", {
      creatorId,
      entityId,
      type,
      contentId,
      title,
      module,
    });
    try {
      log.debug("Processing close friend notification task", {
        creatorId,
        type,
      });

      const entity = await db.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity.entityId, entityId),
          eq(userToEntity.userId, creatorId),
        ),
      });

      if (!entity) {
        log.debug("Entity not found for task", { entityId });
        return;
      }

      // Find all users who have this creator in their close friends list
      const subscribers = await db
        .select({
          subscriberId: user.id,
        })
        .from(closeFriends)
        .leftJoin(userToEntity, eq(closeFriends.userId, userToEntity.id))
        .leftJoin(user, eq(userToEntity.userId, user.id))
        .where(
          and(
            eq(closeFriends.friendId, entity.id),
            eq(closeFriends.entityId, entityId),
          ),
        );

      if (subscribers.length === 0) {
        log.debug("No close friend subscribers found for task", { creatorId });
        return;
      }

      // Fetch creator details
      const creator = await db.query.user.findFirst({
        where: eq(user.id, creatorId),
      });

      const creatorName = creator
        ? `${creator.firstName} ${creator.lastName}`.trim()
        : "A close friend";

      // Filter out subscribers who already received this notification
      const subscriberIds = subscribers
        .map((s) => s.subscriberId)
        .filter((id): id is string => id !== null);

      if (subscriberIds.length === 0) return;

      let existingNotificationUserIds: string[] = [];

      try {
        if (module === "FEED") {
          const existing = await db
            .select({ userId: feedNotifications.userId })
            .from(feedNotifications)
            .where(
              and(
                eq(feedNotifications.feedId, contentId),
                eq(feedNotifications.type, type as any),
                inArray(feedNotifications.userId, subscriberIds),
              ),
            );
          existingNotificationUserIds = existing.map((e: any) => e.userId);
        } else if (module === "JOB") {
          const existing = await db
            .select({ userId: jobNotifications.userId })
            .from(jobNotifications)
            .where(
              and(
                eq(jobNotifications.jobId, contentId),
                eq(jobNotifications.type, type as any),
                inArray(jobNotifications.userId, subscriberIds),
              ),
            );
          existingNotificationUserIds = existing.map((e: any) => e.userId);
        } else if (module === "LISTING") {
          const existing = await db
            .select({ userId: listingNotifications.userId })
            .from(listingNotifications)
            .where(
              and(
                eq(listingNotifications.listingId, contentId),
                eq(listingNotifications.type, type as any),
                inArray(listingNotifications.userId, subscriberIds),
              ),
            );
          existingNotificationUserIds = existing.map((e: any) => e.userId);
        } else if (module === "COMMUNITY") {
          const existing = await db
            .select({ userId: communityNotifications.userId })
            .from(communityNotifications)
            .where(
              and(
                // Assuming contentId is the communityId or related ID
                eq(communityNotifications.communityId, contentId),
                eq(communityNotifications.type, type as any),
                inArray(communityNotifications.userId, subscriberIds),
              ),
            );
          existingNotificationUserIds = existing.map((e: any) => e.userId);
        }
      } catch (checkErr) {
        log.warn("Failed to check for duplicate close friend notifications", {
          error: checkErr,
        });
        // Proceed without filtering if check fails
      }

      const usersToNotify = subscriberIds.filter(
        (id) => !existingNotificationUserIds.includes(id),
      );

      if (usersToNotify.length === 0) {
        log.info("All subscribers already notified, skipping", {
          creatorId,
          type,
          contentId,
        });
        return;
      }

      log.info(
        `Notifying ${usersToNotify.length} close friend subscribers from worker (skipped ${existingNotificationUserIds.length} duplicates)`,
        {
          creatorId,
          type,
        },
      );

      // Create notifications for each subscriber
      const notificationPromises = usersToNotify.map((subscriberId) => {
        const pushTitle = `Close Friend Update`;
        const pushBody = `${creatorName} posted a new ${type.toLowerCase().replace("_", " ")}: ${title}`;

        return NotificationService.createNotification({
          db,
          userId: subscriberId,
          senderId: creatorId,
          entityId,
          module: module,
          type: type,
          content: pushBody,
          shouldSendPush: true,
          pushTitle,
          pushBody,
          imageUrl: creator?.avatar || undefined,
          contentId: contentId,
        }).catch((err: Error) => {
          log.error(
            "Failed to send close friend subscriber notification from worker",
            {
              subscriberId: subscriberId,
              creatorId,
              error: err.message,
            },
          );
        });
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      log.error("Error in CloseFriendNotificationProcessor", {
        error: error instanceof Error ? error.message : String(error),
        creatorId,
        type,
      });
      throw error; // Re-throw to allow for potential retry if needed (though current queue logic acks anyway)
    }
  }
}
