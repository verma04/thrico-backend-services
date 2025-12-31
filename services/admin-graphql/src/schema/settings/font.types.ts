const fontTypes = `#graphql
  #   type Query {
  #     getCustomDomain: CustomDomain
  #     getThricoDomain: domain
  #     checkDomainIsVerified: domain
  #     getCustomDomainDetails(input: inputId!): CustomDomain
  #     checkSSL(input: inputId!): CustomDomain
  #   }

  type font {
    name: String
    weights: String
    styles: [String]
    subsets: [String]
  }

  input inputUpdateFont {
    name: String
    weights: [String]
    styles: [String]
    subsets: [String]
  }

  type Mutation {
    updateFont(input: inputUpdateFont!): font
  }
`;

export { fontTypes };
