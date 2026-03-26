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

  input ReportInput {
    targetId: ID!
  module: ReportModule!
    reason: String!
    description: String
  }

  type Report {
    id: ID
    targetId: ID
    module: ReportModule
    reporter: entityUser
    reason: String
    description: String
    status: String
    createdAt: Date
  }

  type ReportResponse {
    success: Boolean!
    message: String
    report: Report
  }

  extend type Mutation {
    reportContent(input: ReportInput!): ReportResponse!
  }
`;
