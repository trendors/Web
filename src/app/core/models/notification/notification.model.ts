export interface Notification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  targetId?: number;
  targetType?: string;
  actorId?: number | null;
  /** Related ids plus `link`, the in-app route clicking it opens. */
  data?: {
    campaignId?: number;
    assignmentId?: number;
    offerId?: number;
    postId?: number;
    link?: string;
    [key: string]: unknown;
  } | null;
}

export interface ApiResponse<T = null> {
  message: string;
  error: boolean;
  data?: T;
}
