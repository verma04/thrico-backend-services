import dynamoose from "../connection";

const { Schema, model } = dynamoose;

// Currency Transaction Schema — logs all wallet movements
// Partition: userId, Sort: transactionId (ULID for time-ordering)
const currencyTransactionSchema = new Schema(
  {
    userId: {
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
      enum: [
        "POINTS_TO_EC",
        "EC_TO_TC",
        "EC_CREDIT",
        "EC_DEBIT",
        "TC_CREDIT",
        "TC_DEBIT",
      ],
      index: {
        name: "typeIndex",
        type: "global",
        rangeKey: "timestamp",
      },
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

export const CurrencyTransaction = model(
  "CurrencyTransaction",
  currencyTransactionSchema,
);
