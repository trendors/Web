/**
 * Shared test fixtures for campaign-related specs.
 *
 * The graph is relationally consistent:
 *   User (influencer) ─┐
 *                      ├─► CampaignInfluencer (assignment) ──► CampaignInfluencerPost ──► PostMetrics
 *   Campaign ──────────┘
 *
 * Conventions mirrored from the backend:
 * - `platforms` entries may be JSON-stringified arrays (`'["instagram"]'`) or plain strings.
 * - `files` entries may be absolute URLs, relative paths, or JSON-wrapped strings.
 * - API envelopes look like `{ message, error: false, data: { list } }` for lists and
 *   `{ message, error: false, data: [...] }` for the campaign-influencer roster.
 */
import type { Campaign } from '../models/campaign/campaign.model';
import type { CampaignInfluencer } from '../api/model/campaignInfluencer';
import type { CampaignInfluencerPost } from '../api/model/campaignInfluencerPost';
import type { PostMetrics } from '../api/model/postMetrics';
import type { User } from '../api/model/user';

/* ------------------------------------------------------------------ users */

export const mockBrandUser: User = {
  id: 1,
  user_name: 'trendors.brand',
  email: 'brand@example.com',
};

export const mockInfluencerAda: User = {
  id: 101,
  user_name: 'ada.okafor',
  email: 'ada@example.com',
  instagram_handle: 'ada.okafor',
  twitter_image: 'https://cdn.example.com/avatars/ada.jpg',
  creativeProfile: { first_name: 'Ada', last_name: 'Okafor' },
};

export const mockInfluencerChidi: User = {
  id: 102,
  user_name: 'chidi.u',
  email: 'chidi@example.com',
  twitter_handle: 'chidi_u',
  // Relative avatar path on purpose: components must resolve it against the API base URL.
  users_media_data: ['uploads/avatars/chidi.png'],
  creativeProfile: { first_name: 'Chidi', last_name: 'Umeh' },
};

export const mockInfluencerFatima: User = {
  id: 103,
  user_name: 'fatima.b',
  email: 'fatima@example.com',
  instagram_handle: 'fatima.bello',
  twitter_image: 'https://cdn.example.com/avatars/fatima.jpg',
  creativeProfile: { first_name: 'Fatima', last_name: 'Bello' },
};

export const mockInfluencerEmeka: User = {
  id: 104,
  user_name: 'emeka.n',
  email: 'emeka@example.com',
  facebook_username: 'emeka.nwosu',
  creativeProfile: { first_name: 'Emeka', last_name: 'Nwosu' },
};

export const mockInfluencerZainab: User = {
  id: 105,
  user_name: 'zainab.y',
  email: 'zainab@example.com',
};

export const mockInfluencerUsers: User[] = [
  mockInfluencerAda,
  mockInfluencerChidi,
  mockInfluencerFatima,
  mockInfluencerEmeka,
  mockInfluencerZainab,
];

/* -------------------------------------------------------------- campaigns */

export const mockCampaignOpen: Campaign = {
  id: 1,
  createdAt: '2026-02-10T09:00:00.000Z',
  updatedAt: '2026-02-12T09:00:00.000Z',
  deletedAt: null,
  name: 'GlowSkin Skincare Launch',
  platforms: ['["instagram","tiktok"]'],
  access: 'open',
  creator_id: 1,
  link: 'https://example.com/glowskin',
  description: 'Launch push for the new GlowSkin vitamin-C serum.',
  start_date: '2026-03-01',
  end_date: '2026-04-30',
  auto_generate_captions: true,
  hash_tags: '#GlowSkin #Skincare',
  package: 'paid',
  generate_post: false,
  files: ['uploads/campaigns/glowskin-hero.jpg', 'https://cdn.example.com/glowskin-video.mp4'],
  invitations: [],
};

export const mockCampaignInviteOnly: Campaign = {
  id: 2,
  createdAt: '2026-01-20T09:00:00.000Z',
  updatedAt: '2026-01-22T09:00:00.000Z',
  deletedAt: null,
  name: 'Lagos Food Fest',
  platforms: ['["youtube"]'],
  access: 'invite_only',
  creator_id: 1,
  link: null,
  description: 'One-creator escrow deal for the food fest aftermovie.',
  start_date: '2026-05-01',
  end_date: '2026-05-31',
  auto_generate_captions: false,
  hash_tags: '#LagosFoodFest',
  package: 'paid',
  generate_post: false,
  // No files on purpose: components must fall back to a placeholder image.
  files: [],
  invitations: [],
};

export const mockCampaignApplication: Campaign = {
  id: 3,
  createdAt: '2026-02-01T09:00:00.000Z',
  updatedAt: '2026-02-02T09:00:00.000Z',
  deletedAt: null,
  name: 'Campus Reps Q3',
  platforms: ['twitter'],
  access: 'application',
  creator_id: 1,
  link: 'https://example.com/campus-reps',
  description: 'Vetted student creators, one slot per tier.',
  start_date: null,
  end_date: null,
  auto_generate_captions: false,
  hash_tags: null,
  package: 'free',
  generate_post: true,
  // JSON-wrapped entry on purpose: components must unwrap it.
  files: ['["uploads/campus/banner.png"]'],
  invitations: [],
};

export const mockCampaigns: Campaign[] = [
  mockCampaignOpen,
  mockCampaignInviteOnly,
  mockCampaignApplication,
];

/* ------------------------------------------------------------ assignments */

function assignment(
  id: number,
  campaign: Campaign,
  influencer: User,
  rest: Partial<CampaignInfluencer>,
): CampaignInfluencer {
  // The app-level Campaign widens some API fields (e.g. `link: string | null`),
  // so narrow it back to the generated API shape for the relation.
  return {
    id,
    campaign: campaign as unknown as CampaignInfluencer['campaign'],
    influencer,
    influencerPosts: [],
    ...rest,
  };
}

export const mockAssignmentActive: CampaignInfluencer = assignment(
  201,
  mockCampaignOpen,
  mockInfluencerAda,
  {
    status: 'active',
    posts_agreed: 3,
    posts_published: 2,
    fee_agreed: 120000,
    amount_paid: 40000,
    payment_status: 'partial',
    contract_signed_at: '2026-02-15T10:00:00.000Z',
  },
);

export const mockAssignmentContracted: CampaignInfluencer = assignment(
  202,
  mockCampaignOpen,
  mockInfluencerChidi,
  {
    status: 'contracted',
    posts_agreed: 2,
    posts_published: 0,
    fee_agreed: 80000,
    amount_paid: 0,
    payment_status: 'pending',
    contract_signed_at: '2026-02-18T10:00:00.000Z',
  },
);

export const mockAssignmentCompleted: CampaignInfluencer = assignment(
  203,
  mockCampaignOpen,
  mockInfluencerFatima,
  {
    status: 'completed',
    posts_agreed: 2,
    posts_published: 2,
    fee_agreed: 90000,
    amount_paid: 90000,
    payment_status: 'paid',
    contract_signed_at: '2026-02-11T10:00:00.000Z',
  },
);

export const mockAssignmentCancelled: CampaignInfluencer = assignment(
  204,
  mockCampaignOpen,
  mockInfluencerEmeka,
  {
    status: 'cancelled',
    posts_agreed: 1,
    posts_published: 0,
    fee_agreed: 30000,
    amount_paid: 0,
    payment_status: 'pending',
  },
);

export const mockAssignmentInvited: CampaignInfluencer = assignment(
  205,
  mockCampaignOpen,
  mockInfluencerZainab,
  {
    status: 'invited',
    posts_agreed: 1,
    posts_published: 0,
    fee_agreed: 18000,
    amount_paid: 0,
    payment_status: 'pending',
  },
);

export const mockAssignmentOtherCampaign: CampaignInfluencer = assignment(
  206,
  mockCampaignInviteOnly,
  mockInfluencerAda,
  {
    status: 'invited',
    posts_agreed: 1,
    posts_published: 0,
    fee_agreed: 200000,
    amount_paid: 0,
    payment_status: 'pending',
  },
);

export const mockAssignments: CampaignInfluencer[] = [
  mockAssignmentActive,
  mockAssignmentContracted,
  mockAssignmentCompleted,
  mockAssignmentCancelled,
  mockAssignmentInvited,
  mockAssignmentOtherCampaign,
];

/* ----------------------------------------------------------------- posts */

function influencerPost(
  id: number,
  campaignInfluencer: CampaignInfluencer,
  rest: Partial<CampaignInfluencerPost>,
): CampaignInfluencerPost {
  const post: CampaignInfluencerPost = { id, campaignInfluencer, metrics: [], ...rest };
  campaignInfluencer.influencerPosts!.push(post);
  return post;
}

export const mockPostMorningRoutine: CampaignInfluencerPost = influencerPost(
  301,
  mockAssignmentActive,
  {
    title: 'Morning routine with GlowSkin',
    content_type: 'reel',
    platform: 'instagram',
    post_url: 'https://instagram.com/p/glowskin-morning',
    published_at: '2026-03-05T08:00:00.000Z',
    status: 'published',
    payout_amount: 40000,
    payment_status: 'paid',
    paid_at: '2026-03-10T08:00:00.000Z',
    thumbnail_url: 'https://cdn.example.com/thumbs/morning-routine.jpg',
  },
);

export const mockPostNightRoutine: CampaignInfluencerPost = influencerPost(
  302,
  mockAssignmentActive,
  {
    title: 'Night routine story',
    content_type: 'story',
    platform: 'instagram',
    post_url: 'https://instagram.com/stories/glowskin-night',
    published_at: '2026-03-08T20:00:00.000Z',
    status: 'published',
    payout_amount: 40000,
    payment_status: 'pending',
    thumbnail_url: 'uploads/thumbs/night-routine.jpg',
  },
);

export const mockPostDanceChallenge: CampaignInfluencerPost = influencerPost(
  303,
  mockAssignmentActive,
  {
    title: 'Glow dance challenge',
    content_type: 'video',
    platform: 'tiktok',
    status: 'approved',
    payout_amount: 40000,
    payment_status: 'pending',
  },
);

export const mockPostAftermovie: CampaignInfluencerPost = influencerPost(
  304,
  mockAssignmentCompleted,
  {
    title: 'Fest aftermovie',
    content_type: 'video',
    platform: 'youtube',
    post_url: 'https://youtube.com/watch?v=foodfest',
    published_at: '2026-03-02T12:00:00.000Z',
    status: 'published',
    payout_amount: 50000,
    payment_status: 'paid',
    paid_at: '2026-03-09T12:00:00.000Z',
  },
);

export const mockPostGetReady: CampaignInfluencerPost = influencerPost(
  305,
  mockAssignmentCompleted,
  {
    title: 'Get ready with me',
    content_type: 'reel',
    platform: 'instagram',
    post_url: 'https://instagram.com/p/grwm-fest',
    published_at: '2026-03-03T12:00:00.000Z',
    status: 'published',
    payout_amount: 40000,
    payment_status: 'paid',
    paid_at: '2026-03-09T12:00:00.000Z',
  },
);

export const mockPostDraftReview: CampaignInfluencerPost = influencerPost(
  306,
  mockAssignmentContracted,
  {
    title: 'Draft review',
    content_type: 'post',
    platform: 'instagram',
    status: 'pending',
    payout_amount: 40000,
    payment_status: 'pending',
  },
);

export const mockPostInvitePitch: CampaignInfluencerPost = influencerPost(
  307,
  mockAssignmentInvited,
  {
    title: 'Invite pitch',
    content_type: 'story',
    platform: 'tiktok',
    status: 'submitted',
    payout_amount: 18000,
    payment_status: 'pending',
  },
);

export const mockInfluencerPosts: CampaignInfluencerPost[] = [
  mockPostMorningRoutine,
  mockPostNightRoutine,
  mockPostDanceChallenge,
  mockPostAftermovie,
  mockPostGetReady,
  mockPostDraftReview,
  mockPostInvitePitch,
];

/* --------------------------------------------------------------- metrics */

function postMetric(
  id: number,
  campaignInfluencerPost: CampaignInfluencerPost,
  rest: Partial<PostMetrics>,
): PostMetrics {
  const metric: PostMetrics = { id, campaignInfluencerPost, ...rest };
  campaignInfluencerPost.metrics!.push(metric);
  return metric;
}

export const mockMetricMorningOld: PostMetrics = postMetric(401, mockPostMorningRoutine, {
  views: 8000,
  likes: 640,
  comments: 48,
  shares: 30,
  recorded_at: '2026-03-06T08:00:00.000Z',
});

export const mockMetricMorningLatest: PostMetrics = postMetric(402, mockPostMorningRoutine, {
  views: 12500,
  likes: 980,
  comments: 74,
  shares: 51,
  recorded_at: '2026-03-07T08:00:00.000Z',
});

export const mockMetricNight: PostMetrics = postMetric(403, mockPostNightRoutine, {
  views: 5200,
  likes: 410,
  comments: 22,
  shares: 12,
  recorded_at: '2026-03-09T08:00:00.000Z',
});

export const mockMetricAftermovie: PostMetrics = postMetric(404, mockPostAftermovie, {
  views: 48000,
  likes: 3200,
  comments: 410,
  shares: 620,
  recorded_at: '2026-03-08T08:00:00.000Z',
});

export const mockMetricGetReady: PostMetrics = postMetric(405, mockPostGetReady, {
  views: 21000,
  likes: 1750,
  comments: 190,
  shares: 140,
  recorded_at: '2026-03-08T08:00:00.000Z',
});

export const mockPostMetrics: PostMetrics[] = [
  mockMetricMorningOld,
  mockMetricMorningLatest,
  mockMetricNight,
  mockMetricAftermovie,
  mockMetricGetReady,
];

/* ----------------------------------------------------------- query helpers */

export function assignmentsForCampaign(campaignId: number): CampaignInfluencer[] {
  return mockAssignments.filter((a) => a.campaign?.id === campaignId);
}

export function postsForAssignment(assignmentId: number): CampaignInfluencerPost[] {
  return mockInfluencerPosts.filter((p) => p.campaignInfluencer?.id === assignmentId);
}

export function postsForCampaign(campaignId: number): CampaignInfluencerPost[] {
  const ids = new Set(assignmentsForCampaign(campaignId).map((a) => a.id));
  return mockInfluencerPosts.filter((p) => ids.has(p.campaignInfluencer?.id));
}

export function metricsForPost(postId: number): PostMetrics[] {
  return mockPostMetrics.filter((m) => m.campaignInfluencerPost?.id === postId);
}

export function latestMetricForPost(postId: number): PostMetrics | undefined {
  return metricsForPost(postId).sort((a, b) =>
    String(a.recorded_at ?? '').localeCompare(String(b.recorded_at ?? '')),
  ).at(-1);
}

export function totalEngagement(metric: PostMetrics): number {
  return Number(metric.likes ?? 0) + Number(metric.comments ?? 0) + Number(metric.shares ?? 0);
}

/* -------------------------------------------------------- response envelopes */

export function campaignListEnvelope() {
  return { message: 'Campaigns fetched', error: false, data: { list: mockCampaigns } };
}

export function rosterEnvelopeFor(campaignId: number) {
  return {
    message: 'Roster fetched',
    error: false,
    data: assignmentsForCampaign(campaignId),
  };
}

export function postsEnvelopeForCampaign(campaignId: number) {
  return {
    message: 'Posts fetched',
    error: false,
    data: postsForCampaign(campaignId),
  };
}
