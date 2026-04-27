import { spinTypes } from "./spin/types";
import { scratchTypes } from "./scratch/types";
import { matchWinTypes } from "./match/types";

export const rewardsTypes = [
  `#graphql
  enum PrizeType {
    TC
    VOUCHER
    PREMIUM
    NOTHING
  }

  type Reward {
    id: ID!
    title: String!
    description: String
    image: String
    tcCost: Int!
    inventoryRequired: Boolean!
    perUserLimit: Int!
    status: String!
    createdAt: Date!
  }

  type UserRedemption {
    id: ID!
    rewardId: ID!
    reward: Reward
    ecUsed: Int!
    tcUsed: Int!
    totalCost: Int!
    status: String!
    metadata: String
    createdAt: Date!
  }

  type RedemptionResponse {
    success: Boolean!
    voucherCode: String
    redemptionId: String
    error: String
  }

  type UserBalances {
    ecBalance: Float!
    tcBalance: Float!
    currencyName: String!
  }

  extend type Query {
    getRewards: [Reward!]!
    getRewardById(id: ID!): Reward
    getUserRedemptions: [UserRedemption!]!
    getPlayRemainingToday: Int!
    getUserBalances: UserBalances!
  }

  extend type Mutation {
    redeemRewardCoupon(rewardId: ID!): RedemptionResponse!
  }
`,
  spinTypes,
  scratchTypes,
  matchWinTypes,
];
