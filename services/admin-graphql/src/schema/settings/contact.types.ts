export const contactTypes = `#graphql
  type Contact {
    id: ID!
    subject: String!
    message: String!
    status: String!
    createdAt: String!
    user: EntityMember
  }

  type ContactStats {
    totalInquiries: Int!
    resolvedInquiries: Int!
    responseRate: Float!
    peakFrequency: Int!
  }

  type EntityMember {
    id: ID!
    user: ThricoUser
  }

  type ThricoUser {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    avatar: String
  }

  type ContactConnection {
    nodes: [Contact!]!
    pageInfo: ContactPageInfo
  }

  type ContactPageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  extend type Query {
    getAllContacts(limit: Int, cursor: String): ContactConnection
    getContactStats: ContactStats
  }

  extend type Mutation {
    updateContactStatus(id: ID!, status: String!): Contact
  }
`;
