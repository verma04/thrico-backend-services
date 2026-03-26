export const faqTypes = `#graphql
  type Faq {
    id: ID
    title: String
    description: String
    createdAt: Date
    updatedAt: Date
    sort: Int
  }

  input inputGetFaqByModule {
    module: String!
  }

  extend type Query {
    getFaqByModule(input: inputGetFaqByModule): [Faq]
  }
`;
