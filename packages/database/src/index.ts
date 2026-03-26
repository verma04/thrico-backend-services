// PostgreSQL exports
export {
  getDb,
  getDbForUser,
  closeAllConnections,
  testConnection,
  schema,
  type AppDatabase,
} from "./postgres/connection";
export * from "./postgres/schema";

// DynamoDB exports
export { connectDynamo } from "./dynamodb/connection";
export { UserActivity } from "./dynamodb/models/user-activity";
export { AuditLog } from "./dynamodb/models/audit-log";
export { CurrencyTransaction } from "./dynamodb/models/currency-transaction";
export { RedemptionHistory } from "./dynamodb/models/redemption-history";
export { GlobalCurrencyTransaction } from "./dynamodb/models/global-currency-transaction";
export * from "./dynamodb/models/page";
export {
  ADMIN,
  LOGIN_SESSION,
  OTP,
  DOMAIN,
  ENTITY_TYPE,
  ENTITY_INDUSTRY,
  ENTITY_FONT,
  MENTORSHIP_CATEGORY,
  MENTORSHIP_SKILLS,
  CUSTOM_DOMAIN,
  ENTITY_THEME,
} from "./dynamodb/models/admin";

export {
  ENTITY_MEMBER,
  UserRole as EntityMemberRole,
} from "./dynamodb/models/entity-member";

export { USER, USER_OTP, USER_LOGIN_SESSION } from "./dynamodb/models/user";

// Redis exports
export {
  default as redis,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  cacheExists,
  setSession,
  getSession,
  deleteSession,
  closeRedis,
} from "./redis/client";
export * from "./redis/notification";
export * from "./postgres/seed/currency.seed";
