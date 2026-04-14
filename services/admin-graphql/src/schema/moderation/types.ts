export const moderationTypes = `#graphql
  enum Severity {
    LOW
    MEDIUM
    HIGH
  }

  enum LinkType {
    DOMAIN
    URL
    PATTERN
  }

  enum ReportStatus {
    PENDING
    RESOLVED
    DISMISSED
  }

  enum AiClassification {
    safe
    spam
    offensive
    harassment
  }

  enum ModerationContentType {
    POST
    COMMENT
    MARKETPLACE
    COMMUNITY
    EVENT
    SHOP
    OFFER
    JOB
    DISCUSSION_FORUM
    DISCUSSION_FORUM_COMMENT
    MESSAGE
    USER
  }

  type BannedWord {
    id: ID!
    entityId: ID!
    word: String!
    severity: Severity!
    category: String
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type BlockedLink {
    id: ID!
    entityId: ID!
    url: String!
    type: LinkType!
    isBlocked: Boolean!
    reason: String
    createdAt: Date!
  }

  type ContentReport {
    id: ID!
    entityId: ID!
    contentType: ModerationContentType!
    contentId: String!
    contentPreview: String
    reportedBy: User!
    reportedUser: User!
    reason: String!
    status: ReportStatus!
    reportsCount: Int
    resolvedBy: User
    resolvedAt: String
    createdAt: Date!
  }

  type ModerationSettings {
    id: ID!
    entityId: ID!
    autoModerationEnabled: Boolean!
    bannedWordsAction: String!
    blockedLinksAction: String!
    spamDetectionEnabled: Boolean!
    spamThreshold: Int!
    autoFlagThreshold: Int!
    autoHideThreshold: Int!
    aiClassificationDefinitions: JSON
    createdAt: Date!
    updatedAt: String!
  }

  type ModerationStats {
    totalReports: Int!
    pendingReports: Int!
    resolvedReports: Int!
    bannedWordsCount: Int!
    blockedLinksCount: Int!
    autoModeratedToday: Int!
  }

  input ModerationSettingsInput {
    autoModerationEnabled: Boolean
    bannedWordsAction: String
    blockedLinksAction: String
    spamDetectionEnabled: Boolean
    spamThreshold: Int
    autoFlagThreshold: Int
    autoHideThreshold: Int
    aiClassificationDefinitions: JSON
  }

  type PaginatedBannedWordResponse {
    items: [BannedWord!]!
    totalCount: Int!
  }

  type PaginatedBlockedLinkResponse {
    items: [BlockedLink!]!
    totalCount: Int!
  }

  type PaginatedContentReportResponse {
    items: [ContentReport!]!
    totalCount: Int!
  }

  type AiModerationLog {
    id: ID!
    contentId: String!
    entityId: String!
    classification: AiClassification
    confidence: Float
    model: String
    reason: String
    createdAt: Date!
  }

  type PaginatedAiModerationLogResponse {
    items: [AiModerationLog!]!
    totalCount: Int!
  }

  type ModerationLog {
    id: ID!
    entityId: ID!
    contentId: String!
    contentType: ModerationContentType!
    contentPreview: String
    userId: ID
    aiScore: Float
    aiLabel: AiClassification
    aiCategories: JSON
    decision: String
    actionTaken: String
    reason: String
    createdAt: Date!
    user: User
  }

  type PaginatedModerationLogResponse {
    items: [ModerationLog!]!
    totalCount: Int!
  }

  type AiTokenUsage {
    id: ID!
    entityId: ID!
    module: String!
    tokens: Int!
    model: String!
    createdAt: Date!
  }

  type PaginatedAiTokenUsageResponse {
    items: [AiTokenUsage!]!
    totalCount: Int!
  }

  type AiModerationDashboard {
    totalPosts: Int!
    pendingModeration: Int!
    flaggedContent: Int!
    rejectedPosts: Int!
    totalTokens: Int!
  }

  extend type Query {
    getBannedWords(limit: Int, offset: Int): PaginatedBannedWordResponse!
    getBlockedLinks(limit: Int, offset: Int): PaginatedBlockedLinkResponse!
    getContentReports(
      status: ReportStatus
      contentType: ModerationContentType
      limit: Int
      offset: Int
    ): PaginatedContentReportResponse!
    getModerationSettings: ModerationSettings!
    getModerationStats(timeRange: TimeRange, dateRange: DateRangeInput): ModerationStats!
    getAiModerationLogs(limit: Int, offset: Int, classification: AiClassification): PaginatedAiModerationLogResponse!
    getAiModerationDashboard(timeRange: TimeRange, dateRange: DateRangeInput): AiModerationDashboard!
    getModerationLogs(limit: Int, offset: Int, contentType: ModerationContentType, userId: ID, aiLabel: AiClassification): PaginatedModerationLogResponse!
    getAiTokenUsage(limit: Int, offset: Int, module: String): PaginatedAiTokenUsageResponse!
  }

  extend type Mutation {
    addBannedWord(
      word: String!
      severity: Severity!
      category: String
    ): BannedWord!
    updateBannedWord(
      id: ID!
      word: String
      severity: Severity
      category: String
      isActive: Boolean
    ): BannedWord!
    deleteBannedWord(id: ID!): Boolean!

    addBlockedLink(
      url: String!
      type: LinkType!
      isBlocked: Boolean!
      reason: String
    ): BlockedLink!
    updateBlockedLink(
      id: ID!
      url: String
      type: LinkType
      isBlocked: Boolean
      reason: String
    ): BlockedLink!
    deleteBlockedLink(id: ID!): Boolean!

    resolveReport(id: ID!, action: String!): ContentReport!
    dismissReport(id: ID!): ContentReport!

    updateModerationSettings(
      input: ModerationSettingsInput!
    ): ModerationSettings!
  }
`;
