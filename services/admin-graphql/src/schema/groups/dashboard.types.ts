const gql = String.raw;

const dashboardTypes = gql`
  type CommunityStatusCount {
    status: CommunityEntityStatus!
    count: Int!
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
  }
`;

export { dashboardTypes };
