const wallOfFameTypes = `#graphql
  type wallOfFameCategory {
    id: ID
    title: String
    createdAt: Date
    updatedAt: Date
  }

  type wallOfFame {
    id: ID
    title: String
    achievement: String
    year: String
    order: Int
    recognitionDate: Date
    user: userDetails
    category: wallOfFameCategory
    createdAt: Date
    updatedAt: Date
  }

  input wallOfFameInput {
    userId: ID!
    categoryId: ID
    title: String
    achievement: String
    year: String
    order: Int
    recognitionDate: Date
  }

  input wallOfFameCategoryInput {
    title: String!
  }

  input ReorderWallOfFameInput {
    id: ID!
    order: Int!
  }

  input getAllWallOfFameInput {
    limit: Int
    offset: Int
    searchQuery: String
    categoryId: ID
    year: String
  }

  extend type Query {
    getWallOfFame(input: getAllWallOfFameInput): [wallOfFame]
    getWallOfFameById(id: ID!): wallOfFame
    getWallOfFameCategories: [wallOfFameCategory]
  }

  extend type Mutation {
    addToWallOfFame(input: wallOfFameInput): wallOfFame
    updateWallOfFame(id: ID!, input: wallOfFameInput): wallOfFame
    removeFromWallOfFame(id: ID!): wallOfFame
    reorderWallOfFame(input: [ReorderWallOfFameInput]): [wallOfFame]

    addWallOfFameCategory(input: wallOfFameCategoryInput): wallOfFameCategory
    updateWallOfFameCategory(id: ID!, input: wallOfFameCategoryInput): wallOfFameCategory
    deleteWallOfFameCategory(id: ID!): wallOfFameCategory
  }
`;

export { wallOfFameTypes };
