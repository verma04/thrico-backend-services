export const currencyTypes = `#graphql
  type EntityCurrencyWallet {
    id: ID!
    userId: String!
    entityId: String!
    balance: Float!
    totalEarned: Float!
    totalSpent: Float!
    totalConvertedToTc: Float!
    createdAt: Date
    updatedAt: Date
    entityName: String
    currencyName: String
    normalizationFactor: Int
  }

  type TCCoinWallet {
    id: ID!
    userId: String
    balance: Float!
    totalEarned: Float!
    totalSpent: Float!
    createdAt: Date
    updatedAt: Date
  }

  type UserWalletSummary {
    entityWallet: EntityCurrencyWallet
  }

  type EntityCurrencyConfig {
    id: ID!
    entityId: String!
    normalizationFactor: Int!
    tcConversionRate: Float!
    tcCoinsAllowed: Boolean!
    minTcPercentage: Int!
    maxTcPercentage: Int!
    minEntityActivityRequired: Boolean!
  }

  type CurrencyTransaction {
    transactionId: String!
    type: String!
    entityId: String!
    amount: Float!
    balanceBefore: Float!
    balanceAfter: Float!
    metadata: JSON
    timestamp: Float!
  }

  type CurrencyTransactionConnection {
    items: [CurrencyTransaction!]!
    lastKey: JSON
  }

  type RedemptionRecord {
    redemptionId: String!
    entityId: String!
    rewardId: String
    ecUsed: Float!
    tcUsed: Float!
    totalCost: Float!
    status: String!
    metadata: JSON
    timestamp: Float!
  }

  type RedemptionHistoryConnection {
    items: [RedemptionRecord!]!
    lastKey: JSON
  }

  type RedemptionResult {
    success: Boolean!
    ecUsed: Float!
    tcUsed: Float!
    remaining: Float!
    redemptionId: String
    error: String
  }

  type RedemptionPreview {
    canRedeem: Boolean!
    ecAvailable: Float!
    tcAvailable: Float!
    ecToUse: Float!
    tcToUse: Float!
    remaining: Float!
    maxTcPercentage: Int!
  }

  input RedeemRewardInput {
    entityId: ID!
    rewardCostEC: Float!
    rewardId: String
  }

  input PreviewRedemptionInput {
    entityId: ID!
    rewardCostEC: Float!
  }

  input CurrencyHistoryInput {

    limit: Int
    lastKey: JSON
  }

  type MyEntityCurrency {
    entityId: String!
    currencyName: String
    balance: Float!
    normalizationFactor: Int!
    tcConversionRate: Float!
    minEntityActivityRequired: Boolean!
    totalPointsEarned: Int!
    nextRankProgress: Float
  }

  type PointsActivity {
    id: ID!
    ruleName: String
    pointsEarned: Int!
    reason: String
    timestamp: Float!
  }

  type PointsActivityConnection {
    items: [PointsActivity!]!
    lastKey: JSON
  }

  type GlobalCurrencyTransaction {
    transactionId: String!
    type: String!
    entityId: String
    amount: Float!
    balanceBefore: Float!
    balanceAfter: Float!
    metadata: JSON
    timestamp: Float!
  }

  type GlobalCurrencyTransactionConnection {
    items: [GlobalCurrencyTransaction!]!
    lastKey: JSON
  }

  extend type Query {
    getMyWallets: UserWalletSummary!
    getMyTCBalance: TCCoinWallet
    
    # New Mobile Specific Queries
    getMyEntityCurrency(entityId: ID!): MyEntityCurrency
    getMyPointsActivity(entityId: ID!, limit: Int, lastKey: JSON): PointsActivityConnection!
    
    getMyEntityWallet(entityId: ID!): EntityCurrencyWallet
    getEntityCurrencyConfig: EntityCurrencyConfig
    getTransactionHistory(input: CurrencyHistoryInput): CurrencyTransactionConnection!
    getGlobalTransactionHistory(input: CurrencyHistoryInput): GlobalCurrencyTransactionConnection!
    getRedemptionHistory(input: CurrencyHistoryInput): RedemptionHistoryConnection!
    previewRedemption(input: PreviewRedemptionInput!): RedemptionPreview!
  }

  extend type Mutation {
    redeemReward(input: RedeemRewardInput!): RedemptionResult!
  }
`;
