import * as admin from "firebase-admin";
import { log } from "@thrico/logging";
import { PushNotificationPayload } from "@thrico/services";

export class PushProcessor {
  private static isInitialized = false;

  private static initialize() {
    if (this.isInitialized) return;

    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (!serviceAccountJson) {
        log.warn(
          "FIREBASE_SERVICE_ACCOUNT not found in environment variables. Push notifications will be mocked.",
        );
        return;
      }

      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.isInitialized = true;
      log.info("🔥 Firebase Admin initialized successfully in Push Worker");
    } catch (error) {
      log.error("❌ Failed to initialize Firebase Admin in Push Worker", {
        error,
      });
    }
  }

  static async processPush(data: PushNotificationPayload) {
    this.initialize();

    if (!this.isInitialized) {
      log.info("PUSH_NOTIFICATION_SENT_MOCK (No Firebase Config in Worker)", {
        tokens: data.tokens,
        notification: { title: data.title, body: data.body },
        data: data.payload,
      });
      return { success: true, mock: true };
    }

    try {
      const { tokens, title, body, payload = {} } = data;

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: {
          ...payload,
          ...Object.keys(payload).reduce((acc: any, key) => {
            acc[key] = String(payload[key]);
            return acc;
          }, {}),
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
          headers: {
            "apns-priority": "10",
          },
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      log.info("Successfully sent push notifications via Worker", {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            log.error("FCM Delivery Error in Worker", {
              token: tokens[idx],
              error: resp.error,
            });
          }
        });
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      log.error("Error processing FCM message in Worker", {
        error: error.message,
      });
      throw error; // Re-throw to trigger RabbitMQ retry if necessary
    }
  }
}
