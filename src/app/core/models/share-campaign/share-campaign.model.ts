/** What a share campaign pays and asks for. */
export interface ShareTerms {
  payPerShare: number;
  pool: number;
  serviceFee: number;
  serviceFeePct: number;
  totalPayable: number;
  maxSharesPerCreator: number;
  hashtag: string | null;
  holdHours: number;
  minFollowers: number;
  funded?: boolean;
  /** What is still unreserved in the pool, once the campaign is funded. */
  remaining?: number | null;
}

export interface ShareTermsInput {
  payPerShare: number;
  pool: number;
  maxSharesPerCreator: number;
  hashtag: string;
  minFollowers: number;
}

export type ShareState = 'started' | 'verified' | 'paid' | 'released' | 'expired';

/** One creator's share, as the creator sees it. */
export interface MyShare {
  id: number;
  state: ShareState;
  pay: number;
  hashtag: string | null;
  holdHours: number;
  expiresAt: string;
  postUrl: string | null;
  holdUntil: string | null;
  reason: string | null;
  attempts: number;
}

export interface MyShares { shares: MyShare[]; maxShares: number; closed: boolean }

export interface SubmitResult { accepted: boolean; reason: string | null; share: MyShare }

/** How a share campaign is going, as the brand sees it. */
export interface ShareOverview {
  payPerShare: number;
  pool: number;
  closed: boolean;
  settled: boolean;
  counts: Record<ShareState, number>;
  paid: number;
  onHold: number;
  remaining: number | null;
  shares: { id: number; creator: string; state: ShareState; postUrl: string | null; pay: number; holdUntil: string | null; paidAt: string | null; reason: string | null }[];
}
