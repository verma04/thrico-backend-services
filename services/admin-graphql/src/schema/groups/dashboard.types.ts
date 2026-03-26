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
  }
`;

export { dashboardTypes };
