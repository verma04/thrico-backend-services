import dynamoose from '../connection';
import { log } from '@thrico/logging';
import { UserActivity as UserActivityType } from '@thrico/shared';

const { Schema, model } = dynamoose;

// User Activity Schema
const userActivitySchema = new Schema(
  {
    userId: {
      type: String,
      hashKey: true,
      required: true,
    },
    activityId: {
      type: String,
      rangeKey: true,
      required: true,
    },
    activityType: {
      type: String,
      required: true,
      index: {
        name: 'activityTypeIndex',
        type: 'global',
      },
    },
    timestamp: {
      type: Number,
      required: true,
      index: {
        name: 'timestampIndex',
        type: 'global',
      },
    },
    metadata: {
      type: Object,
      required: false,
    },
    region: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
    saveUnknown: true,
  }
);

// Create and export model
export const UserActivity = model('UserActivity', userActivitySchema);
