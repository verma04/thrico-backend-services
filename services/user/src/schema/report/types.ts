export const reportTypes = `#graphql
  enum ReportModule {
    FEED
    MEMBER
    DISCUSSION_FORUM
    COMMUNITY
    JOB
    LISTING
  }

  enum ReportStatus {
    PENDING
    RESOLVED
    DISMISSED
  }

  input ReportInput {
    targetId: ID!
    module: ReportModule!
    reason: String!
    description: String
  }

  type Report {
    id: ID!
    targetId: ID!
    module: ReportModule!
    reporter: entityUser
    status: ReportStatus
    createdAt: Date
    reason: String
    description: String
  }

  type PaginationInfo {
    currentPage: Int
    totalPages: Int
    totalCount: Int
    limit: Int
    hasNextPage: Boolean
    hasPreviousPage: Boolean
  }

  type ReportConnection {
    reports: [Report]
    pagination: PaginationInfo
  }

  type ReportResponse {
    success: Boolean!
    message: String
    report: Report
  }

  extend type Query {
    getAllReports(module: ReportModule, status: ReportStatus, page: Int, limit: Int): ReportConnection!
  }

  extend type Mutation {
    reportContent(input: ReportInput!): ReportResponse!
    updateReportStatus(reportId: ID!, status: ReportStatus!): ReportResponse!
  }
`;
