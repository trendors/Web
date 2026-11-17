export type CampaignStatus = 'open' | 'invite_only' | 'application'; // adjust to your actual status values

export type CampaignLifecycle = 'active' | 'paused' | 'closed';
export type CampaignPaymentState = 'not_required' | 'awaiting_payment' | 'paid';

export interface Campaign {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  platforms: string[]; // comes as ["[\"twitter\"]"] — needs parsing
  access: string;
  /** Paused/closed campaigns take no new invites or applications. */
  status?: CampaignLifecycle;
  /** Open campaigns are paid up front; unpaid ones are saved but not live. */
  payment_status?: CampaignPaymentState;
  /** Package campaigns: draft, submitted, under_review, awaiting_payment, active, closing, completed, cancelled. */
  lifecycle?: string;
  budget?: number | string | null;
  paid_at?: string | null;
  creator_id: number;
  link: string | null;
  description: string;
  start_date: string | null;
  end_date: string | null;
  auto_generate_captions: boolean;
  hash_tags: string | null;
  package: string | null;
  /** True when the campaign runs through the package workflow (managed on /home/plan/:id). */
  is_package?: boolean;
  /** True when the campaign pays creators per verified share (managed on /home/share-campaign/:id). */
  is_share?: boolean;
  generate_post: boolean;
  files: string[];
  invitations: any[];
  total_reach?: number; // add in the backend campaign entity
  avg_engagement?: number; // add in the backend campaign entity
}
// view campaign related interfaces
export interface CampaignStats {
  totalCampaigns: number;
  activeNow: number;
  endedCampaigns: number;
  totalReach: number;
  avgEngagement: number;
}

export interface PageStat {
  label: string;
  value: string;
  valueClass: string;
  change: string;
  changeClass: string;
}
 
export type FilterOption = 'all' | CampaignStatus;

// ends view campaign related interfaces
export interface ApiResponse<T = null> {
  message: string;
  error: boolean;
  data?: T;
}
