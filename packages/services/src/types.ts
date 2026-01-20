// Common types used across services
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
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
