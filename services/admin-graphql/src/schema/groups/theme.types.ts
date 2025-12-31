const gql = String.raw;

// const { Parking } = require('../models/Parking')
const themeTypes = gql`
  type GroupTheme {
    id: ID
    title: String
    createdAt: Date
    updatedAt: Date
  }
  type Query {
    getAllGroupTheme: [GroupTheme]
  }

  input AddTheme {
    title: String!
  }
  input DeleteTheme {
    id: ID!
  }
  input DuplicateTheme {
    id: ID!
  }
  input EditTheme {
    id: ID!
    title: String!
  }
  type Mutation {
    addGroupTheme(input: AddTheme): [GroupTheme]
    deleteGroupTheme(input: DeleteTheme): GroupTheme
    duplicateGroupTheme(input: DuplicateTheme): [GroupTheme]
    editGroupTheme(input: EditTheme): GroupTheme
  }
`;

export { themeTypes };
