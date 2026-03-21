export interface Invitation {
  id: number;
  name?: string;
  role: 'Influncer' | 'Digital Marketer' | 'Creative';
  status: 'Pending' | 'Accepted' | 'Declined';
  createdAt: string;
  updatedAt: string;
  user: InvitationUser;
  campaign: { id: number; name: string };
  platforms?: PlatformInfo[];
}

export interface PlatformInfo {
  name: string;
  followers: string; // for e.g the followers count can be in 1.2K
}

export interface InvitationUser {
  id: number;
  name: string;
  status: 'Pending' | 'Accepted' | 'Declined';
  role?: 'Influncer' | 'Digital Marketer' | 'Creative';
  trendor_id?: string;
  influencerProfile?: {
    platforms?: PlatformInfo[];
  };
}
