import * as admin from "firebase-admin";
import { log } from "@thrico/logging";
import { PushNotificationPayload, NotificationService } from "@thrico/services";

export class PushProcessor {
  private static isInitialized = false;

  private static initialize() {
    if (this.isInitialized) return;

    try {
      // In a real production environment, this would come from process.env.FIREBASE_SERVICE_ACCOUNT
      // For this environment, we use the provided service account JSON.
      const serviceAccountJson = {
        type: "service_account",
        project_id: "thrico-75ae2",
        private_key_id: "b2e267442e6e6e81d099b9e71edcafe348a257a6",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDCszuRklwAd8nG\nIUxnCawQohR/QKhFekj7aeN4YpwFXuERSFXTprVW51pE4nJ1Z7Q9p3A8cIVRiHij\np6XF1dcy2rg9Q2pzHYp3QV1r/kZc9Nn0npDcWsRLHW3M9zRZ2WCcwklDCsMWuxn2\ng+FHHPJ1e2dLnTO/nHDVTVz76hc/jDN6TKltuwM5wt+M1hXTv+Bj9viMEjFoF2V3\n8F70L8pPMnF0MMDhmSWmARWX3d5mzm2rcLQho9RewGeIi/TON2z23MeLwq3K1AFD\nNKpsZNc2FJT317f5bAZtROxGSlhIiFn0RmS2WV70ZzBJxuPF3T/d/uJpoWNr9HGQ\nWRKkV19JAgMBAAECggEAEs7DBpcjjYUEx/+f9IUd6rZpcfhyONHs+mJab57g8PDf\nH28EIW+lbUlociaIxXgY1GrX//KjokJjWvW/IPr88IPpz7szLX8RSN9W0a+Mpv6d\nDlEB79NRymrDmEzZ8QL7XvEyqAgCW/ADfEl1icvNTRV4XzjGjrAjQyuXu5r7l279\nup3GdS94WFPJ9Yfotzq5HwLBeZxnb+vJbQjtKgFS0aekmvKIjTOLJFdI9QfmAysg\nRKy1uayz6+hx8MLh3YhHTWY6/HOo7rc+cGGsTCrXTLgmqeRAeN4WW16XvtxfDBB4\nxw5WvFRfh0ih2ZcPMy5PyMWV1yxmLuOm2fpaRhP1/QKBgQDq84nGEFHcbBNRoq6X\n/NRcpfEfkeqVPTOfd/gmiDRCCalM/sODNtcfaAvq4wJeRGJfD4jyfL17Ig9t6rVw\njxYdej4KT37Yxd7UDdprE7glNKUXWYlOUcSmg3yU4p3xc41DMfFw2jeuseRzgMhp\n+qmhC8U3f6QgUU7zNdPdlCkclQKBgQDUJI77ym7sPOTJ9itnbnjmgvqYrT9VtlHH\npRJtDdWWupqcbFKaSjMF+UcH21RYrMDbbujIEXo+uczkqVwWODBzcE42Y5g9dFDK\nrWByhsxRnspEgjxnPnktAQvbeGnGQc6+05gOl6gEhnrOaCuFhWLAc6WpYxw7pE1z\niAOyI6wW5QKBgHEZoyzRFlcBP5uAsINBlgizaQtFdqM4vuz5F1+VGXLgq7sAuKUl\ndRENSQ9dD/rI+IHCPK5eFeh8UOkcnxL8Di1KdysHcYxwU//IW2hIKdDfMsm2tD4b\nZoqxqPsSy+07Lrk2BX/JzBwwTkS7rb42iAmaXOmGbD+SZGr3cnGrrM6xAoGBALEB\nV/Qq8eZW4KbKqWiBuorLGoCtfTztBMtJplgrxN0hEcQWdc2av3vqhCPAE15xtfDh\nV4UnYBJaQOVBkj5P381SFVA4RVxxYr/ZbbHhWzV3AlmrOO8EJ2Mvjk8u50Kuwexi\n7Gqwi1ZLRshWDoo3wy/EzqLIuVPiQWV2RW8raHkpAoGAcvV0qhLz0XnT3VBqXbDz\nRtBbBubmYLUCVX8iDA0H1D4VkRsLaU2o9rvIhcaZqnUXtBeh8uMefOVfbBs3cHlS\njsqLUEzP9Ui5oOmTA7HzGahfEJXd0GWOC9dYDPQG3w2i0aj+K61wqSJ0nY95I5yu\nEPpl8aPESmNHxx3Xzr2TBAM=\n-----END PRIVATE KEY-----\n",
        client_email:
          "firebase-adminsdk-fbsvc@thrico-75ae2.iam.gserviceaccount.com",
        client_id: "114632537499849668048",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:
          "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40thrico-75ae2.iam.gserviceaccount.com",
        universe_domain: "googleapis.com",
      };

      log.info(
        "Attempting to initialize Firebase Admin in Notification Worker",
        {
          projectId: serviceAccountJson.project_id,
          clientEmail: serviceAccountJson.client_email,
        },
      );

      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccountJson as admin.ServiceAccount,
        ),
      });

      this.isInitialized = true;
      log.info(
        "🔥 Firebase Admin initialized successfully in Notification Worker",
      );
    } catch (error: any) {
      log.error(
        "❌ Failed to initialize Firebase Admin in Notification Worker",
        {
          error: error.message,
        },
      );
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
        notification: { title, body },
        data: {
          ...payload,
          ...Object.keys(payload).reduce((acc: any, key) => {
            acc[key] = String(payload[key]);
            return acc;
          }, {}),
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } },
          headers: { "apns-priority": "10" },
        },
        android: {
          priority: "high",
          notification: { sound: "default" },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      log.info("Successfully sent push notifications via Notification Worker", {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            log.error("FCM Delivery Error in Notification Worker", {
              token: tokens[idx],
              error: resp.error,
            });

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
      log.error("Error processing FCM message in Notification Worker", {
        error: error.message,
      });
      throw error;
    }
  }
}
