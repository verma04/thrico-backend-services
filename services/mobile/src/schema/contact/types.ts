export const contactTypes = `#graphql
  extend type Mutation {
    sendContactMessage(input: SendContactInput!): GenericResponse
  }

  input SendContactInput {
    subject: String!
    message: String!
  }
`;
