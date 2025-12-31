"use strict";
// Database Regions
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_EXPIRY = exports.PAGINATION = exports.ENV = exports.ErrorCode = exports.REDIS_KEYS = exports.EntityStatus = exports.UserStatus = exports.UserRole = exports.DatabaseRegion = void 0;
var DatabaseRegion;
(function (DatabaseRegion) {
    DatabaseRegion["INDIA"] = "india";
    DatabaseRegion["US"] = "us";
    DatabaseRegion["UAE"] = "uae";
})(DatabaseRegion || (exports.DatabaseRegion = DatabaseRegion = {}));
// User Roles
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["ADMIN"] = "admin";
    UserRole["ENTITY_ADMIN"] = "entity_admin";
    UserRole["SUPER_ADMIN"] = "super_admin";
})(UserRole || (exports.UserRole = UserRole = {}));
// User Status
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["PENDING"] = "pending";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
// Entity Status
var EntityStatus;
(function (EntityStatus) {
    EntityStatus["ACTIVE"] = "active";
    EntityStatus["INACTIVE"] = "inactive";
    EntityStatus["SUSPENDED"] = "suspended";
})(EntityStatus || (exports.EntityStatus = EntityStatus = {}));
// Redis Key Prefixes
exports.REDIS_KEYS = {
    SESSION: 'session:',
    USER_CACHE: 'user:',
    ENTITY_CACHE: 'entity:',
    RATE_LIMIT: 'rate_limit:',
    REFRESH_TOKEN: 'refresh_token:',
};
// Error Codes
var ErrorCode;
(function (ErrorCode) {
    // Authentication Errors
    ErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    // Authorization Errors
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    // Validation Errors
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["REQUIRED_FIELD_MISSING"] = "REQUIRED_FIELD_MISSING";
    // Database Errors
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["RECORD_NOT_FOUND"] = "RECORD_NOT_FOUND";
    ErrorCode["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
    // General Errors
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
console.log(process.env);
// Environment Variables
exports.ENV = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-me',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    // Database Regions
    DEFAULT_DB_REGION: process.env.DEFAULT_DB_REGION || DatabaseRegion.IND,
    // Redis
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_DIR: process.env.LOG_DIR || './logs',
};
// Pagination
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
// Token Expiry (in seconds)
exports.TOKEN_EXPIRY = {
    ACCESS_TOKEN: 7 * 24 * 60 * 60, // 7 days
    REFRESH_TOKEN: 30 * 24 * 60 * 60, // 30 days
    SESSION: 24 * 60 * 60, // 24 hours
};
//# sourceMappingURL=index.js.map