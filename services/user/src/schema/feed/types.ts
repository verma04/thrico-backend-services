export const feedTypes = `#graphql
  scalar Upload
  scalar Date
  enum Status {
    APPROVED
    BLOCKED
    PENDING
    REJECTED
    FLAGGED

    DISABLED
  }
  enum feedPrivacy {
    PUBLIC
    CONNECTIONS
  }
  enum addedByType {
    ENTITY
    USER
  }
  type about {
    headline: String
  }
  type user {
    id: ID
    firstName: String
    avatar: String
    lastName: String
    about: about
    isOnline: Boolean
    # profile: userprofile
    cover: String
    status: Status!
  }


  # type userprofile {
  #   education: [education]
  #   experience: [experience]
  # }

  input pagination {
    offset: Int
    limit: Int
  }

  input FeedCursorInput {
    cursor: String
    limit: Int
  }

  type FeedEdge {
    cursor: String!
    node: feed!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type FeedConnection {
    edges: [FeedEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type poll {
    id: ID
    title: String
    description: String
    options: [pollOption]
    createdAt: Date
    expiresAt: Date
    createdBy: user
    votes: [String]
    totalVotes: Int
    isVoted: Boolean
    isExpired: Boolean
  }

  type pollOption {
    id: ID
    option: String
    votes: Int
  }

  type feedPermissions {
    canEdit: Boolean
    canDelete: Boolean
    canPin: Boolean
    canModerate: Boolean
    canReport: Boolean
  }

  type celebration {
    id: ID
    celebrationType: String
    title: String
    description: String
    cover: String
  }

  # Status enum is repeated, removed duplicate

  input GetFeedStatsInput {
    feedId: ID!
  }

  type FeedStats {
    feedId: ID!
    basicStats: BasicStats!
    reactionBreakdown: [ReactionStat!]!
    commentsOverTime: [CommentOverTime!]!
    engagementByConnections: [EngagementStat!]!
    impressions: Int!
    reach: Int!
  }

  type BasicStats {
    totalReactions: Int!
    totalComments: Int!
    totalShares: Int!
    createdAt: String!
  }

  type ReactionStat {
    reactionsType: String!
    count: Int!
  }

  type CommentOverTime {
    date: Date!
    count: Int!
  }

  type EngagementStat {
    isConnection: Boolean!
    reactions: Int!
    comments: Int!
  }

  input GetFeedReactionsInput {
    feedId: ID!
    offset: Int
    limit: Int
  }

  type FeedReaction {
    id: ID!
    createdAt: Date!
    user: user!
  }
   type jobFeed {
    id: ID
    title: String
    company: JSON

    description: String
    location: JSON
    jobType: String
    workplaceType: String
  }
   type listing {
    id: ID
    title: String
    description: String
    location: String
    condition: String
    category: String
    price: String
    createdAt: Date
    media: [String]
    currency: String
  }

  type feed {
    isLiked: Boolean
    id: ID
    description: String
    user: user
    createdAt: Date
    totalComment: Int
    totalReactions: Int
    totalReShare: Int
    isWishList: Boolean
    isOwner: Boolean
    source: String
    media: [String]
    # group: group
    privacy: feedPrivacy
    job: jobFeed
    offer: Offer
    marketPlace: listing
    repostId: ID
    # event: event
    # story: stories
    addedBy: addedByType
    poll: poll
    forum: discussionForum
    celebration: celebration
    videoUrl: String
    thumbnailUrl: String
    status: Status
    isPinned: Boolean
    pinnedAt: Date
    permissions: feedPermissions
    communityFeedData: communityFeedData
  }

  type communityFeedData {
    status: String
    priority: String
    isPinned: Boolean
  }
  extend type Query {
    getAllOffer: [Offer]
    getCommunitiesFeed: [feed]
    getJobFeed: [feed]
    getUserEventsFeed: [feed]

    getFeed(input: FeedCursorInput): FeedConnection!
    getFeedComment(input: CommentCursorInput!): CommentConnection!
    getPersonalizedFeed: [feed]
    getMarketPlaceFeed: [feed]
    getFeedDetailsById(input: inputId): feed
    # checkUserOnline is already in typeDefs.ts, should check conflict
    # checkUserOnline: status # Commented out to avoid conflict if it exists
    getUserActivityFeed(input: inputId!): [feed]
    getMyFeed(input: FeedCursorInput): FeedConnection!
    getFeedStats(input: GetFeedStatsInput!): FeedStats!
    getFeedReactions(input: GetFeedReactionsInput!): [FeedReaction!]!
 # Added missing query def based on resolver
  }
  input inputPollOption {
    option: String!
  }

  input inputPoll {
    title: String!
    question: String!
    options: [inputPollOption!]!
    lastDate: String!
    resultVisibility: String!
  }

  input inputCelebration {
    type: String
    image: String
  }

  input EditFeedCommentInput {
    commentId: ID!
    content: String!
  }

  input inputForum {
    category: String
    content: String
    title: String
    isAnonymous: Boolean
  }
  input inputAddFeed {
    description: String
    media: [Upload]
    source: String
    groupID: ID
    privacy: feedPrivacy
    hashtags: [String]
    celebration: inputCelebration
    poll: inputPoll
    forum: inputForum
    video: Upload
    thumbnail: Upload
  }

  input inputGroupFeed {
    description: String
    media: [Upload]
    source: String
    groupID: ID
    privacy: feedPrivacy
    hashtags: [String]
    celebration: inputCelebration
    poll: inputPoll
    forum: inputForum
    groupId: ID! # duplicates groupID?
    video: Upload
    thumbnail: Upload
  }
  input inputComment {
    comment: String!
    feedID: ID!
  }
  input inputDeleteFeedComment {
    feedId: ID!
    commentId: ID!
  }
  type CommentPermissions {
    canDelete: Boolean!
    canEdit: Boolean!
    canReport: Boolean!
  }

  type comment {
    id: ID
    content: String
    createdAt: Date
    user: user
    isOwner: Boolean
    isPostOwner: Boolean
    permissions: CommentPermissions
  }

  input CommentCursorInput {
    feedId: ID!
    cursor: String
    limit: Int
  }

  type CommentEdge {
    cursor: String!
    node: comment!
  }

  type CommentConnection {
    edges: [CommentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }
  type status {
    status: Boolean
  } # Conflict with existing types? 'status' might be common.
  # The user snippet had 'type status { status: Boolean }' but 'Status' enum.
  # The 'checkUserOnline' returns 'status' type. In typeDefs.ts it returns 'checkUserOnlineResponse'.
  # I will comment out conflicting types.

  input repostFeedWithThought {
    feedId: ID!
    description: String
    privacy: feedPrivacy!
  }

  input pinFeedInput {
    feedId: ID!
    isPinned: Boolean!
  }

  extend type Mutation {
    addFeedCommunities(input: inputGroupFeed): feed
    wishListFeed(input: inputId): status
    repostFeedWithThought(input: repostFeedWithThought!): feed
    likeFeed(input: inputId): status
    addFeed(input: inputAddFeed): feed
    addComment(input: inputComment): comment
    deleteFeed(input: inputId): feed
    deleteCommentFeed(input: inputDeleteFeedComment): comment
    pinFeed(input: pinFeedInput!): feed
    editFeedComment(input: EditFeedCommentInput!): comment!
  }
 # Added based on resolver
  }
`;
