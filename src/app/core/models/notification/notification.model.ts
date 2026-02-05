export interface Notification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  targetId?: number;
  targetType?: string;
}

export interface ApiResponse<T = null> {
  message: string;
  error: boolean;
  data?: T;
}
