const industryTypes = `#graphql
  type Industry {
    id: ID!
    title: String!
    createdAt: Date
    updatedAt: Date
  }

  input AddIndustryInput {
    title: String!
  }

  input UpdateIndustryInput {
    id: ID!
    title: String!
  }

  input DeleteIndustryInput {
    id: ID!
  }

  input BulkAddIndustryInput {
    titles: [String!]!
  }

  type Query {
    getIndustries: [Industry]
  }

  type Mutation {
    addIndustry(input: AddIndustryInput!): Industry
    updateIndustry(input: UpdateIndustryInput!): Industry
    deleteIndustry(input: DeleteIndustryInput!): Industry
    bulkAddIndustries(input: BulkAddIndustryInput): [Industry]
  }
`;

export { industryTypes };
