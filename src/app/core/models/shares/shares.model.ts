export enum SocialMedia {
  X = 'x',
  WHATSAPP = 'whatsapp',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  TELEGRAM = 'telegram'
}


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
  external_post_url?: string;
  social_media?: SocialMedia
}

export interface CreateShare {
  postId?: number;
  sharers_trendorsId?: string;
  sharers_userId?: string;
  deviceId?: string;
  ipAddress?: string;
  external_post_url?: string;
  social_media?: SocialMedia

}