export const currencyTypeDefs = `#graphql
  type EntityCurrencyConfig {
    id: ID!
    entityId: String!
    currencyName: String!
    normalizationFactor: Int!
    tcConversionRate: Float!
    tcCoinsAllowed: Boolean!
    minTcPercentage: Int!
    maxTcPercentage: Int!
    minEntityActivityRequired: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type ActivityCap {
    id: ID!
    entityId: String!
    activityType: String!
    dailyCap: Int
    weeklyCap: Int
    monthlyCap: Int
  }

  type TCConversionCap {
    id: ID!
    entityId: String!
    maxTcPerDay: Float
    maxTcPerMonth: Float
    maxTcPerEntity: Float
  }

  type RedemptionCap {
    id: ID!
    entityId: String!
    maxTcPerOrder: Float
    maxTcPerMonth: Float
  }

  type CurrencyTransaction {
    userId: String!
    transactionId: String!
    type: String!
    entityId: String
    amount: Float!
    balanceBefore: Float!
    balanceAfter: Float!
    metadata: JSON
    timestamp: Date!
  }

  type TransactionResponse {
    items: [CurrencyTransaction!]!
    nextCursor: String
  }

  input UpdateEntityCurrencyConfigInput {
    currencyName: String
    normalizationFactor: Int
    tcConversionRate: Float
    tcCoinsAllowed: Boolean
    minTcPercentage: Int
    maxTcPercentage: Int
    minEntityActivityRequired: Boolean
  }

  input ActivityCapInput {
    activityType: String!
    dailyCap: Int
    weeklyCap: Int
    monthlyCap: Int
  }

  input TCConversionCapInput {
    maxTcPerDay: Float
    maxTcPerMonth: Float
    maxTcPerEntity: Float
  }

  input RedemptionCapInput {
    maxTcPerOrder: Float
    maxTcPerMonth: Float
  }

  extend type Query {
    getEntityCurrencyConfig: EntityCurrencyConfig
    getActivityCaps: [ActivityCap!]!
    getTCConversionCap: TCConversionCap
    getRedemptionCap: RedemptionCap
    getCurrencyTransactions(userId: String, limit: Int, cursor: String): TransactionResponse!
  }

  extend type Mutation {
    updateEntityCurrencyConfig(input: UpdateEntityCurrencyConfigInput!): EntityCurrencyConfig!
    upsertActivityCap(input: ActivityCapInput!): ActivityCap!
    updateTCConversionCap(input: TCConversionCapInput!): TCConversionCap!
    updateRedemptionCap(input: RedemptionCapInput!): RedemptionCap!
    reSeedDefaultCurrency: String!
  }
`;
