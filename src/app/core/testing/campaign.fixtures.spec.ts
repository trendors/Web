import {
  assignmentsForCampaign,
  latestMetricForPost,
  metricsForPost,
  mockAssignments,
  mockBrandUser,
  mockCampaigns,
  mockInfluencerPosts,
  mockInfluencerUsers,
  mockPostMetrics,
  postsEnvelopeForCampaign,
  postsForAssignment,
  rosterEnvelopeFor,
  totalEngagement,
} from './campaign.fixtures';

describe('campaign fixtures', () => {
  it('should link every assignment to a known campaign and influencer', () => {
    const campaignIds = new Set(mockCampaigns.map((c) => c.id));
    const userIds = new Set([mockBrandUser.id, ...mockInfluencerUsers.map((u) => u.id)]);
    for (const assignment of mockAssignments) {
      expect(campaignIds.has(assignment.campaign?.id ?? -1)).toBe(true);
      expect(userIds.has(assignment.influencer?.id ?? -1)).toBe(true);
      expect(assignment.influencerPosts).toBeDefined();
    }
  });

  it('should link every post back to a known assignment', () => {
    const assignmentIds = new Set(mockAssignments.map((a) => a.id));
    for (const post of mockInfluencerPosts) {
      expect(assignmentIds.has(post.campaignInfluencer?.id)).toBe(true);
      expect(post.metrics).toBeDefined();
    }
  });

  it('should keep posts_published in sync with the published posts', () => {
    for (const assignment of mockAssignments) {
      const published = postsForAssignment(assignment.id ?? -1).filter((p) => p.status === 'published');
      expect(published).toHaveLength(assignment.posts_published ?? 0);
    }
  });

  it('should link every metric back to a known post', () => {
    const postIds = new Set(mockInfluencerPosts.map((p) => p.id));
    for (const metric of mockPostMetrics) {
      expect(postIds.has(metric.campaignInfluencerPost?.id)).toBe(true);
    }
  });

  it('should return the latest snapshot for a post with several recordings', () => {
    expect(metricsForPost(301)).toHaveLength(2);
    expect(latestMetricForPost(301)?.id).toBe(402);
    expect(totalEngagement(latestMetricForPost(301)!)).toBe(980 + 74 + 51);
  });

  it('should scope roster and post envelopes to the requested campaign', () => {
    expect(rosterEnvelopeFor(1).data).toHaveLength(5);
    expect(rosterEnvelopeFor(2).data).toHaveLength(1);
    expect(assignmentsForCampaign(1).every((a) => a.campaign?.id === 1)).toBe(true);
    expect(postsEnvelopeForCampaign(1).data.every((p) => p.campaignInfluencer?.campaign?.id === 1)).toBe(
      true,
    );
  });
});
