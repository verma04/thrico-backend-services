export const emailCampaignTypes = `#graphql
  type EmailCampaign {
    id: ID!
    name: String!
    status: String!
    frequency: String
    module: String
    channelType: String
    targetUsers: JSON
    description: String
    canvasNodes: JSON
    canvasEdges: JSON
    cronType: String
    cronDay: String
    cronDate: String
    createdAt: String
    updatedAt: String
  }

  input CreateEmailCampaignInput {
    name: String!
    status: String
    frequency: String
    module: String
    channelType: String
    targetUsers: JSON
    description: String
  }

  input UpdateEmailCampaignInput {
    name: String
    status: String
    canvasNodes: JSON
    canvasEdges: JSON
    cronType: String
    cronDay: String
    cronDate: String
  }

  extend type Query {
    getEmailCampaigns: [EmailCampaign!]!
    getEmailCampaign(id: ID!): EmailCampaign
  }

  extend type Mutation {
    createEmailCampaign(input: CreateEmailCampaignInput!): EmailCampaign!
    updateEmailCampaign(id: ID!, input: UpdateEmailCampaignInput!): EmailCampaign!
  }
`;
