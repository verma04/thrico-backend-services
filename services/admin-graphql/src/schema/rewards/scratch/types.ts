const gql = String.raw;

export const scratchTypes = gql`
  # ─── Scratch Card Types ───

  type ScratchCardConfig {
    id: ID!
    entityId: ID!
    costPerScratch: Int!
    maxScratchesPerDay: Int!
    isActive: Boolean!
    campaignStartDate: Date
    campaignEndDate: Date
    prizes: [ScratchCardPrize!]
    createdAt: Date!
    updatedAt: Date!
  }

  type ScratchCardPrize {
    id: ID!
    configId: ID!
    label: String!
    type: PrizeType!
    value: Int!
    probability: Float!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type ScratchCardPlay {
    id: ID!
    userId: ID!
    prizeType: PrizeType!
    prizeValue: Int!
    tcSpent: Int!
    playedAt: Date!
    user: User
    prize: ScratchCardPrize
  }

  input UpsertScratchCardConfigInput {
    costPerScratch: Int!
    maxScratchesPerDay: Int!
    isActive: Boolean
    campaignStartDate: Date
    campaignEndDate: Date
  }

  input CreateScratchCardPrizeInput {
    label: String!
    type: PrizeType!
    value: Int!
    probability: Float!
  }

  input UpdateScratchCardPrizeInput {
    label: String
    type: PrizeType
    value: Int
    probability: Float
    isActive: Boolean
  }

  extend type Query {
    getScratchCardConfig: ScratchCardConfig
    getScratchCardPrizes: [ScratchCardPrize!]!
    getScratchCardPlays(pagination: PaginationInput): [ScratchCardPlay!]!
  }

  extend type Mutation {
    upsertScratchCardConfig(
      input: UpsertScratchCardConfigInput!
    ): ScratchCardConfig!
    createScratchCardPrize(
      input: CreateScratchCardPrizeInput!
    ): ScratchCardPrize!
    updateScratchCardPrize(
      id: ID!
      input: UpdateScratchCardPrizeInput!
    ): ScratchCardPrize!
    deleteScratchCardPrize(id: ID!): Boolean!
  }
`;
