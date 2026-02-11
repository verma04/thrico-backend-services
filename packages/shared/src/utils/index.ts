import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ENV, ErrorCode } from "../constants";
import { JWTPayload, AuthTokens, ApiError } from "../types";

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access and refresh tokens
 */
export function generateTokens(payload: JWTPayload): AuthTokens {
  // @ts-expect-error - jsonwebtoken types have issues with 'as const' on ENV
  const accessToken = jwt.sign(payload, String(ENV.JWT_SECRET), {
    expiresIn: String(ENV.JWT_EXPIRES_IN),
  });

  // @ts-expect-error - jsonwebtoken types have issues with 'as const' on ENV
  const refreshToken = jwt.sign(
    { userId: payload.userId },
    String(ENV.JWT_REFRESH_SECRET),
    { expiresIn: String(ENV.JWT_REFRESH_EXPIRES_IN) },
  );

  // Calculate expiry in seconds
  const decoded = jwt.decode(accessToken) as any;
  const expiresIn = decoded.exp - decoded.iat;

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode JWT access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw createError(ErrorCode.TOKEN_EXPIRED, "Access token has expired");
    }
    throw createError(ErrorCode.INVALID_TOKEN, "Invalid access token");
  }
}

/**
 * Verify and decode JWT refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } {
  try {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { userId: string };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw createError(ErrorCode.TOKEN_EXPIRED, "Refresh token has expired");
    }
    throw createError(ErrorCode.INVALID_TOKEN, "Invalid refresh token");
  }
}

/**
 * Create a standardized API error
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: any,
): ApiError {
  return {
    code,
    message,
    details,
    ...(ENV.NODE_ENV === "development" && { stack: new Error().stack }),
  };
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Sleep for a specified duration (useful for testing)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, "").trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
}

/**
 * Format error for GraphQL response
 */
export function formatGraphQLError(error: any): ApiError {
  if (error.code) {
    return error as ApiError;
  }

  return createError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    error.message || "An unexpected error occurred",
    ENV.NODE_ENV === "development" ? error : undefined,
  );
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  totalItems: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Extract bearer token from authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
