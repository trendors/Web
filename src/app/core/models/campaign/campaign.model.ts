
export type CampaignStatus = 'open' | 'invite_only' | 'application'; // adjust to your actual status values

export interface Campaign {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  platforms: string[];         // comes as ["[\"twitter\"]"] — needs parsing
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
}

export interface ApiResponse<T = null> {
    message: string;
    error: boolean;
    data?: T;
}