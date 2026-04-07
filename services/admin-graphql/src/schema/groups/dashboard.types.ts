const gql = String.raw;

const dashboardTypes = gql`
  type CommunityStatusCount {
    status: CommunityEntityStatus!
    count: Int!
  }

  type CommunitySignupTrend {
    name: String!
    signups: Int!
    views: Int!
  }

  type CommunityActivity {
    name: String!
    registered: Int!
    checkedIn: Int!
  }

  type TopCommunity {
    id: String!
    name: String!
    slug: String!
    members: Int!
    views: Int!
    status: CommunityEntityStatus!
    avatar: String
    lastActivity: String
  }

  type EnrollmentTrendPoint {
    label: String!
    count: Int!
  }

  type StatusDistributionItem {
    name: String!
    value: Int!
  }

  type TopStatsCommunity {
    name: String!
    members: Int!
    posts: Int!
    views: Int!
  }

  type TopStatsCreator {
    name: String!
    avatar: String
    communitiesCreated: Int!
  }

  type CommunitiesStats {
    totalCommunities: Int!
    activeCommunities: Int!
    totalEnrollments: Int!
    totalViews: Int!
    totalCommunitiesChange: Float!
    activeCommunitiesChange: Float!
    enrollmentsChange: Float!
    viewsChange: Float!

    enrollmentTrend: [EnrollmentTrendPoint!]!
    statusDistribution: [StatusDistributionItem!]!
    topCommunities: [TopStatsCommunity!]!
    topCreators: [TopStatsCreator!]!
  }

  enum TimeRange {
    LAST_24_HOURS
    LAST_7_DAYS
    LAST_30_DAYS
    LAST_90_DAYS
  }

  type CommunityStats {
    totalCommunities: Int!
    totalMembers: Int!
    totalPosts: Int!
    totalViews: Int!

    newCommunities: Int!
    newMembers: Int!
    newPosts: Int!

    statusBreakdown: [CommunityStatusCount!]!
  }

  input CommunityStatsInput {
    startDate: Date
    endDate: Date
  }

  extend type Query {
    getCommunityStats(input: CommunityStatsInput): CommunityStats
    getCommunitySignupTrend(
      input: CommunityStatsInput
    ): [CommunitySignupTrend!]!
    getTopActiveCommunities(limit: Int): [TopCommunity!]!
    getCommunityActivityTrend: [CommunityActivity!]!
    getCommunitiesStats(timeRange: TimeRange!): CommunitiesStats!
  }
`;

export { dashboardTypes };
