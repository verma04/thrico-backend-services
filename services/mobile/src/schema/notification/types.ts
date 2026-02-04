export const notificationTypes = `#graphql
  type GamificationNotification {
    type: String!
    title: String!
    message: String!
    points: Int
    badge: JSON
    rank: JSON
    payload: JSON
    createdAt: Date!
    isRead: Boolean!
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
  type notification {
    id: ID
    notificationType: notificationType
    createdAt: Date
    feed: feed
    content: String
    sender: user
  }
   type notifications {
    result: [notification]
    unread: [String]
  }

  extend type Query {
    getUserNotification(input: paginationInput): notifications
    getGamificationNotifications: Int!
    getGamificationNotification(input: paginationInput): [GamificationNotification!]!
    getNetworkNotification: Int!
  }

  extend type Mutation {
   markGamificationNotificationsAsRead: ClearNotificationsResponse!
  }
`;
