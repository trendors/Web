export interface Invitation {
  id: number;
  role: 'Influncer' | 'Digital Marketer' | 'Creative';
  status: 'Pending' | 'Accepted' | 'Declined';
  createdAt: string;
  updatedAt: string;
  user: { id: number; name: string; };
  campaign: { id: number; name: string;};
}