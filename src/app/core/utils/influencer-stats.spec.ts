import {
  extractEngagementRate,
  extractFollowers,
  extractNiche,
  formatCompactNumber,
} from './influencer-stats';

describe('extractFollowers', () => {
  it('should read flat and media-data follower counts, taking the max', () => {
    expect(extractFollowers({ followers_count: 24500 })).toBe(24500);
    expect(
      extractFollowers({ users_media_data: [{ followers_count: 1000 }, { followers: '24.5K' }] }),
    ).toBe(24500);
    expect(extractFollowers({ influncerProfile: { followers: 5000 } })).toBe(5000);
  });

  it('should return null when no usable count exists', () => {
    expect(extractFollowers(null)).toBeNull();
    expect(extractFollowers({})).toBeNull();
    expect(extractFollowers({ brandProfile: {} })).toBeNull();
  });
});

describe('extractEngagementRate', () => {
  it('should normalize engagement to a percent string', () => {
    expect(extractEngagementRate({ influncerProfile: { averageEngagementRate: '3.8' } })).toBe('3.8%');
    expect(extractEngagementRate({ influncerProfile: { averageEngagementRate: '3.8%' } })).toBe('3.8%');
    expect(extractEngagementRate({ influncerProfile: { averageEngagementRate: 4.25 } })).toBe('4.3%');
    expect(extractEngagementRate({})).toBe('');
  });
});

describe('extractNiche', () => {
  it('should prefer content niches, then headline', () => {
    expect(
      extractNiche({ influncerProfile: { contentNiches: ['Fashion', 'Beauty'] } }),
    ).toBe('Fashion');
    expect(extractNiche({ influncerProfile: { professionalHeadline: 'Food creator' } })).toBe(
      'Food creator',
    );
    expect(extractNiche({})).toBe('');
  });
});

describe('formatCompactNumber', () => {
  it('should compact large numbers', () => {
    expect(formatCompactNumber(24500)).toBe('24.5K');
    expect(formatCompactNumber(1200000)).toBe('1.2M');
    expect(formatCompactNumber(890)).toBe('890');
  });
});
