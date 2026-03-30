const gql = String.raw;

export const dashboardTypes = gql`
  type Dashboard {
    id: ID!
    title: String!
    layout: JSON
    widgets: JSON
    isDefault: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input CreateDashboardInput {
    title: String!
    layout: JSON
    widgets: JSON
    isDefault: Boolean
    entityId: String!
  }

  input UpdateDashboardInput {
    title: String
    layout: JSON
    widgets: JSON
    isDefault: Boolean
  }

  enum TimeRange {
    LAST_24_HOURS
    LAST_7_DAYS
    LAST_30_DAYS
    LAST_90_DAYS
  }

  type DashboardStats {
    totalUsers: Int!
    activeUsers: Int!
    pageViews: Int!
    engagementRate: Float!
    totalUsersChange: Float
    activeUsersChange: Float
    pageViewsChange: Float
    engagementRateChange: Float
  }

  type CommunityKPIs {
    # Core Community Vitals
    dailyActiveUsers: StatValue!
    monthlyActiveUsers: StatValue!
    engagementRate: StatValue!
    retentionRate: StatValue!
    newMembers: StatValue!
    churnRate: StatValue!
    healthIndex: StatValue!
    communityNPS: StatValue!

    # Content & Feed
    totalPosts: StatValue!
    contributionFrequency: StatValue!
    interactionReciprocity: StatValue!
    contentReach: StatValue!
    contentTypeBreakdown: [ContentTypeStat!]!
    
    # Acquisition & Retention
    memberActivationRate: StatValue!
    communityAdvocacyIndex: StatValue!
    superfanRatio: StatValue!
    
    # Moderation Overview
    moderationStats: [ModerationStat!]!
    
    # Module Performance
    modulePerformance: [ModulePerformanceStat!]!
  }

  type StatValue {
    value: Float!
    change: Float # Percentage change from previous period
    trend: [Float!] # Sparkline data points
  }

  type ContentTypeStat {
    type: String!
    count: Int!
    percentage: Float!
  }

  type ModerationStat {
    type: String!
    count: Int!
    status: String!
  }

  type ModulePerformanceStat {
    module: String!
    value: String!
    subtext: String!
  }

  type ModuleActivity {
    name: String!
    userCount: Int!
  }

  type PlatformModuleActivityItem {
    name: String!
    itemCount: Int!
  }

  type PlatformModuleActivity {
    total: Int!
    active: Int!
    inactive: Int!
    modules: [PlatformModuleActivityItem!]!
  }

  extend type Query {
    dashboards(entityId: String!): [Dashboard!]!
    dashboard(id: ID!): Dashboard
    getDashboardStats(timeRange: TimeRange!): DashboardStats!
    getCommunityKPIs(timeRange: TimeRange!): CommunityKPIs!
    getModuleActivity(timeRange: TimeRange!): [ModuleActivity!]!
    getPlatformModuleActivity(timeRange: TimeRange!): PlatformModuleActivity!
  }

  extend type Mutation {
    createDashboard(input: CreateDashboardInput!): Dashboard!
    updateDashboard(id: ID!, input: UpdateDashboardInput!): Dashboard!
    deleteDashboard(id: ID!): Boolean!
  }
`;
