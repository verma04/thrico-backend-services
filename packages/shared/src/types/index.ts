import { DatabaseRegion, UserRole, UserStatus, EntityStatus } from '../constants';

// Base Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  region: DatabaseRegion;
  entityId?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  lastLoginAt?: Date;
}

// Entity Types
export interface Entity extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  status: EntityStatus;
  region: DatabaseRegion;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Session Types
export interface Session {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  region: DatabaseRegion;
  entityId?: string;
  iat?: number;
  exp?: number;
}

// Request Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  region?: DatabaseRegion;
  phoneNumber?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// GraphQL Context Types
export interface GraphQLContext {
  user?: UserProfile;
  region: DatabaseRegion;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}

// Pagination Types
export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// gRPC Types
export interface GrpcUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  region: string;
}

export interface GrpcEntity {
  id: string;
  name: string;
  slug: string;
  status: string;
  region: string;
}

export interface GrpcResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// DynamoDB Types
export interface UserActivity {
  userId: string;
  activityId: string;
  activityType: string;
  timestamp: number;
  metadata?: Record<string, any>;
  region: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: number;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
