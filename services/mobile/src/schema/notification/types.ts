export const notificationTypes = `#graphql

  enum GamificationNotificationType {
    POINTS_EARNED
    BADGE_UNLOCKED
    RANK_UP
    LEADERBOARD
  }

  type GamificationNotification {
    id: ID!
    type: GamificationNotificationType!
    content: String!
    points: Int
    badgeName: String
    badgeImageUrl: String
    rankName: String
    isRead: Boolean!
    createdAt: Date!
  }

  type PaginatedGamificationNotifications {
    result: [GamificationNotification]
    nextCursor: String
  }


  type UnreadNotificationCounts {
    COMMUNITY: Int
    FEED: Int
    NETWORK: Int
    JOB: Int
    LISTING: Int
    GAMIFICATION: Int
  }

  type ClearNotificationsResponse {
    success: Boolean!
    message: String
  }
    enum notificationType {
    FEED_COMMENT
    FEED_LIKE
    NETWORK
    COMMUNITIES
  }

   enum notificationTypeNetwork {
    CONNECTION_REQUEST
  CONNECTION_ACCEPTED
  }
  type notification {
    id: ID
    type: notificationType
    createdAt: Date
    feed: feed
    content: String
    sender: user
    isRead: Boolean
    module: String
  }
   type notifications {
    result: [notification]
    unread: Int
  }

  extend type Query {
    getUserNotification(input: cursorPaginationInput): paginatedNotifications
    getUnreadNotificationCounts: UnreadNotificationCounts!
    getFeedNotifications(input: cursorPaginationInput): PaginatedFeedNotifications
    getCommunityNotifications(input: cursorPaginationInput): PaginatedCommunityNotifications
    getNetworkNotifications(input: cursorPaginationInput): PaginatedNetworkNotifications
    getJobNotifications(input: cursorPaginationInput): PaginatedJobNotifications
    getListingNotifications(input: cursorPaginationInput): PaginatedListingNotifications
    getGamificationNotifications(input: cursorPaginationInput): PaginatedGamificationNotifications


  }

  extend type Mutation {
   markGamificationNotificationsAsRead: ClearNotificationsResponse!
    markAllNotificationsAsRead(module: String!): ClearNotificationsResponse!
    markNotificationAsRead(id: ID!): ClearNotificationsResponse!
  }

  input paginationInput {
    limit: Int
    offset: Int
  }

  input cursorPaginationInput {
    limit: Int
    cursor: String
  }

  type FeedNotification {
    id: ID
    type: String
    createdAt: Date
    feed: feed
    content: String
    sender: user
    isRead: Boolean
  }

  type PaginatedFeedNotifications {
    result: [FeedNotification]
    nextCursor: String
  }

  type CommunityNotification {
    id: ID
    type: String
    createdAt: Date
    community: group
    content: String
    sender: user
    isRead: Boolean
  }

  type PaginatedCommunityNotifications {
    result: [CommunityNotification]
    nextCursor: String
  }

  type NetworkNotification {
    id: ID
    notificationType: notificationTypeNetwork
    createdAt: Date
    content: String
    sender: user
    isRead: Boolean
  }

  type PaginatedNetworkNotifications {
    result: [NetworkNotification]
    nextCursor: String
  }

  type JobNotification {
    id: ID
    type: String
    createdAt: Date
    job: jobFeed
    content: String
    sender: user
    isRead: Boolean
  }

  type PaginatedJobNotifications {
    result: [JobNotification]
    nextCursor: String
  }

  type ListingNotification {
    id: ID
    type: String
    createdAt: Date
    listing: listing
    content: String
    sender: user
    isRead: Boolean
  }

  type PaginatedListingNotifications {
    result: [ListingNotification]
    nextCursor: String
  }

  type paginatedNotifications {
    result: [notification]
    unread: Int
    nextCursor: String
  }
`;
