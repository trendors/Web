/** Shapes returned by the package-campaign API (campaign-plan, collaboration, content). */

export const CAMPAIGN_PLATFORMS = ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'] as const;
/** Platforms a package campaign can ask creators to post on. */
export const PACKAGE_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter'] as const;
export const DELIVERABLE_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'] as const;
export const CONTENT_TYPES = ['reel', 'story', 'post', 'video'] as const;
export const MILESTONE_METRICS = ['views', 'engagement', 'trending'] as const;
export const BONUS_METRICS = ['views', 'engagement', 'verified_posts'] as const;

export type Lifecycle =
  | 'draft' | 'submitted' | 'under_review' | 'awaiting_payment'
  | 'active' | 'closing' | 'completed' | 'cancelled' | 'disputed';

export interface PackageInfo {
  id: number;
  key: string;
  name: string;
  description: string | null;
  min_budget: number | string;
  max_budget: number | string | null;
  min_followers: number | null;
  max_followers: number | null;
  features: string[] | null;
  managed: boolean;
  is_active: boolean;
  sort_order: number;
  /** Per post. null = this package does not price creators and the brand sets budgets by hand. */
  base_fee: number | string | null;
  max_fee: number | string | null;
  milestone_metric: string | null;
  milestone_threshold: number | null;
  milestone_tiers?: { metric: string; threshold: number; share: number }[] | null;
  bonus_delay_hours: number | null;
}

export interface Milestone { id: string; metric: string; threshold: number; amount: number }
export interface BonusRule { metric: string; threshold: number; split: string }
export interface Deliverable { content_type: string; platform: string; quantity: number; rate_per_post: number }

/** What the wizard edits and sends to POST/PATCH /campaign-plan. */
export interface PlanForm {
  name: string;
  product: string;
  description: string;
  objectives: string;
  usage_rights: string;
  platforms: string[];
  niches: string[];
  creator_countries: string[];
  audience_countries: string[];
  follower_min: number | null;
  follower_max: number | null;
  package_key: string;
  creators_count: number | null;
  platform_priority: string[];
  base_fee_budget: number;
  reward_pool_budget: number;
  bonus_pool_budget: number;
  start_date: string;
  end_date: string;
  deliverables: Deliverable[];
  reward_milestones: Milestone[];
  bonus_rule: BonusRule | null;
}

export interface PlanSummary {
  campaignId: number;
  name: string;
  lifecycle: Lifecycle;
  package: { key: string; name: string; managed: boolean } | null;
  creators: number | null;
  platformPriority: string[];
  packageTerms: { baseFee: number; maxFee: number; milestoneMetric: string | null; milestoneThreshold: number | null; tiers?: { metric: string; threshold: number; share: number }[]; bonusDelayHours: number | null; platformsSelected: number } | null;
  product: string | null;
  objectives: string | null;
  usageRights: string | null;
  brief: string | null;
  rewards: { milestones: Milestone[]; campaignBonusRule: BonusRule | null };
  filters: { niches: string[]; platforms: string[]; creatorCountries: string[]; audienceCountries: string[]; followerMin: number | null; followerMax: number | null };
  deliverables: Deliverable[];
  deadlines: { start: string | null; end: string | null };
  revisionPolicy: { includedRounds: number };
  compensation: { baseFee: number; rewardPool: number; campaignBonusPool: number; creatorBudget: number };
  charges: { serviceFeePct: number; serviceFee: number; other: { label: string; amount: number }[] };
  totalPayable: number;
  measurement: { days: number; hours: number | null; startsAt: string };
  verification: Record<string, string>;
  cancellationTermsVersion: string;
  review: { status: string | null; reasons: string[]; note: string | null };
  validation: { errors: string[]; flags: string[] };
  note: string;
}

export type CheckoutResult =
  | { status: 'paid'; alreadyPaid: boolean; total: number }
  | { status: 'payment_required'; total: number; balance: number; amount: number; reference: string; accessCode: string | null; authorizationUrl: string | null; email: string };

export interface Transition { id: number; from_state: string; to_state: string; actor_type: string; reason: string | null; createdAt?: string }

export interface OfferTerms {
  lines: Deliverable[];
  base_fee_total: number;
  reward_allocation: number;
  measurement_days: number | null;
  measurement_hours?: number | null;
  revision_rounds: number | null;
  cancellation_terms_version: string | null;
  usage_rights: string | null;
  due_date: string | null;
  milestones: Milestone[];
  bonus_rule: BonusRule | null;
  brand_review_days: number;
  auto_approval_days: number;
  cure_period_days: number;
  dispute_window_days: number;
  cancel_earned_fee_policy: string;
}

export type CollabState = 'applied' | 'invited' | 'selected' | 'active' | 'completed' | 'declined' | 'not_selected' | 'expired' | 'withdrawn' | 'cancelled';

export interface RosterRow { id: number; state: CollabState; source: string; pitch: string | null; userId: number; name: string; outsideFilters: boolean; offer: OfferTerms | null; offerExpiresAt: string | null }
export interface MyCollab { id: number; state: CollabState; source: string; campaignId: number; campaign: string; offer: OfferTerms | null; offerExpiresAt: string | null; acceptedAt: string | null }

export interface Check { key: string; passed: boolean; detail: string }
export interface Evaluation { eligible: boolean; checks: Check[]; failed: string[]; score: number }
export interface DiscoverRow { campaignId: number; name: string; product: string | null; platforms: string[]; baseFeeBudget: number; endsAt: string | null; evaluation: Evaluation }
export interface Discover { eligible: DiscoverRow[]; ineligible?: DiscoverRow[]; ineligibleCount: number }
/** A connected social account: where, which handle, and how many follow it. */
export interface CreatorAccount { platform: string; handle: string | null; followers: number; verified: boolean }
export interface CreatorMatch { userId: number; name: string; displayName?: string; score: number; checks: Check[]; accounts?: CreatorAccount[] }
export interface Matches { considered: number; total: number; matches: CreatorMatch[]; excludedBy?: Record<string, number>; suggestion?: string }
/** A creator found by name or handle; `eligible` is false when they miss one of the campaign's filters. */
export interface CreatorSearchHit extends CreatorMatch { eligible: boolean; /** Set when the package's follower range rules them out: they cannot be invited. */ packageProblem?: string | null }
export interface CreatorSearch { query: string; results: CreatorSearchHit[] }
export interface CreatorSummary {
  userId: number; name: string; displayName: string; headline: string | null; bio: string | null; location: string | null;
  niches: string[]; audience: { locations: string[]; gender: string | null; ageRange: string | null }; engagementRate: string | null;
  accounts: CreatorAccount[]; totalFollowers: number;
  fit: { score: number; eligible: boolean; checks: Check[] };
  record: { completed: number; active: number; cancelled: number };
  onThisCampaign: { collaborationId: number; state: string } | null;
  /** Set when the package's follower range rules them out: they cannot be invited. */
  packageProblem?: string | null;
}

export type ContentState = 'awaiting_submission' | 'in_review' | 'revision_requested' | 'awaiting_publication' | 'rejected' | 'published' | 'verified' | 'cancelled';
export interface ContentItem {
  id: number; content_type: string; platform: string; unit: number; base_fee: number | string;
  state: ContentState; fee_state: string; revision_count: number; due_at: string | null;
  draft_url: string | null; draft_note: string | null; post_url: string | null;
  approved_at: string | null; verified_at: string | null; window_ends_at: string | null; paid_at: string | null;
}
export interface WorkflowEvent { id: number; from_state: string; to_state: string; actor_type: string; reason: string | null; createdAt?: string }

export interface RewardsView {
  totals: { views: number; engagement: number; trending: number; verifiedPosts: number };
  milestones: (Milestone & { progress: number; current: number; state: string })[];
  /** The newest automatic reading of each post. `automatic` means the platform is read for us, so nobody types numbers in. */
  readings?: { itemId: number; automatic: boolean; latest: { views: number; likes: number; comments: number; shares: number; at: string } | null; inReview: boolean }[];
  windows: { itemId: number; endsAt: string; msLeft: number }[];
  rewards: { id: number; milestone_id: string; amount: number | string; kind: string; state: string }[];
}
export interface Dispute { id: number; content_item_id: number | null; reward_id: number | null; opened_by: string; amount: number | string; reason: string; status: string; to_creator: number | string | null; to_brand: number | string | null; resolution_note: string | null; collaboration_id?: number }

export interface MetricInput { views: number; likes: number; comments: number; shares: number; trending: boolean; evidence_url: string; note?: string }

export interface Need { key: string; kind: 'offer' | 'draft' | 'revision' | 'publish'; collaborationId: number; campaign: string; label: string; dueAt: string | null; overdue: boolean }
/** A creator's home: what needs them now, and what they have earned or are waiting on. */
export interface MyWork {
  needsYou: Need[];
  earnings: { basePaid: number; baseComing: number; bonusPaid: number; bonusWaiting: number; nextBonusCheck: string | null };
}

/** A package campaign at a glance, for its brand. Only verified readings count. */
export interface CampaignPulse {
  reach: { views: number; engagements: number; engagementRate: number | null; viewsLast24h: number; automaticPosts: number; reportedPosts: number; updatedAt: string | null };
  posts: { live: number; promised: number };
  money: { funded: number; paidToCreators: number; reserved: number; bonusPool: number; available: number; returned: number; costPer1000Views: number | null; costPer1000ViewsWithFee?: number | null; costPerEngagement: number | null } | null;
  topPost: { itemId: number; collaborationId: number; creator: string; platform: string; url: string | null; views: number; engagements: number } | null;
  milestones: { reached: number; total: number; next: { creator: string; metric: string; threshold: number; current: number; progress: number; amount: number } | null };
  needsYou: { draftsToReview: number; applicants: number; offersWaiting: number };
}
