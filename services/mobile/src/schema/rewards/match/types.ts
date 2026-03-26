export const matchWinTypes = `#graphql
  type MatchWinSymbol {
    id: ID!
    configId: ID!
    key: String!
    label: String!
    icon: String
    color: String
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
  }

  type MatchWinConfig {
    id: ID!
    costPerPlay: Int!
    maxPlaysPerDay: Int!
    isActive: Boolean!
    festivalMode: Boolean!
    symbols: [MatchWinSymbol!]!
    combinations: [MatchWinCombination!]!
  }

  type MatchWinPlay {
    id: ID!
    userId: ID!
    combinationId: ID
    prizeType: PrizeType!
    prizeValue: Int!
    tcSpent: Int!
    symbolsWon: [String!]
    playedAt: Date!
  }

  type MatchWinStatus {
    isActive: Boolean!
    playsLeftToday: Int!
    costPerPlay: Int!
    userTcBalance: Float!
  }

  extend type Query {
    getMatchWinConfig: MatchWinConfig
    getMatchWinStatus: MatchWinStatus!
  }

  extend type Mutation {
    playMatchWin: MatchWinPlay!
  }
`;
