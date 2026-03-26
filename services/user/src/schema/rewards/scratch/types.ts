export const scratchTypes = `#graphql
  type ScratchCardConfig {
    id: ID!
    costPerScratch: Int!
    maxScratchesPerDay: Int!
    isActive: Boolean!
    campaignStartDate: Date
    campaignEndDate: Date
    prizes: [ScratchCardPrize!]
  }

  type ScratchCardPrize {
    id: ID!
    configId: ID!
    label: String!
    type: PrizeType!
    value: Int!
    probability: Float!
    isActive: Boolean!
  }

  type ScratchCardPlay {
    id: ID!
    userId: ID!
    prizeType: PrizeType!
    prizeValue: Int!
    tcSpent: Int!
    playedAt: Date!
    prize: ScratchCardPrize
  }

  type ScratchCardStatus {
    isActive: Boolean!
    scratchesLeftToday: Int!
    costPerScratch: Int!
    userTcBalance: Float!
  }

  type ScratchCardHistory {
    scratchedCards: [ScratchCardPlay!]!
    unscratchedCount: Int!
    totalDailyLimit: Int!
    costPerScratch: Int!
    isActive: Boolean!
  }

  extend type Query {
    getScratchCardConfig: ScratchCardConfig
    getScratchCardStatus: ScratchCardStatus!
    getAllScratchCards: ScratchCardHistory!
  }


  extend type Mutation {
    playScratchCard: ScratchCardPlay!
  }
`;
