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

  enum RewardMechanism {
    SPIN_WHEEL
    SCRATCH_CARD
    MATCH_AND_WIN
    COUPON
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
    rewardMechanism: [RewardMechanism!]
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

  extend type Query {
    getRewards: [Reward!]!
    getRewardById(id: ID!): Reward
    getUserRedemptions: [UserRedemption!]!
    getPlayRemainingToday: Int!
  }

  extend type Mutation {
    redeemRewardCoupon(rewardId: ID!): RedemptionResponse!
  }
`,
  spinTypes,
  scratchTypes,
  matchWinTypes,
];
