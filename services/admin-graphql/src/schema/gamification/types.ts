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



  # Core Gamification Modules
  type GamificationModule {
    id: ID!
    name: String!
    description: String
    icon: String
  }

  type ModuleTrigger {
    id: ID!
    moduleId: ID!
    name: String!
    description: String
    type: String
  }
  
  type EntityGamificationData {
    modules: [GamificationModule!]!
    triggers: [ModuleTrigger!]!
  }

  # Point Rules
  type PointRule {
    id: ID!
    module: String!
    action: String!
    trigger: TriggerType!
    points: Int!
    dailyCap: Int
    weeklyCap: Int
    monthlyCap: Int
    description: String
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  input CreatePointRuleInput {
    module: String!
    action: String!
    trigger: TriggerType!
    points: Int!
    dailyCap: Int
    weeklyCap: Int
    monthlyCap: Int
    description: String
  }

  input UpdatePointRuleInput {
    points: Int
    dailyCap: Int
    weeklyCap: Int
    monthlyCap: Int
    description: String
    isActive: Boolean
    id: ID
  }

  # Badges
  type Badge {
    id: ID!
    name: String!
    type: BadgeType!
    module: String
    action: String
    targetValue: Int!
    icon: String
    description: String
    condition: String
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

  input BadgeInput {
    name: String!
    description: String
    type: BadgeType!
    module: String
    action: String
    count: Int
    points: Int
    icon: String
  }

  input UpdateBadgeInput {
    name: String
    type: BadgeType
    module: String
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
    minPoints: Int!
    maxPoints: Int
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
    minPoints: Int!
    maxPoints: Int
    color: String!
    icon: String
    order: Int!
  }

  input UpdateRankInput {
    name: String
    minPoints: Int
    maxPoints: Int
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
    module: String!
    action: String!
    pointsEarned: Int
    metadata: JSON
    createdAt: Date!
  }

  # Leaderboard
  type LeaderboardEntry {
    user: User
    rank: Int!
    totalPoints: Int!
    badgesCount: Int!
    currentRank: Rank
  }

  type Leaderboard {
    entries: [LeaderboardEntry!]!
    totalUsers: Int!
  }

  # Filters
  input PointRuleFilter {
    module: String
    trigger: TriggerType
    isActive: Boolean
  }

  input BadgeFilter {
    type: BadgeType
    module: String
    isActive: Boolean
    isCompleted: Boolean # For user-specific queries
  }

  input RankFilter {
    isActive: Boolean
  }

  # Queries
  extend type Query {
    # Core Gamification Ops
    getEntityGamificationModules: EntityGamificationData!
    getGamificationModules: [GamificationModule!]!
    getModuleTriggers(moduleId: ID): [ModuleTrigger!]!
    getBadges(filter: BadgeFilter, pagination: PaginationInput): [Badge!]!
    getPointRules(filter: PointRuleFilter): [PointRule!]!
    getPointRuleStats: PointRuleStats!
    getRanks(filter: RankFilter): [Rank!]!
    getLeaderboard(pagination: PaginationInput): Leaderboard!
    getGamificationStats: GamificationStats!
    getGamificationActivityLog(input: GamificationActivityLogInput): [GamificationActivityEntry!]!
  }

  input GamificationActivityLogInput {
    limit: Int
    offset: Int
  }

  type GamificationActivityEntry {
    id: ID!
    type: String! # 'POINTS' or 'BADGE'
    points: Int
    createdAt: Date!
    user: User
    # Points specific
    ruleAction: String
    ruleDescription: String
    # Badge specific
    badgeName: String
    badgeDescription: String
    badgeIcon: String
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

  type PointRuleStats {
    totalRules: Int!
    activeRules: Int!
    firstTimeRules: Int!
    recurringRules: Int!
  }

  extend type Mutation {
    createBadge(input: BadgeInput!): Badge!
    updateBadge(id: ID!, input: UpdateBadgeInput!): Badge!
    toggleBadge(id: ID!): Badge!
    deleteBadge(id: ID!): Boolean!

    createPointRule(input: CreatePointRuleInput!): PointRule!
    updatePointRule(id: ID!, input: UpdatePointRuleInput!): PointRule!
    togglePointRule(id: ID!): PointRule!
    deletePointRule(id: ID!): Boolean!

    createRank(input: CreateRankInput!): Rank!
    updateRank(id: ID!, input: UpdateRankInput!): Rank!
    toggleRank(id: ID!): Rank!
    updateRankOrder(rankOrders: [RankOrderInput!]!): [Rank!]!
    deleteRank(id: ID!): Boolean!
  }

  input RankOrderInput {
    id: ID!
    order: Int!
  }
`;
