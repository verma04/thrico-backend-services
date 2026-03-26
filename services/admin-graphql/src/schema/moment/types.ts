export const momentTypes = `#graphql
  scalar Date
  enum AdminMomentStatus {
    UPLOADING
    PROCESSING
    PUBLISHED
    FAILED
  }

  type AdminMomentOwner {
    id: ID!
    firstName: String
    lastName: String
    avatar: String
    headline: String
  }

  type AdminMoment {
    id: ID!
    tenantId: String!
    userId: String!
    entityId: String!
    videoUrl: String!
    optimizedVideoUrl: String
    hlsUrl: String
    thumbnailUrl: String
    caption: String!
    status: AdminMomentStatus!
    createdAt: Date
    updatedAt: Date
    owner: AdminMomentOwner
    totalReactions: Int
    totalComments: Int
    totalReshares: Int
    totalViews: Int
    detectedCategory: String
    extractedKeywords: [String]
    sentimentScore: Float
  }

  type AdminMomentConnection {
    data: [AdminMoment!]!
    meta: PaginationMeta!
  }

  input AdminUpdateMomentInput {
    caption: String
    thumbnailUrl: String
    status: AdminMomentStatus
  }

  type MomentAnalytics {
    totalMoments: Int
    totalViews: Int
    totalReactions: Int
    totalComments: Int
    activeCreators: Int
    growth: [MomentGrowth]
    engagement: [MomentEngagement]
  }

  type MomentGrowth {
    date: String
    count: Int
  }

  type MomentEngagement {
    name: String
    value: Int
  }

  extend type Query {
    getAllMoments(pagination: PaginationInput): AdminMomentConnection!
    getMomentDetailsById(input: inputId!): AdminMoment
    getMomentAnalytics(timeRange: TimeRange!): MomentAnalytics
  }

  extend type Mutation {
    adminDeleteMoment(id: ID!): Boolean
    adminEditMoment(id: ID!, input: AdminUpdateMomentInput!): AdminMoment
  }
`;
