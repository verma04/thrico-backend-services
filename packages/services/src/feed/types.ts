export interface FeedQueryParams {
  currentUserId: string;
  db: any;
  offset?: number;
  limit?: number;
  entity: string;
}

export interface FeedInput {
  video?: any;
  thumbnail?: any;
  celebration?: {
    image: string | null;
    type: string | null;
  };
  description?: string | null;
  groupId?: string | null;
  hashtags?: string | null;
  media?: any;
  poll?: {
    lastDate: string | null;
    options: Array<{ option: string | null }>;
    question: string | null;
    resultVisibility: string | null;
    title: string | null;
  };
  forum?: {
    category: string;
    content: string;
    title: string;
    isAnonymous: boolean;
  };
  privacy?: string | null;
  source?: string | null;
}
