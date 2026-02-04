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

  type BannedWord {
    id: ID!
    entityId: ID!
    word: String!
    severity: Severity!
    category: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type BlockedLink {
    id: ID!
    entityId: ID!
    url: String!
    type: LinkType!
    isBlocked: Boolean!
    reason: String
    createdAt: String!
  }

  type ContentReport {
    id: ID!
    entityId: ID!
    contentType: String!
    contentId: String!
    reportedBy: User!
    reportedUser: User!
    reason: String!
    status: ReportStatus!
    resolvedBy: User
    resolvedAt: String
    createdAt: String!
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
    createdAt: String!
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

  extend type Query {
    getBannedWords(limit: Int, offset: Int): PaginatedBannedWordResponse!
    getBlockedLinks(limit: Int, offset: Int): PaginatedBlockedLinkResponse!
    getContentReports(
      status: ReportStatus
      contentType: String
      limit: Int
      offset: Int
    ): PaginatedContentReportResponse!
    getModerationSettings: ModerationSettings!
    getModerationStats: ModerationStats!
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
