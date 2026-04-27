const gql = String.raw;
import { spinTypes } from "./spin/types";
import { scratchTypes } from "./scratch/types";
import { matchWinTypes } from "./match-win/types";
import { playStatsTypes } from "./stats/types";

export const rewardsTypes = [
  gql`
    # ─── Enums ───

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
      totalUsageLimit: Int!
      minAccountAge: Int!
      minActivityRequired: Int!
      blockWarnedUsers: Boolean!
      cooldownPeriod: Int!
      status: String!
      category: OfferCategory
      isActive: Boolean!
      totalVouchers: Int
      remainingVouchers: Int
      redeemedCount: Int
      createdAt: Date!
      updatedAt: Date!
      validityDays: String
      discountType: String
      discountValue: Float
      rewardMechanism: [RewardMechanism!]
    }

    type Voucher {
      id: ID!
      rewardId: ID!
      code: String!
      isUsed: Boolean!
      assignedTo: ID
      assignedAt: Date
      expiryDate: Date
      createdAt: Date!
      reward: Reward
    }

    type Redemption {
      id: ID!
      userId: ID!
      rewardId: ID!
      ecUsed: Float!
      tcUsed: Float!
      totalCost: Float!
      status: String!
      metadata: JSON
      claimedAt: Date
      user: User
      reward: Reward
    }

    type RewardStats {
      totalRedemptions: Int!
      totalTcBurned: Float!
      activeCoupons: Int!
      lowInventoryItems: Int!
      redemptionTrend: [DailyStat!]!
    }

    type DailyStat {
      date: String!
      count: Int!
      value: Float!
    }

    type RewardSecuritySettings {
      dailyRedemptionLimit: Int!
      requireKyc: Boolean!
      lockToDeviceId: Boolean!
      maxIpVelocity: Int!
    }

    input CreateRewardInput {
      title: String!
      description: String
      image: String
      imageFile: Upload
      tcCost: Int!
      inventoryRequired: Boolean
      perUserLimit: Int
      totalUsageLimit: Int
      minAccountAge: Int
      minActivityRequired: Int
      blockWarnedUsers: Boolean
      cooldownPeriod: Int
      categoryId: ID
      rewardMechanism: [RewardMechanism!]
    }

    input UpdateRewardInput {
      title: String
      description: String
      image: String
      imageFile: Upload
      tcCost: Int
      inventoryRequired: Boolean
      perUserLimit: Int
      totalUsageLimit: Int
      minAccountAge: Int
      minActivityRequired: Int
      blockWarnedUsers: Boolean
      cooldownPeriod: Int
      status: String
      isActive: Boolean
      rewardMechanism: [RewardMechanism!]
    }

    input UploadVouchersInput {
      rewardId: ID!
      vouchers: [String!]!
    }

    input UpdateRewardSecurityInput {
      dailyRedemptionLimit: Int
      requireKyc: Boolean
      lockToDeviceId: Boolean
      maxIpVelocity: Int
    }

    extend type Query {
      getRewards(
        status: String
        search: String
        pagination: PaginationInput
      ): [Reward!]!
      getVouchers(rewardId: ID!, pagination: PaginationInput): [Voucher!]!
      getAllVouchers(
        pagination: PaginationInput
        status: String
        rewardId: ID
      ): [Voucher!]!
      getRedemptions(
        userId: ID
        status: String
        pagination: PaginationInput
      ): [Redemption!]!
      getRewardStats(
        timeRange: TimeRange
        dateRange: DateRangeInput
      ): RewardStats!
      getRewardById(id: ID!): Reward
      getRewardSecuritySettings: RewardSecuritySettings!
      getVouchersByRewardMechanism(
        mechanism: RewardMechanism!
        pagination: PaginationInput
      ): [Voucher!]!
    }

    extend type Mutation {
      createReward(input: CreateRewardInput!): Reward!
      updateReward(id: ID!, input: UpdateRewardInput!): Reward!
      uploadVouchers(input: UploadVouchersInput!): Boolean!
      markVoucherAsUsed(voucherId: ID!): Voucher!
      deleteVoucher(voucherId: ID!): Boolean!
      updateRewardSecuritySettings(
        input: UpdateRewardSecurityInput!
      ): RewardSecuritySettings!
      claimRedemption(redemptionId: ID!): Redemption!
    }
  `,
  spinTypes,
  scratchTypes,
  matchWinTypes,
  playStatsTypes,
];
