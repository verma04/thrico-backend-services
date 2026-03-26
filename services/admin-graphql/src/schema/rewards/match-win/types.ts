const gql = String.raw;

export const matchWinTypes = gql`
  # ─── Match & Win Types ───

  type MatchWinSymbol {
    id: ID!
    configId: ID!
    key: String!
    label: String!
    icon: String
    color: String
    sortOrder: Int!
    createdAt: Date!
    updatedAt: Date!
  }

  type MatchWinCombination {
    id: ID!
    configId: ID!
    key: String!
    symbol1: MatchWinSymbol
    symbol2: MatchWinSymbol
    symbol3: MatchWinSymbol
    type: PrizeType!
    value: Int!
    probability: Float!
    maxWins: Int
    rewardId: ID
    createdAt: Date!
    updatedAt: Date!
  }

  type MatchWinConfig {
    id: ID!
    entityId: ID!
    costPerPlay: Int!
    maxPlaysPerDay: Int!
    isActive: Boolean!
    festivalMode: Boolean!
    symbols: [MatchWinSymbol!]!
    combinations: [MatchWinCombination!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type MatchWinPlay {
    id: ID!
    userId: ID!
    combinationId: ID
    prizeType: PrizeType!
    prizeValue: Int!
    tcSpent: Int!
    symbolsWon: String
    playedAt: Date!
    user: User
  }

  # ─── Inputs ───

  input UpsertMatchWinConfigInput {
    costPerPlay: Int!
    maxPlaysPerDay: Int!
    isActive: Boolean
    festivalMode: Boolean
  }

  input MatchWinSymbolInput {
    key: String!
    label: String!
    icon: String
    color: String
    sortOrder: Int
  }

  input MatchWinCombinationInput {
    key: String!
    symbol1Id: ID
    symbol2Id: ID
    symbol3Id: ID
    type: PrizeType!
    value: Int!
    probability: Float!
    maxWins: Int
    rewardId: ID
  }

  extend type Query {
    getMatchWinConfig: MatchWinConfig
    getMatchWinPlays(pagination: PaginationInput): [MatchWinPlay!]!
  }

  extend type Mutation {
    initializeMatchWinConfig: MatchWinConfig!

    upsertMatchWinConfig(input: UpsertMatchWinConfigInput!): MatchWinConfig!

    upsertMatchWinSymbol(
      configId: ID!
      input: MatchWinSymbolInput!
    ): MatchWinSymbol!
    deleteMatchWinSymbol(id: ID!): Boolean!

    upsertMatchWinCombination(
      configId: ID!
      input: MatchWinCombinationInput!
    ): MatchWinCombination!
    deleteMatchWinCombination(id: ID!): Boolean!
  }
`;
