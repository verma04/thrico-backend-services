import dynamoose from '../connection';
import { log } from '@thrico/logging';
import { AuditLog as AuditLogType } from '@thrico/shared';

const { Schema, model } = dynamoose;

// Audit Log Schema
const auditLogSchema = new Schema(
  {
    id: {
      type: String,
      hashKey: true,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: {
        name: 'userIdIndex',
        type: 'global',
      },
    },
    action: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
      index: {
        name: 'timestampIndex',
        type: 'global',
      },
    },
    changes: {
      type: Object,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: false,
    saveUnknown: true,
  }
);

// Create and export model
export const AuditLog = model('AuditLog', auditLogSchema);
