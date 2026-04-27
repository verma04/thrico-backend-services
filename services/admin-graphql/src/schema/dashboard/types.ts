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
    THIS_MONTH
    LAST_MONTH
  }

  enum GroupBy {
    HOUR
    DAY
    WEEK
    MONTH
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
    contentViralityRate: StatValue!
    knowledgeDensityIndex: StatValue!
    contentToMemberRatio: StatValue!

    # Acquisition & Retention
    memberActivationRate: StatValue!
    communityAdvocacyIndex: StatValue!
    superfanRatio: StatValue!
    memberGrowthRate: StatValue!
    onboardingCompletionRate: StatValue!
    newMemberResponseRate: StatValue!
    reEngagementRecoveryRate: StatValue!
    crossCommunityParticipationRate: StatValue!

    # Revenue & Business Value
    revenuePerMember: StatValue!
    memberLifetimeValue: StatValue!
    revenueConversionRate: StatValue!
    communityQualifiedLeadScore: StatValue!
    sponsorContentEngagementRate: StatValue!

    # Engagement & Satisfaction
    eventParticipationRate: StatValue!
    memberSatisfactionScore: StatValue!
    featureAdoptionRate: StatValue!
    peakEngagementHourDistribution: StatValue!
    churnPredictionScore: StatValue!

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

  type DeviceDataPoint {
    date: String!
    android: Int!
    ios: Int!
    web: Int!
  }

  type LoginSessionReportPoint {
    time: String!
    desktop: Int!
    mobile: Int!
  }

  type MembersStats {
    totalMembers: Int!
    activeMembers: Int!
    newMembersThisMonth: Int!
    activeRate: Float!
    totalMembersChange: Float
    activeMembersChange: Float
    newMembersChange: Float
    activeRateChange: Float
  }

  type GrowthDataPoint {
    date: Date!
    count: Int!
  }

  type GrowthStats {
    data: [GrowthDataPoint!]!
    totalNewMembers: Int!
    growthRate: Float!
  }

  input DateRangeInput {
    startDate: String!
    endDate: String!
  }

  extend type Query {
    dashboards(entityId: String!): [Dashboard!]!
    dashboard(id: ID!): Dashboard
    getDashboardStats(
      timeRange: TimeRange
      dateRange: DateRangeInput
    ): DashboardStats!
    getCommunityKPIs(
      timeRange: TimeRange
      dateRange: DateRangeInput
    ): CommunityKPIs!
    getMembersStats(
      timeRange: TimeRange
      dateRange: DateRangeInput
    ): MembersStats!
    getGrowthStats(
      timeRange: TimeRange
      dateRange: DateRangeInput
      groupBy: GroupBy
    ): GrowthStats!
    getModuleActivity(
      timeRange: TimeRange
      dateRange: DateRangeInput
    ): [ModuleActivity!]!
    getPlatformModuleActivity(
      timeRange: TimeRange
      dateRange: DateRangeInput
    ): PlatformModuleActivity!
    getDeviceDistribution(
      timeRange: TimeRange
      dateRange: DateRangeInput
    ): [DeviceDataPoint!]!
    getLoginSessionsReport(
      timeRange: TimeRange
      dateRange: DateRangeInput
      groupBy: GroupBy
    ): [LoginSessionReportPoint!]!
  }

  extend type Mutation {
    createDashboard(input: CreateDashboardInput!): Dashboard!
    updateDashboard(id: ID!, input: UpdateDashboardInput!): Dashboard!
    deleteDashboard(id: ID!): Boolean!
  }
`;
