export const gamificationTypes = `#graphql
  type GamificationRank {
    id: ID!
    name: String!
    minPoints: Int
    maxPoints: Int
    color: String
    icon: String
  }

  type GamificationProfile {
    id: ID!
    totalPoints: Int!
    currentRankId: String
    currentRank: GamificationRank
    user: String!
    entityId: String!
    rank: Int
    totalBadges: Int
  }

  type Badge {
    id: ID!
    name: String!
    type: String!
    icon: String
    description: String
  }

  type EarnedBadge {
    id: ID!
    earnedAt: Date!
    progress: Int
    isCompleted: Boolean!
    badge: Badge!
  }

  type PointsHistoryRule {
    action: String!
    description: String
  }

  type PointsHistory {
    id: ID!
    pointsEarned: Int!
    createdAt: Date!
    metadata: JSON
    rule: PointsHistoryRule!
  }

  type GamificationSummary {
    totalPoints: Int!
    weekPoints: Int!
    monthPoints: Int!
    totalBadges: Int!
    totalRanks: Int!
    weeklyGrowth: Float!
  }

  type EarnedBadgeEdge {
    cursor: String!
    node: EarnedBadge!
  }

  type EarnedBadgeConnection {
    edges: [EarnedBadgeEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PointsHistoryEdge {
    cursor: String!
    node: PointsHistory!
  }

  type PointsHistoryConnection {
    edges: [PointsHistoryEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input GamificationPaginationInput {
    cursor: String
    limit: Int
  }

  extend type Query {
    getUserGamificationProfile: GamificationProfile
    getUserEarnedBadges(input: GamificationPaginationInput): EarnedBadgeConnection!
    getUserPointsHistory(input: GamificationPaginationInput): PointsHistoryConnection!
    getEntityBadges: [Badge!]!
    getUserGamificationSummary: GamificationSummary!
    getUserLeaderboard(input: GamificationLeaderboardInput): GamificationLeaderboard!
    getUserNextLevelProgress: NextLevelProgress!
    getGamificationStatsByUserId(userId: ID!): GamificationProfile
  }

  input GamificationLeaderboardInput {
    limit: Int
    offset: Int
  }

  type GamificationLeaderboardEntry {
    user: user
    totalPoints: Int!
    rank: Int!
    badgesCount: Int!
    currentRank: GamificationRank
  }

  type GamificationLeaderboard {
    entries: [GamificationLeaderboardEntry!]!
    totalUsers: Int!
    userEntry: GamificationLeaderboardEntry
  }

  type NextLevelProgress {
    currentPoints: Int!
    nextLevelPoints: Int!
    pointsToNextLevel: Int!
    percentage: Float!
    currentRank: GamificationRank
    nextRank: GamificationRank
  }
`;
