const gql = String.raw;

// const { Parking } = require('../models/Parking')
const interestsTypes = gql`
  type GroupInterest {
    id: ID
    title: String
    createdAt: Date
    updatedAt: Date
  }
  type Query {
    getAllGroupInterests: [GroupInterest]
  }

  input AddInterests {
    title: String!
  }
  input DeleteInterests {
    id: ID!
  }
  input DuplicateInterests {
    id: ID!
  }
  input EditInterests {
    id: ID!
    title: String!
  }
  type Mutation {
    addGroupInterests(input: AddInterests): [GroupInterest]
    deleteGroupInterests(input: DeleteInterests): GroupInterest
    duplicateGroupInterests(input: DuplicateInterests): [GroupInterest]
    editGroupInterests(input: EditInterests): GroupInterest
  }
`;

export { interestsTypes };
