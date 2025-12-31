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
