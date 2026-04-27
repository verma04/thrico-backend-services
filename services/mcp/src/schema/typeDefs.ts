const mainTypeDefs = `#graphql
  scalar JSON
  scalar Date

  type MCPKey {
    id: ID!
    name: String!
    apiKey: String!
    permissions: [String!]!
    status: String!
    createdAt: Date!
    updatedAt: Date!
  }

  type MCPLog {
    id: ID!
    actionName: String!
    status: String!
    triggerSource: String!
    payload: JSON
    result: JSON
    timestamp: Date!
  }

  type Query {
    mcpKeys: [MCPKey!]!
    mcpLogs(limit: Int): [MCPLog!]!
  }

  type Mutation {
    generateMCPKey(name: String!, permissions: [String!]!): MCPKey!
    updateMCPKey(id: ID!, status: String!): MCPKey!
    revokeMCPKey(id: ID!): Boolean!
  }
`;

export const typeDefs = [mainTypeDefs];
