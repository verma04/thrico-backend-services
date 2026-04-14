export const momentTypes = `#graphql
  scalar Date
  enum AdminMomentStatus {
    UPLOADING
    PROCESSING
    PUBLISHED
    FAILED
  }

  enum AddedBy {
    USER
    ENTITY
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
    addedBy: AddedBy
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

  input AdminGenerateMomentUploadInput {
    videoFileName: String!
    videoFileType: String!
    videoFileSize: Int!
    thumbnailFileName: String!
    thumbnailFileType: String!
    thumbnailFileSize: Int!
  }

  type AdminGenerateMomentUploadResponse {
    momentId: ID
    videoUploadUrl: String
    videoFileUrl: String
    thumbnailUploadUrl: String
    thumbnailFileUrl: String
    expiresIn: Int
  }

  input AdminConfirmMomentUploadInput {
    fileUrl: String!
    caption: String!
    thumbnailUrl: String
    shareInFeed: Boolean
    isAiContent: Boolean
    userId: String
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
    adminGenerateMomentUploadUrl(input: AdminGenerateMomentUploadInput!): AdminGenerateMomentUploadResponse
    adminConfirmMomentUpload(input: AdminConfirmMomentUploadInput!): AdminMoment
    adminMomentUpload(input: AdminConfirmMomentUploadInput!): AdminMoment
  }
`;
