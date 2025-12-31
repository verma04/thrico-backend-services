"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateTokens = generateTokens;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.createError = createError;
exports.generateRequestId = generateRequestId;
exports.sleep = sleep;
exports.sanitizeInput = sanitizeInput;
exports.isValidEmail = isValidEmail;
exports.isValidPassword = isValidPassword;
exports.formatGraphQLError = formatGraphQLError;
exports.calculatePaginationMeta = calculatePaginationMeta;
exports.extractBearerToken = extractBearerToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const constants_1 = require("../constants");
/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt_1.default.hash(password, saltRounds);
}
/**
 * Verify a password against a hash
 */
async function verifyPassword(password, hash) {
    return bcrypt_1.default.compare(password, hash);
}
/**
 * Generate JWT access and refresh tokens
 */
function generateTokens(payload) {
    // @ts-expect-error - jsonwebtoken types have issues with 'as const' on ENV
    const accessToken = jsonwebtoken_1.default.sign(payload, String(constants_1.ENV.JWT_SECRET), {
        expiresIn: String(constants_1.ENV.JWT_EXPIRES_IN),
    });
    // @ts-expect-error - jsonwebtoken types have issues with 'as const' on ENV
    const refreshToken = jsonwebtoken_1.default.sign({ userId: payload.userId }, String(constants_1.ENV.JWT_REFRESH_SECRET), { expiresIn: String(constants_1.ENV.JWT_REFRESH_EXPIRES_IN) });
    // Calculate expiry in seconds
    const decoded = jsonwebtoken_1.default.decode(accessToken);
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
function verifyAccessToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, constants_1.ENV.JWT_SECRET);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw createError(constants_1.ErrorCode.TOKEN_EXPIRED, "Access token has expired");
        }
        throw createError(constants_1.ErrorCode.INVALID_TOKEN, "Invalid access token");
    }
}
/**
 * Verify and decode JWT refresh token
 */
function verifyRefreshToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, constants_1.ENV.JWT_REFRESH_SECRET);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw createError(constants_1.ErrorCode.TOKEN_EXPIRED, "Refresh token has expired");
        }
        throw createError(constants_1.ErrorCode.INVALID_TOKEN, "Invalid refresh token");
    }
}
/**
 * Create a standardized API error
 */
function createError(code, message, details) {
    return {
        code,
        message,
        details,
        ...(constants_1.ENV.NODE_ENV === "development" && { stack: new Error().stack }),
    };
}
/**
 * Generate a unique request ID
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
/**
 * Sleep for a specified duration (useful for testing)
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Sanitize user input to prevent XSS
 */
function sanitizeInput(input) {
    return input.replace(/[<>]/g, "").trim();
}
/**
 * Validate email format
 */
function isValidEmail(email) {
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
function isValidPassword(password) {
    if (password.length < 8)
        return false;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasUpperCase && hasLowerCase && hasNumber;
}
/**
 * Format error for GraphQL response
 */
function formatGraphQLError(error) {
    if (error.code) {
        return error;
    }
    return createError(constants_1.ErrorCode.INTERNAL_SERVER_ERROR, error.message || "An unexpected error occurred", constants_1.ENV.NODE_ENV === "development" ? error : undefined);
}
/**
 * Calculate pagination metadata
 */
function calculatePaginationMeta(totalItems, page, limit) {
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
function extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.substring(7);
}
//# sourceMappingURL=index.js.map