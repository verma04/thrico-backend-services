export const announcementsTypes = `#graphql
  scalar Date

  type Announcement {
    id: ID!
    note: String
    description: String
    entity: String
    createdAt: Date
    updatedAt: Date
  }
  
  type Highlight {
      id: ID!
      highlightsType: String
      entity: String
      isExpirable: Boolean
      expiry: Date
      announcementId: ID
  }

  input CreateAnnouncementInput {
    note: String!
    description: String
    ttl: String # "no" or days as string
  }

  extend type Query {
    getAllAnnouncements: [Announcement]
  }

  extend type Mutation {
    addAnnouncement(input: CreateAnnouncementInput!): Highlight
  }
`;
