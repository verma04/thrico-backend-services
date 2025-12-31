export declare enum DatabaseRegion {
    INDIA = "india",
    US = "us",
    UAE = "uae"
}
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin",
    ENTITY_ADMIN = "entity_admin",
    SUPER_ADMIN = "super_admin"
}
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    PENDING = "pending"
}
export declare enum EntityStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
export declare const REDIS_KEYS: {
    readonly SESSION: "session:";
    readonly USER_CACHE: "user:";
    readonly ENTITY_CACHE: "entity:";
    readonly RATE_LIMIT: "rate_limit:";
    readonly REFRESH_TOKEN: "refresh_token:";
};
export declare enum ErrorCode {
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    UNAUTHORIZED = "UNAUTHORIZED",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    INVALID_TOKEN = "INVALID_TOKEN",
    FORBIDDEN = "FORBIDDEN",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",
    DATABASE_ERROR = "DATABASE_ERROR",
    RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
}
export declare const ENV: {
    readonly NODE_ENV: string;
    readonly JWT_SECRET: string;
    readonly JWT_EXPIRES_IN: string;
    readonly JWT_REFRESH_SECRET: string;
    readonly JWT_REFRESH_EXPIRES_IN: string;
    readonly DEFAULT_DB_REGION: DatabaseRegion;
    readonly REDIS_HOST: string;
    readonly REDIS_PORT: number;
    readonly REDIS_PASSWORD: string | undefined;
    readonly REDIS_DB: number;
    readonly LOG_LEVEL: string;
    readonly LOG_DIR: string;
};
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare const TOKEN_EXPIRY: {
    readonly ACCESS_TOKEN: number;
    readonly REFRESH_TOKEN: number;
    readonly SESSION: number;
};
//# sourceMappingURL=index.d.ts.map