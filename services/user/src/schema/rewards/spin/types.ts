export const spinTypes = `#graphql
  type SpinWheelConfig {
    id: ID!
    costPerSpin: Int!
    maxSpinsPerDay: Int!
    isActive: Boolean!
    campaignStartDate: Date
    campaignEndDate: Date
    prizes: [SpinWheelPrize!]
  }

  type SpinWheelPrize {
    id: ID!
    configId: ID!
    rewardId: ID
    label: String!
    type: PrizeType!
    value: Int!
    probability: Float!
    color: String
    sortOrder: Int!
    isActive: Boolean!
    reward: Reward
  }

  type SpinWheelPlay {
    id: ID!
    userId: ID!
    prizeType: PrizeType!
    prizeValue: Int!
    tcSpent: Int!
    playedAt: Date!
    prize: SpinWheelPrize
  }

  type SpinWheelStatus {
    isActive: Boolean!
    spinsLeftToday: Int!
    costPerSpin: Int!
    userTcBalance: Float!
  }

  extend type Query {
    getSpinWheelConfig: SpinWheelConfig
    getSpinWheelStatus: SpinWheelStatus!
  }


  extend type Mutation {
    playSpinWheel: SpinWheelPlay!
  }
`;
