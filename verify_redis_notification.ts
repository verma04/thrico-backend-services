import {
  pushNotificationToCache,
  getNotificationsFromCache,
  clearNotificationCache,
} from "./packages/database/src/redis/notification";
import { log } from "@thrico/logging";

async function verify() {
  const entityId = "test-entity-id";
  const userId = "test-user-id";

  const testNotification = {
    id: "test-notif-id",
    content: "This is a test notification",
    notificationType: "FEED_LIKE",
    createdAt: new Date().toISOString(),
  };

  console.log("--- Clearing Cache ---");
  await clearNotificationCache(entityId, userId);

  console.log("--- Pushing Notification ---");
  await pushNotificationToCache(entityId, userId, testNotification);

  console.log("--- Getting Notifications ---");
  const notifications = await getNotificationsFromCache(entityId, userId);
  console.log(
    "Retrieved notifications:",
    JSON.stringify(notifications, null, 2),
  );

  if (
    notifications.length === 1 &&
    notifications[0].id === testNotification.id
  ) {
    console.log(
      "✅ Verification Successful: Notification correctly cached and retrieved.",
    );
  } else {
    console.error(
      "❌ Verification Failed: Notification not found or incorrect.",
    );
  }

  process.exit(0);
}

verify().catch((err) => {
  console.error("Error during verification:", err);
  process.exit(1);
});
