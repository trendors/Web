import { errText, label, naira, timeLeft, tone } from './package-format';

describe('package formatting', () => {
  it('shows naira and tolerates missing values', () => {
    expect(naira(1500)).toBe('₦1,500');
    expect(naira('2500.5')).toBe('₦2,500.5');
    expect(naira(null)).toBe('₦0');
  });

  it('names states plainly and falls back to the raw text', () => {
    expect(label('awaiting_payment')).toBe('Awaiting payment');
    expect(label('published')).toContain('awaiting verification');
    expect(label('some_new_state')).toBe('some new state');
  });

  it('colours problems red, waiting amber and done green', () => {
    expect(tone('cancelled')).toBe('red');
    expect(tone('in_review')).toBe('amber');
    expect(tone('verified')).toBe('green');
  });

  it('counts down to a close, and says closed after it', () => {
    expect(timeLeft(new Date(Date.now() + 2 * 86_400_000 + 3_600_000).toISOString())).toMatch(/^2d/);
    expect(timeLeft(new Date(Date.now() - 1000).toISOString())).toBe('closed');
    expect(timeLeft(null)).toBe('');
  });

  it('shows every validation error the server listed, else its message', () => {
    expect(errText({ error: { errors: ['Give the campaign a name.', 'Choose a package.'] } })).toBe('Give the campaign a name. Choose a package.');
    expect(errText({ error: { message: ['a', 'b'] } })).toBe('a, b');
    expect(errText({})).toMatch(/try again/i);
  });
});

describe('platformName and compact', () => {
  it('calls twitter X and names the others as people know them', async () => {
    const { platformName } = await import('./package-format');
    expect(platformName('twitter')).toBe('X');
    expect(platformName('tiktok')).toBe('TikTok');
    expect(platformName('youtube')).toBe('YouTube');
    expect(platformName('snapchat')).toBe('Snapchat');
    expect(platformName(null)).toBe('');
  });

  it('reads platform lists in either stored shape', async () => {
    const { platformsText } = await import('./package-format');
    expect(platformsText(['["twitter"]'])).toBe('X');
    expect(platformsText(['twitter', 'instagram'])).toBe('X, Instagram');
    expect(platformsText(['["twitter","tiktok"]', 'twitter'])).toBe('X, TikTok');
    expect(platformsText(null)).toBe('');
  });

  it('shortens follower counts', async () => {
    const { compact } = await import('./package-format');
    expect(compact(980)).toBe('980');
    expect(compact(1250)).toBe('1.3k');
    expect(compact(15400)).toBe('15k');
    expect(compact(1_200_000)).toBe('1.2M');
    expect(compact(null)).toBe('0');
  });
});

describe('nairaShort', () => {
  it('keeps tile amounts short', async () => {
    const { nairaShort } = await import('./package-format');
    expect(nairaShort(1500)).toBe('₦1,500');
    expect(nairaShort(2142.86)).toBe('₦2,143');
    expect(nairaShort(99999)).toBe('₦99,999');
    expect(nairaShort(272727.26)).toBe('₦272.7k');
    expect(nairaShort(1_250_000)).toBe('₦1.3M');
    expect(nairaShort(null)).toBe('₦0');
  });
});

describe('postsText, hoursText and termsLine', () => {
  it('describes what to post and where', async () => {
    const { postsText } = await import('./package-format');
    expect(postsText([{ content_type: 'post', platform: 'instagram', quantity: 1 }])).toBe('1 post on Instagram');
    expect(postsText([{ content_type: 'post', platform: 'instagram', quantity: 1 }, { content_type: 'story', platform: 'instagram', quantity: 2 }])).toBe('1 post and 2 stories on Instagram');
    expect(postsText([{ content_type: 'post', platform: 'x', quantity: 1 }, { content_type: 'post', platform: 'tiktok', quantity: 1 }])).toBe('2 posts on X and TikTok');
    expect(postsText([])).toBe('');
  });

  it('says a window in days or hours', async () => {
    const { hoursText } = await import('./package-format');
    expect(hoursText(72)).toBe('3 days');
    expect(hoursText(24)).toBe('1 day');
    expect(hoursText(6)).toBe('6 hours');
    expect(hoursText(null)).toBe('');
  });

  it('puts the offer on one line, leaving out rewards when there are none', async () => {
    const { termsLine } = await import('./package-format');
    const posts = [{ content_type: 'post', platform: 'x', quantity: 1 }];
    expect(termsLine({ baseFee: 3000, posts, rewardTotal: 3000 })).toBe('₦3,000 for 1 post on X · up to ₦3,000 more in rewards');
    expect(termsLine({ baseFee: 3000, posts, rewardTotal: 0 })).toBe('₦3,000 for 1 post on X');
  });
});

describe('requirementsOf', () => {
  const reqs = (over: Record<string, unknown> = {}) => ({ niches: [], creatorCountries: [], audienceCountries: [], followerMin: null, followerMax: null, platforms: ['twitter'], ...over });
  const checks = (...cs: [string, boolean][]) => ({ checks: cs.map(([key, passed]) => ({ key, passed })) });

  it('says the follower range on the platform, and whether the viewer meets it', async () => {
    const { requirementsOf } = await import('./package-format');
    expect(requirementsOf({ requirements: reqs({ followerMin: 200, followerMax: 1000 }), evaluation: checks(['followers', false]) }))
      .toEqual([{ key: 'followers', text: '200–1,000 followers on X', met: false }]);
    expect(requirementsOf({ requirements: reqs({ followerMin: 25000 }), evaluation: checks(['followers', true]) })[0].text).toBe('25,000+ followers on X');
    expect(requirementsOf({ requirements: reqs({ followerMax: 5000, platforms: ['instagram', 'tiktok'] }) })[0]).toEqual({ key: 'followers', text: 'Up to 5,000 followers on Instagram or TikTok', met: null });
  });

  it('asks for an account on the platform when there is no follower range', async () => {
    const { requirementsOf } = await import('./package-format');
    expect(requirementsOf({ requirements: reqs(), evaluation: checks(['platform', true]) })).toEqual([{ key: 'platform', text: 'An account on X', met: true }]);
  });

  it('lists niches and places', async () => {
    const { requirementsOf } = await import('./package-format');
    const items = requirementsOf({
      requirements: reqs({ niches: ['Fashion', 'Gaming', 'Parenting'], creatorCountries: ['Nigeria'], audienceCountries: ['Nigeria', 'Ghana'] }),
      evaluation: checks(['platform', true], ['niche', true], ['creator_location', false], ['audience_location', true]),
    });
    expect(items.map((i) => [i.text, i.met])).toEqual([
      ['An account on X', true], ['Fashion, Gaming or Parenting', true], ['Based in Nigeria', false], ['Audience in Nigeria or Ghana', true],
    ]);
  });

  it('is empty when the campaign sends no requirements', async () => {
    const { requirementsOf } = await import('./package-format');
    expect(requirementsOf({})).toEqual([]);
  });
});
