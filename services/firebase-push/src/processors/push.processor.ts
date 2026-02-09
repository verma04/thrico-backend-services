import * as admin from "firebase-admin";
import { log } from "@thrico/logging";
import { PushNotificationPayload, NotificationService } from "@thrico/services";

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

      // Debug: Check for essential fields
      const requiredFields = [
        "project_id",
        "private_key",
        "client_email",
        "type",
      ];
      const missingFields = requiredFields.filter((f) => !serviceAccount[f]);

      if (missingFields.length > 0) {
        log.error("❌ Firebase Service Account is missing fields", {
          missingFields,
        });
        return;
      }

      log.info("Attempting to initialize Firebase Admin", {
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
      });

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.isInitialized = true;
      log.info("🔥 Firebase Admin initialized successfully in Push Worker");
    } catch (error: any) {
      log.error("❌ Failed to initialize Firebase Admin in Push Worker", {
        error: error.message,
        stack: error.stack,
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

            // Handle invalid registration tokens
            if (
              resp.error?.code === "messaging/registration-token-not-registered"
            ) {
              NotificationService.removeInvalidDeviceToken(tokens[idx]).catch(
                (err: any) => {
                  log.error("Failed to remove invalid device token", {
                    token: tokens[idx],
                    error: err.message,
                  });
                },
              );
            }
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
