const pageTypes = `#graphql
  scalar JSON
  scalar Upload
  type page {
    name: String
    logo: String
    location: JSON
    type: String
    industry: String
    website: String
    pageType: String
    size: String
    tagline: String
    id: ID
  }

  input pageInput {
    agreement: Boolean
    industry: String
    location: JSON
    logo: Upload
    name: String
    pageType: String
    size: String
    tagline: String
    type: String
    url: String
    website: String
  }
  input searchPageInput {
    value: String!
    limit: Int
  }
  type Query {
    getAllPages(input: searchPageInput): [page]
  }

  type Mutation {
    addPage(input: pageInput): page
  }
`;

export { pageTypes };
