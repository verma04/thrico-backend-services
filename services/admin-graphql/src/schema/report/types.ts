export const reportTypes = `#graphql
  enum ReportModule {
    FEED
    MEMBER
    DISCUSSION_FORUM
    COMMUNITY
    JOB
    LISTING
    MOMENT
    OFFER
    EVENT
    USER
    SHOP
    SURVEY
  }

  enum ReportStatus {
    PENDING
    RESOLVED
    DISMISSED
  }

  type Report {
    id: ID!
    targetId: ID!
    module: ReportModule!
    reportedBy: ID
    reporter: User
    reason: String
    description: String
    status: ReportStatus
    createdAt: Date
    updatedAt: Date
  }

  type ReportPaginationInfo {
    currentPage: Int
    totalPages: Int
    totalCount: Int
    limit: Int
    hasNextPage: Boolean
    hasPreviousPage: Boolean
  }

  type ReportPagination {
    reports: [Report]
    pagination: ReportPaginationInfo
  }

  extend type Query {
    getAllReports(module: ReportModule, status: ReportStatus, page: Int, limit: Int): ReportPagination
    getReportById(id: ID!): Report
  }

  extend type Mutation {
    updateReportStatus(reportId: ID!, status: ReportStatus!): Report
  }
`;
