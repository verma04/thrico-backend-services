import { ErrorCode } from "../constants";
import { JWTPayload, AuthTokens, ApiError } from "../types";
/**
 * Hash a password using bcrypt
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify a password against a hash
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * Generate JWT access and refresh tokens
 */
export declare function generateTokens(payload: JWTPayload): AuthTokens;
/**
 * Verify and decode JWT access token
 */
export declare function verifyAccessToken(token: string): JWTPayload;
/**
 * Verify and decode JWT refresh token
 */
export declare function verifyRefreshToken(token: string): {
    userId: string;
};
/**
 * Create a standardized API error
 */
export declare function createError(code: ErrorCode, message: string, details?: any): ApiError;
/**
 * Generate a unique request ID
 */
export declare function generateRequestId(): string;
/**
 * Sleep for a specified duration (useful for testing)
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Sanitize user input to prevent XSS
 */
export declare function sanitizeInput(input: string): string;
/**
 * Validate email format
 */
export declare function isValidEmail(email: string): boolean;
/**
 * Validate password strength
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 */
export declare function isValidPassword(password: string): boolean;
/**
 * Format error for GraphQL response
 */
export declare function formatGraphQLError(error: any): ApiError;
/**
 * Calculate pagination metadata
 */
export declare function calculatePaginationMeta(totalItems: number, page: number, limit: number): {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
};
/**
 * Extract bearer token from authorization header
 */
export declare function extractBearerToken(authHeader?: string): string | null;
//# sourceMappingURL=index.d.ts.map