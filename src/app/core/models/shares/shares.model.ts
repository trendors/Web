export interface Share {
  id: number;
  postId?: number;
  sharers_trendorsId?: string;
  sharers_userId?: string;
  tracking_code?: string;
  deviceId?: string;
  ipAddress?: string;
  rewardAmount: number;
  status: 'completed' | 'flagged' | 'reviewed' | 'rejected' | 'pending' | 'verified';
  paid: boolean;
  createdAt: string | Date;
}