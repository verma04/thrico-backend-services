export const gamificationTypes = `#graphql
  # scalar Date
  # scalar JSON

  # Enums
  enum TriggerType {
    FIRST_TIME
    RECURRING
  }

  enum BadgeType {
    ACTION
    POINTS
  }

  enum RankType {
    POINTS
    BADGES
    HYBRID
  }

  enum Module {
    FEED
    LISTING
  }

  # Point Rules
  type PointRule {
    id: ID!
    module: Module!
    action: String!
    trigger: TriggerType!
    points: Int!
    description: String
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  input CreatePointRuleInput {
    module: Module!
    action: String!
    trigger: TriggerType!
    points: Int!
    description: String
  }

  input UpdatePointRuleInput {
    points: Int
    description: String
    isActive: Boolean
    id: ID
  }

  # Badges
  type Badge {
    id: ID!
    name: String!
    type: BadgeType!
    module: Module
    action: String
    targetValue: Int!
    icon: String
    description: String
    condition: String!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
    # User-specific fields (populated when queried with user context)
    userProgress: UserBadgeProgress
  }

  type UserBadgeProgress {
    id: ID!
    progress: Int!
    isCompleted: Boolean!
    earnedAt: Date
  }

  input CreateBadgeInput {
    name: String!
    type: BadgeType!
    module: Module
    action: String
    targetValue: Int!
    icon: String
    description: String
    condition: String!
  }

  input UpdateBadgeInput {
    name: String
    type: BadgeType
    module: Module
    action: String
    targetValue: Int
    icon: String
    description: String
    condition: String
    isActive: Boolean
  }

  # Ranks
  type Rank {
    id: ID!
    name: String!
    type: RankType!
    minPoints: Int
    maxPoints: Int
    minBadges: Int
    maxBadges: Int
    color: String!
    icon: String
    order: Int!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
    # Statistics
    userCount: Int
  }

  input CreateRankInput {
    name: String!
    type: RankType!
    minPoints: Int
    maxPoints: Int
    minBadges: Int
    maxBadges: Int
    color: String!
    icon: String
    order: Int!
  }

  input UpdateRankInput {
    name: String
    type: RankType
    minPoints: Int
    maxPoints: Int
    minBadges: Int
    maxBadges: Int
    color: String
    icon: String
    order: Int
    isActive: Boolean
  }

  # User Gamification Data
  extend type User {
    totalPoints: Int
    currentRank: Rank
    # Gamification specific data
    pointsHistory: [UserPointsHistory!]
    badges: [UserBadgeProgress!]
    rankHistory: [UserRankHistory!]
    gamificationStats: UserGamificationStats
  }

  type UserPointsHistory {
    id: ID!
    pointsEarned: Int!
    pointRule: PointRule!
    metadata: JSON
    createdAt: Date!
  }

  type UserRankHistory {
    id: ID!
    fromRank: Rank
    toRank: Rank!
    achievedAt: Date!
  }

  type UserGamificationStats {
    totalPointsEarned: Int!
    totalBadgesEarned: Int!
    currentStreak: Int!
    rankPosition: Int!
    pointsToNextRank: Int
    badgesProgress: Int!
    recentActivity: [UserActivity!]!
  }

  type UserActivity {
    id: ID!
    module: Module!
    action: String!
    pointsEarned: Int
    metadata: JSON
    createdAt: Date!
  }

  # Leaderboard
  type LeaderboardEntry {
    user: User!
    rank: Int!
    totalPoints: Int!
    badgesCount: Int!
    currentRank: Rank
  }

  type Leaderboard {
    entries: [LeaderboardEntry!]!
    totalUsers: Int!
    userPosition: Int
  }

  # Filters
  input PointRuleFilter {
    module: Module
    trigger: TriggerType
    isActive: Boolean
  }

  input BadgeFilter {
    type: BadgeType
    module: Module
    isActive: Boolean
    isCompleted: Boolean # For user-specific queries
  }

  input RankFilter {
    type: RankType
    isActive: Boolean
  }

  # Queries
  extend type Query {
    pointRules: [PointRule!]!
    pointRule(id: ID!): PointRule

    badges(filter: BadgeFilter, pagination: PaginationInput, userId: ID): [Badge!]!
    badge(id: ID!, userId: ID): Badge
    userBadges(userId: ID!, filter: BadgeFilter): [Badge!]!

    ranks(filter: RankFilter, pagination: PaginationInput): [Rank!]!
    rank(id: ID!): Rank

    userGamification(userId: ID!): User
    userPointsHistory(
      userId: ID!
      pagination: PaginationInput
    ): [UserPointsHistory!]!
    userRankHistory(userId: ID!): [UserRankHistory!]!

    leaderboard(pagination: PaginationInput, userId: ID): Leaderboard!

    gamificationStats: GamificationStats!
  }

  type GamificationStats {
    totalUsers: Int!
    totalPointsAwarded: Int!
    totalBadgesEarned: Int!
    activePointRules: Int!
    activeBadges: Int!
    activeRanks: Int!
    topRank: Rank
    mostPopularBadge: Badge
  }

  # Mutations
  extend type Mutation {
    # Point Rules
    createPointRule(input: CreatePointRuleInput!): PointRule!
    updatePointRule(input: UpdatePointRuleInput!): PointRule!
    deletePointRule(id: ID!): Boolean!

    # Badges
    createBadge(input: CreateBadgeInput!): Badge!
    updateBadge(id: ID!, input: UpdateBadgeInput!): Badge!
    deleteBadge(id: ID!): Boolean!

    # Ranks
    createRank(input: CreateRankInput!): Rank!
    updateRank(id: ID!, input: UpdateRankInput!): Rank!
    deleteRank(id: ID!): Boolean!

    # User Actions (for testing/manual awarding)
    awardPoints(
      userId: ID!
      pointRuleId: ID!
      metadata: JSON
    ): UserPointsHistory!
    awardBadge(userId: ID!, badgeId: ID!): UserBadgeProgress!
    promoteUser(userId: ID!, rankId: ID!): UserRankHistory!
  }

  # Subscriptions (for real-time updates)
  # extend type Subscription {
  #   pointsAwarded(userId: ID!): UserPointsHistory!
  #   badgeEarned(userId: ID!): UserBadgeProgress!
  #   rankPromoted(userId: ID!): UserRankHistory!
  #   leaderboardUpdated: LeaderboardEntry!
  # }
`;
