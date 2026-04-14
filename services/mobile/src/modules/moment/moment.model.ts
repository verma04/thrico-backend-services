export const momentTypes = `#graphql
  enum MomentStatus {
    UPLOADING
    PROCESSING
    PUBLISHED
    FAILED
  }

  type MomentOwner {
    id: ID
    firstName: String
    lastName: String
    avatar: String
    headline: String
  }

  type Moment {
    id: ID!
    tenantId: String!
    userId: String!
    entityId: String!
    videoUrl: String!
    optimizedVideoUrl: String
    hlsUrl: String
    thumbnailUrl: String
    thumbnailOptions: [String!]
    caption: String!
    status: MomentStatus!
    createdAt: Date
    updatedAt: Date
    owner: MomentOwner
    totalReactions: Int
    totalComments: Int
    totalReshares: Int
    totalViews: Int
    isLiked: Boolean
    isWishlisted: Boolean
    isOwner: Boolean
    similarityScore: Float
    isAiContent: Boolean
  }

  type DailyStats {
    date: String!
    count: Int!
  }

  type MomentAnalytics {
    momentId: ID!
    totalViews: Int!
    totalReactions: Int!
    totalComments: Int!
    totalReshares: Int!
    averageWatchTime: Float
    completionRate: Float
    engagementRate: Float
    viewsByDay: [DailyStats!]
  }

  type MomentDashboardAnalytics {
    totalMoments: Int!
    totalViews: Int!
    totalReactions: Int!
    totalComments: Int!
    averageEngagementRate: Float
    topMoments: [Moment!]
    recentPerformance: [DailyStats!]
  }

  type MomentComment {
    id: ID!
    content: String!
    userId: String!
    momentId: String!
    createdAt: Date
    user: MomentOwner
    isOwner: Boolean
    isPostOwner: Boolean
  }

  input GenerateMomentUploadInput {
    videoFileName: String!
    videoFileType: String!
    videoFileSize: Int!

    thumbnailFileName: String!
    thumbnailFileType: String!
    thumbnailFileSize: Int!
  }

  type GenerateMomentUploadResponse {
    momentId: ID
    videoUploadUrl: String
    videoFileUrl: String
    thumbnailUploadUrl: String
    thumbnailFileUrl: String
    expiresIn: Int
  }

  input ConfirmMomentUploadInput {
    fileUrl: String!
    caption: String!
    thumbnailUrl: String
    shareInFeed: Boolean
    isAiContent: Boolean
  }

  input MomentCursorInput {
    cursor: String
    limit: Int
  }

  type MomentEdge {
    cursor: String!
    node: Moment!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type MomentConnection {
    edges: [MomentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type MomentCommentEdge {
    cursor: String!
    node: MomentComment!
  }

  type MomentCommentConnection {
    edges: [MomentCommentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input TrackMomentWatchTimeInput {
    momentId: ID!
    totalDuration: Int!
    watchDurationSeconds: Int!
  }

  input UpdateMomentInput {
    caption: String
    thumbnailUrl: String
    isAiContent: Boolean
  }

  extend type Query {
    getMoment(id: ID!): Moment
    getAllMoments(input: MomentCursorInput): MomentConnection!
    getMyMoments(input: MomentCursorInput): MomentConnection!
    getUserMoments(userId: ID!, input: MomentCursorInput): MomentConnection!
    getMomentComments(momentId: ID!, input: MomentCursorInput): MomentCommentConnection!
    searchMoments(query: String!, input: MomentCursorInput): MomentConnection!
    getSimilarMoments(momentId: ID!, input: MomentCursorInput): MomentConnection!
    getRecommendedMoments(input: MomentCursorInput): MomentConnection!
    getMyConnectionMoments(input: MomentCursorInput): MomentConnection!
    getMomentAnalytics(momentId: ID!): MomentAnalytics!
    getMyMomentsAnalyticsDashboard: MomentDashboardAnalytics!
  }


  extend type Mutation {
    generateMomentUploadUrl(input: GenerateMomentUploadInput!): GenerateMomentUploadResponse
    confirmMomentUpload(input: ConfirmMomentUploadInput!): Moment
    momentUpload(input: ConfirmMomentUploadInput!): Moment
    updateMoment(id: ID!, input: UpdateMomentInput!): Moment
    toggleMomentReaction(momentId: ID!): Moment
    addMomentComment(momentId: ID!, content: String!): MomentComment
    toggleMomentWishlist(momentId: ID!): Moment
    incrementMomentView(momentId: ID!): Boolean
    trackMomentWatchTime(input: TrackMomentWatchTimeInput!): Boolean
    deleteMoment(momentId: ID!): Boolean
    deleteMomentComment(commentId: ID!): Boolean
    uploadImage(file: Upload!): String!
  }


`;
