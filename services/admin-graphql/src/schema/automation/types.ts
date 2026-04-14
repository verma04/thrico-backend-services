export const automationTypes = `#graphql
  enum AutomationCampaignStatus {
    active
    inactive
    draft
  }

  type AutomationCampaign {
    id: ID!
    name: String!
    description: String
    status: AutomationCampaignStatus!
    triggerType: String!
    triggerConfig: JSON!
    segmentationConfig: JSON
    actionConfig: JSON!
    createdAt: String
    updatedAt: String
  }

  type AutomationJob {
    id: ID!
    campaignId: ID!
    userId: ID!
    status: String!
    context: JSON
    lastError: String
    createdAt: String
    updatedAt: String
    campaign: AutomationCampaign
  }

  type AutomationExecutionLog {
    id: ID!
    jobId: ID!
    campaignId: ID!
    userId: ID!
    actionIndex: Int!
    actionType: String!
    status: String!
    result: JSON
    errorMessage: String
    executedAt: String
  }

  type AutomationMetadata {
    modules: [AutomationModule!]!
  }

  type AutomationModule {
    id: String!
    name: String!
    triggers: [AutomationTrigger!]!
    segmentationFields: [AutomationSegmentationField!]!
  }

  type AutomationTrigger {
    id: String!
    name: String!
  }

  type AutomationSegmentationField {
    id: String!
    name: String!
    type: String!
  }

  extend type Query {
    getAutomationCampaigns(entityId: ID!): [AutomationCampaign]
    getAutomationCampaign(id: ID!): AutomationCampaign
    getAutomationJobs(campaignId: ID!): [AutomationJob]
    getAutomationExecutionLogs(jobId: ID!): [AutomationExecutionLog]
    getAutomationMetadata(entityId: ID!): AutomationMetadata
  }

  extend type Mutation {
    createAutomationCampaign(
      name: String!
      description: String
      entityId: ID!
      triggerType: String!
      triggerConfig: JSON!
      segmentationConfig: JSON
      actionConfig: JSON!
    ): AutomationCampaign

    updateAutomationCampaign(
      id: ID!
      name: String
      description: String
      status: AutomationCampaignStatus
      triggerType: String
      triggerConfig: JSON
      segmentationConfig: JSON
      actionConfig: JSON
    ): AutomationCampaign

    deleteAutomationCampaign(id: ID!): Boolean
  }
`;
