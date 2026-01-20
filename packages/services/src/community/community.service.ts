import { CommunityAnalyticsService } from "./analytics.service";
import { BaseCommunityService } from "./base.service";
import { CommunityManagementService } from "./management.service";
import { CommunityQueryService } from "./query.service";
import { CommunityActionsService } from "./actions.service";

// Re-export all services
export { BaseCommunityService } from "./base.service";
export { CommunityAnalyticsService } from "./analytics.service";
export { CommunityManagementService } from "./management.service";
export { CommunityQueryService } from "./query.service";
export { CommunityActionsService } from "./actions.service";

// Main service that combines all functionality
export class CommunityService {
  // Base functionality
  static hasGroupPermission = BaseCommunityService.hasGroupPermission;
  static getGroupJoinRequests = BaseCommunityService.getGroupJoinRequests;
  static getCommunityMembers = BaseCommunityService.getCommunityMembers;
  static getCommunityStats = BaseCommunityService.getCommunityStats;
  static trackCommunityView = BaseCommunityService.trackCommunityView;
  static sendCommunityNotification =
    BaseCommunityService.sendCommunityNotification;

  // Analytics
  static getCommunityAnalytics =
    CommunityAnalyticsService.getCommunityAnalytics;

  // Management
  static createCommunity = CommunityManagementService.createCommunity;
  static editCommunity = CommunityManagementService.editCommunity;

  // Queries
  static getAllCommunities = CommunityQueryService.getAllCommunities;
  static getCommunityDetails = CommunityQueryService.getCommunityDetails;
  static getMyOwnedCommunities = CommunityQueryService.getMyOwnedCommunities;
  static getFeaturedCommunities = CommunityQueryService.getFeaturedCommunities;
  static getTrendingCommunities = CommunityQueryService.getTrendingCommunities;
  static getMyJoinedCommunities = CommunityQueryService.getMyJoinedCommunities;
  static getMySavedCommunities = CommunityQueryService.getMySavedCommunities;
  static getCommunitiesByUserId = CommunityQueryService.getCommunitiesByUserId;
}
