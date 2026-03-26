const gql = String.raw;

export const spinTypes = gql`
  # ─── Spin Wheel Types ───

  type SpinWheelConfig {
    id: ID!
    entityId: ID!
    costPerSpin: Int!
    maxSpinsPerDay: Int!
    isActive: Boolean!
    campaignStartDate: Date
    campaignEndDate: Date
    prizes: [SpinWheelPrize!]
    createdAt: Date!
    updatedAt: Date!
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
    createdAt: Date!
    updatedAt: Date!
  }

  type SpinWheelPlay {
    id: ID!
    userId: ID!
    prizeType: PrizeType!
    prizeValue: Int!
    tcSpent: Int!
    playedAt: Date!
    user: User
    prize: SpinWheelPrize
  }

  input UpsertSpinWheelConfigInput {
    costPerSpin: Int!
    maxSpinsPerDay: Int!
    isActive: Boolean
    campaignStartDate: Date
    campaignEndDate: Date
  }

  input CreateSpinWheelPrizeInput {
    label: String!
    type: PrizeType!
    value: Int!
    probability: Float!
    rewardId: ID
    color: String
    sortOrder: Int
    isActive: Boolean
  }

  input UpdateSpinWheelPrizeInput {
    label: String
    type: PrizeType
    value: Int
    probability: Float
    rewardId: ID
    color: String
    sortOrder: Int
    isActive: Boolean
  }

  extend type Query {
    getSpinWheelConfig: SpinWheelConfig
    getSpinWheelPrizes: [SpinWheelPrize!]!
    getSpinWheelPlays(pagination: PaginationInput): [SpinWheelPlay!]!
  }

  extend type Mutation {
    upsertSpinWheelConfig(input: UpsertSpinWheelConfigInput!): SpinWheelConfig!
    createSpinWheelPrize(input: CreateSpinWheelPrizeInput!): SpinWheelPrize!
    updateSpinWheelPrize(
      id: ID!
      input: UpdateSpinWheelPrizeInput!
    ): SpinWheelPrize!
    deleteSpinWheelPrize(id: ID!): Boolean!
  }
`;
