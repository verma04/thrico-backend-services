import dynamoose from "../connection";

const { Schema, model } = dynamoose;

// Redemption History Schema — tracks all reward redemptions
// Partition: userId, Sort: redemptionId (ULID)
const redemptionHistorySchema = new Schema(
  {
    userId: {
      type: String,
      hashKey: true,
      required: true,
    },
    redemptionId: {
      type: String,
      rangeKey: true,
      required: true,
    },
    entityId: {
      type: String,
      required: true,
      index: {
        name: "entityTimestampIndex",
        type: "global",
        rangeKey: "timestamp",
      },
    },
    rewardId: {
      type: String,
      required: false,
    },
    ecUsed: {
      type: Number,
      required: true,
    },
    tcUsed: {
      type: Number,
      required: true,
    },
    totalCost: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "COMPLETED", "REVERSED"],
      index: {
        name: "statusIndex",
        type: "global",
        rangeKey: "timestamp",
      },
    },
    metadata: {
      type: Object,
      required: false,
    },
    timestamp: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false,
    saveUnknown: true,
  },
);

export const RedemptionHistory = model(
  "RedemptionHistory",
  redemptionHistorySchema,
);
