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

  extend type Query {
    getUserGamificationProfile: GamificationProfile
    getUserEarnedBadges: [EarnedBadge!]!
    getUserPointsHistory: [PointsHistory!]!
    getEntityBadges: [Badge!]!
    getUserGamificationSummary: GamificationSummary!
    getUserLeaderboard(input: GamificationLeaderboardInput): GamificationLeaderboard!
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
`;
