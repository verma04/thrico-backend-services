// Database Regions

export enum DatabaseRegion {
  IND = "IND",
  US = "US",
  UAE = "UAE",
}

// User Roles
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  ENTITY_ADMIN = "entity_admin",
  SUPER_ADMIN = "super_admin",
}

// User Status
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending",
}

// Entity Status
export enum EntityStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

// Redis Key Prefixes
export const REDIS_KEYS = {
  SESSION: "session:",
  USER_CACHE: "user:",
  ENTITY_CACHE: "entity:",
  RATE_LIMIT: "rate_limit:",
  REFRESH_TOKEN: "refresh_token:",
} as const;

// Error Codes
export enum ErrorCode {
  // Authentication Errors
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  UNAUTHORIZED = "UNAUTHORIZED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",

  // Authorization Errors
  FORBIDDEN = "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // Validation Errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",

  // Database Errors
  DATABASE_ERROR = "DATABASE_ERROR",
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",

  // General Errors
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

console.log(process.env);
// Environment Variables
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "default-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || "default-refresh-secret-change-me",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  // Database Regions
  DEFAULT_DB_REGION:
    (process.env.DEFAULT_DB_REGION as DatabaseRegion) || DatabaseRegion.IND,

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseInt(process.env.REDIS_DB || "0", 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_DIR: process.env.LOG_DIR || "./logs",
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Token Expiry (in seconds)
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 7 * 24 * 60 * 60, // 7 days
  REFRESH_TOKEN: 30 * 24 * 60 * 60, // 30 days
  SESSION: 24 * 60 * 60, // 24 hours
} as const;
