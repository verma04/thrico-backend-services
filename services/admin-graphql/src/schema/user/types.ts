export const userTypes = `#graphql
  # scalar JSON is already defined in main typeDefs
  scalar Date
  type userToEntity {
    verification: verification
    isApproved: Boolean
    isRequested: Boolean

    user: User
    status: Status
    userKyc: userKyc
    lastActive: Date
    isOnline: Boolean
    id: ID

    gamificationSummary: UserGamificationStats
    activityLog(limit: Int, offset: Int): [GamificationActivityEntry!]
    earnedBadges(limit: Int, cursor: String): UserBadgeConnection
    auditLog(limit: Int, offset: Int): [UserAuditLog!]
    stats: UserStats
  }
  type userKyc {
    referralSource: [String]
    comment: String
    affliction: [String]
  }
  

   type User {
    isOnline: Boolean
    cover: String
    avatar: String
    location: JSON
    profile: userProfile
    about: about
  }

  type userProfile {
    country: String
    language: String
    phone: phone
    timeZone: String
    DOB: String
    gender: String

    headline: String
    currentPosition: String
    education: [education]
    experience: [experience]
    categories: [String]
    skills: JSON
  }
  type verification {
    id: ID
    isVerifiedAt: Date
    isVerified: Boolean
    verificationReason: String
  }
  type social {
    url: String
    platform: String
  }
  type about {
    social: [social]
  
    headline: String
    currentPosition: String
    about: String
  }
  type education {
    id: String
    school: company
    degree: String
    grade: String
    activities: String
    description: String
    duration: [String]
  }

  type company {
    id: String
    name: String
    logo: String
  }
  type experience {
    id: String
    company: company
    duration: [String]
    employmentType: String

    locationType: String
    title: String
    startDate: String
    currentlyWorking: Boolean
    location: JSON
  }
  type userSetting {
    autoApprove: Boolean
  }
  type phone {
    areaCode: String
    countryCode: Int
    isoCode: String
    phoneNumber: String
  }
  input inputId {
    id: ID
  }
  enum Status {
    ALL
    APPROVED
    BLOCKED
    PENDING
    REJECTED
    FLAGGED
    ENABLED
    DISABLED
  }
  enum action {
    APPROVE
    BLOCK
    DISABLE
    ENABLE
    UNBLOCK
    REJECT
    FLAG
    VERIFY
    UNVERIFY
    REAPPROVE
  }
  input statusInput {
    action: action!
    userId: ID!
    reason: String!
  }
  input bulkStatusInput {
    action: action!
    userIds: [ID!]!
    reason: String!
  }
  input allStatusInput {
    status: Status!
    limit: Int
    offset: Int
  }
  input userSettings {
    autoApprove: Boolean
  }
  input UserReportInput {
    userId: ID!
    limit: Int
    offset: Int
    cursor: String
  }
  type getUserAnalytics {
    totalMembers: Int
    verifiedMembers: Int
    verifiedPercent: Int
    activeMembers: Int
    activePercent: Int
    newMembersThisMonth: Int
  }

  type UserStats {
    totalPosts: Int
    totalComments: Int
    totalConnections: Int
    totalGroups: Int
    totalEvents: Int
    totalListings: Int
    totalOffers: Int
    totalJobs: Int
  }



  type UserBadgeEdge {
    cursor: String!
    node: Badge!
  }

  type UserBadgeConnection {
    edges: [UserBadgeEdge!]!
    pageInfo: PageInfo!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    totalCount: Int
    limit: Int
  }

  type UserGrowth {
    date: String
    count: Int
  }

  type UserRoleDistribution {
    name: String
    value: Int
  }

  type UserAuditLog {
    id: ID!
    action: String
    status: String
    performedBy: User
    reason: String
    previousState: JSON
    newState: JSON
    createdAt: Date
  }

  extend type Query {
    getUserDetailsById(input: inputId): userToEntity
    getAllUser(input: allStatusInput): [userToEntity]
    getUserSettings: userSetting
    getUserAnalytics(timeRange: TimeRange): getUserAnalytics
    getUserGrowth(timeRange: TimeRange!): [UserGrowth]
    getUserRoleDistribution(timeRange: TimeRange!): [UserRoleDistribution]
    getUserStats(input: UserReportInput!): UserStats
    getUserGamificationSummary(input: UserReportInput!): UserGamificationStats
    getUserActivityLog(input: UserReportInput!): [GamificationActivityEntry!]
    getUserEarnedBadges(input: UserReportInput!): UserBadgeConnection
    getUserAuditLogs(input: UserReportInput!): [UserAuditLog!]
    getAllEntityAuditLogs(limit: Int, offset: Int): [UserAuditLog!]
  }

  extend type Mutation {
    changeUserStatus(input: statusInput): userToEntity
    bulkChangeUserStatus(input: bulkStatusInput): [userToEntity]
    updateUserSettings(input: userSettings): userSetting
    changeUserVerification(input: statusInput): userToEntity
  }
`;
