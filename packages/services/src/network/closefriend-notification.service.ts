import { log } from "@thrico/logging";
import { NetworkNotificationService } from "./network-notification.service";
export enum Module {}
export interface NotifySubscribersParams {
  db?: any;
  creatorId: string;
  entityId: string;
  type: string;
  contentId: string;
  title: string;
  module: "COMMUNITY" | "FEED" | "JOB" | "LISTING";
}

export class CloseFriendNotificationService {
  private static QUEUE_NAME = "CLOSE_FRIEND_NOTIFICATIONS";

  static async publishNotificationTask(params: NotifySubscribersParams) {
    return NetworkNotificationService.publishCloseFriendNotification(params);
  }

  static async notifySubscribers(params: NotifySubscribersParams) {
    return NetworkNotificationService.publishCloseFriendNotification(params);
  }
}
