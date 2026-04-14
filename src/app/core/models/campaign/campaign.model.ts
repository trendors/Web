export type CampaignStatus = 'open' | 'invite_only' | 'application'; // adjust to your actual status values

export interface Campaign {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  platforms: string[]; // comes as ["[\"twitter\"]"] — needs parsing
  access: string;
  creator_id: number;
  link: string | null;
  description: string;
  start_date: string | null;
  end_date: string | null;
  auto_generate_captions: boolean;
  hash_tags: string | null;
  package: string | null;
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
