export const feedTypes = `#graphql
  enum feedPrivacy {
    PUBLIC
    CONNECTIONS
  }
  enum addedByType {
    ENTITY
    USER
  }

  enum TimeRange {
    LAST_24_HOURS
    LAST_7_DAYS
    LAST_30_DAYS
    LAST_90_DAYS
    THIS_MONTH
    LAST_MONTH
  }

  input DateRangeInput {
    startDate: String!
    endDate: String!
  }
  
  type FeedUserAbout {
    currentPosition: String
  }

  type FeedUser {
    id: ID
    firstName: String
    avatar: String
    lastName: String
    about: FeedUserAbout
    isOnline: Boolean
    cover: String
  }

  type FeedMedia {
  
    url: String

  }
  
  type Feed {
    isLiked: Boolean
    id: String
    description: String
    user: FeedUser
    createdAt: Date
    totalComment: Int
    totalReactions: Int
    totalReShare: Int
    isWishList: Boolean
    isOwner: Boolean
    source: String
    media: [FeedMedia]
  
    privacy: feedPrivacy
    addedBy: addedByType
    poll: polls
    moment: AdminMoment
    job: Job
    marketPlace: MarketPlaceListing
    isPinned: Boolean
    pinnedAt: Date
  }

  input InputAddFeed {
    description: String!
    # media: [Upload]
  }
  
  input InputId {
    id: ID!
  }

  input PaginationInput {
    offset: Int
    limit: Int
  }
  
  input InputComment {
    comment: String!
    feedID: ID!
  }
  
  input InputDeleteFeedComment {
    commentId: ID!
  }

  input PinFeedInput {
    feedId: ID!
    isPinned: Boolean!
  }

  input UpdateFeedOrderInput {
    order: [String!]!
  }

  type Status {
    status: Boolean
  }
  
  type Comment {
    id: ID
    content: String
    createdAt: Date
    user: FeedUser
    addedBy: addedByType!
    feedId: ID
  }

  type FeedIntelligenceKPI {
    aggregateReach: Float
    activeDialogue: Int
    networkVelocity: Float
    engagementYield: Float
    reachTrend: Float
    dialogueTrend: Float
    velocityTrend: Float
    yieldTrend: Float
  }

  type FeedYieldVelocity {
    day: String
    signups: Int
  }

  type FeedInterestMatrix {
    name: String
    value: Int
    color: String
  }

  type PromotedNodeEvent {
    title: String
    date: String
    time: String
    location: String
    description: String
  }

  extend type Query {
    getAllFeed(input: PaginationInput): [Feed]
    getAdminFeed(input: PaginationInput): [Feed]
    getJobFeed(input: PaginationInput): [Feed]
    getMomentsFeed(input: PaginationInput): [Feed]
    getListingFeed(input: PaginationInput): [Feed]
    getPinnedFeed(input: PaginationInput): [Feed]
    getPollsFeed(input: PaginationInput): [Feed]
    numberOfFeeds: Int
    getFeedComment(input: InputId): [Comment]
    getFeedIntelligenceKPI(timeRange: TimeRange, dateRange: DateRangeInput): FeedIntelligenceKPI
    getFeedYieldVelocity(timeRange: TimeRange, dateRange: DateRangeInput): [FeedYieldVelocity]
    getFeedInterestMatrix(timeRange: TimeRange, dateRange: DateRangeInput): [FeedInterestMatrix]
    getPromotedNodeEvents(timeRange: TimeRange, dateRange: DateRangeInput): [PromotedNodeEvent]
    momentsFeed(input: PaginationInput): [Feed]
    pollsFeed(input: PaginationInput): [Feed]
    feedByAdmin(input: PaginationInput): [Feed]
    adminFeed(input: PaginationInput): [Feed]
  }

  extend type Mutation {
    likeFeed(input: InputId): Status
    addFeed(input: InputAddFeed): Feed
    addComment(input: InputComment): Comment
    deleteCommentFeed(input: InputDeleteFeedComment): Comment
    pinFeed(input: PinFeedInput): Feed
    deleteFeed(input: InputId): Status
    updateFeedOrder(input: UpdateFeedOrderInput!): Boolean
  }
`;
