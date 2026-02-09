// Common types used across services
export interface PaginationParams {
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number | null;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ServiceContext {
  db: any;
  userId: string;
  entityId: string;
}
