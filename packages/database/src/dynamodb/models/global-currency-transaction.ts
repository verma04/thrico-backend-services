import dynamoose from "../connection";

const { Schema, model } = dynamoose;

// Global Currency Transaction Schema — logs TC Coin wallet movements
// Partition: thricoId, Sort: transactionId (ULID for time-ordering)
const globalCurrencyTransactionSchema = new Schema(
  {
    thricoId: {
      type: String,
      hashKey: true,
      required: true,
    },
    transactionId: {
      type: String,
      rangeKey: true,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["EC_TO_TC", "TC_CREDIT", "TC_DEBIT"],
      index: {
        name: "typeIndex",
        type: "global",
        rangeKey: "timestamp",
      },
    },
    // entityId is optional for global transactions, but good for context if available
    entityId: {
      type: String,
      required: false,
      index: {
        name: "entityTimestampIndex",
        type: "global",
        rangeKey: "timestamp",
      },
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Object,
      required: false,
    },
    timestamp: {
      type: Number,
      required: true,
      index: {
        name: "timestampIndex",
        type: "global",
      },
    },
  },
  {
    timestamps: false,
    saveUnknown: true,
  },
);

export const GlobalCurrencyTransaction = model(
  "GlobalCurrencyTransaction",
  globalCurrencyTransactionSchema,
);
